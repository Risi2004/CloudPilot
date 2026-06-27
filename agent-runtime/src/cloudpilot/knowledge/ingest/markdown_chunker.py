"""Heading-aware markdown chunking for documentation RAG."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from cloudpilot.knowledge.models import DocumentChunk, document_id_from_file_key
from cloudpilot.knowledge.text_utils import sanitize_text_for_embedding

HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
FENCE_PATTERN = re.compile(r"^```", re.MULTILINE)


@dataclass
class _Section:
    heading_path: list[str]
    body: str


def derive_platform_category(relative_path: str) -> tuple[str, str]:
    """
    Derive platform and category from a knowledge-base relative path.

    Examples:
        render/deploy.md -> platform=render, category=general
        render/environment/variables.md -> platform=render, category=environment
    """
    parts = [part for part in relative_path.replace("\\", "/").split("/") if part]
    if not parts:
        return "unknown", "general"

    platform = parts[0].lower()
    if len(parts) >= 3:
        category = parts[1].lower().replace(" ", "-")
    elif len(parts) == 2:
        stem = parts[1].rsplit(".", 1)[0]
        category = stem.lower().replace(" ", "-") if stem != parts[0] else "general"
    else:
        category = "general"
    return platform, category


class MarkdownChunker:
    """Split markdown into semantically meaningful chunks with metadata."""

    def __init__(self, *, chunk_size: int = 1200, chunk_overlap: int = 200) -> None:
        self.chunk_size = max(200, chunk_size)
        self.chunk_overlap = max(0, min(chunk_overlap, chunk_size // 2))

    def chunk_document(
        self,
        *,
        file_key: str,
        relative_path: str,
        content: str,
        platform: str | None = None,
        category: str | None = None,
        content_hash: str,
        document_version: str | None = None,
    ) -> list[DocumentChunk]:
        """Chunk one markdown document."""
        content = sanitize_text_for_embedding(content)
        resolved_platform = platform or derive_platform_category(relative_path)[0]
        resolved_category = category or derive_platform_category(relative_path)[1]
        document_id = document_id_from_file_key(file_key)
        sections = self._split_by_headings(content)
        raw_chunks: list[tuple[str, str]] = []

        for section in sections:
            heading = " > ".join(section.heading_path) if section.heading_path else "Introduction"
            pieces = self._split_body(section.body)
            for piece in pieces:
                text = piece.strip()
                if not text:
                    continue
                if section.heading_path:
                    prefix = f"# {' > '.join(section.heading_path)}\n\n"
                    text = prefix + text
                raw_chunks.append((heading, text))

        deduped: list[tuple[str, str]] = []
        seen: set[str] = set()
        for heading, text in raw_chunks:
            fingerprint = hashlib.sha256(
                sanitize_text_for_embedding(text).encode("utf-8", "replace")
            ).hexdigest()
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            deduped.append((heading, text))

        chunks: list[DocumentChunk] = []
        for index, (heading, text) in enumerate(deduped):
            chunks.append(
                DocumentChunk(
                    chunk_id=f"{document_id}:{index}",
                    document_id=document_id,
                    text=sanitize_text_for_embedding(text),
                    platform=resolved_platform,
                    category=resolved_category,
                    source_file=sanitize_text_for_embedding(file_key),
                    relative_path=sanitize_text_for_embedding(relative_path),
                    heading=sanitize_text_for_embedding(heading),
                    chunk_index=index,
                    content_hash=content_hash,
                    document_version=document_version,
                )
            )
        return chunks

    def _split_by_headings(self, content: str) -> list[_Section]:
        matches = list(HEADING_PATTERN.finditer(content))
        if not matches:
            return [_Section(heading_path=[], body=content.strip())]

        sections: list[_Section] = []
        heading_stack: list[tuple[int, str]] = []

        if matches[0].start() > 0:
            preamble = content[: matches[0].start()].strip()
            if preamble:
                sections.append(_Section(heading_path=[], body=preamble))

        for index, match in enumerate(matches):
            level = len(match.group(1))
            title = match.group(2).strip()
            start = match.end()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(content)
            body = content[start:end].strip()

            while heading_stack and heading_stack[-1][0] >= level:
                heading_stack.pop()
            heading_stack.append((level, title))
            path = [item[1] for item in heading_stack]
            sections.append(_Section(heading_path=path, body=body))

        return sections

    def _split_body(self, body: str) -> list[str]:
        if len(body) <= self.chunk_size:
            return [body] if body.strip() else []

        blocks = self._split_preserving_fences(body)
        chunks: list[str] = []
        current = ""

        for block in blocks:
            if not block.strip():
                continue
            if len(block) > self.chunk_size:
                if current.strip():
                    chunks.append(current.strip())
                    current = ""
                chunks.extend(self._split_long_text(block))
                continue

            candidate = f"{current}\n\n{block}".strip() if current else block
            if len(candidate) <= self.chunk_size:
                current = candidate
            else:
                if current.strip():
                    chunks.append(current.strip())
                current = block

        if current.strip():
            chunks.append(current.strip())
        return self._apply_overlap(chunks)

    def _split_preserving_fences(self, text: str) -> list[str]:
        lines = text.splitlines()
        blocks: list[str] = []
        current: list[str] = []
        in_fence = False

        for line in lines:
            if line.strip().startswith("```"):
                in_fence = not in_fence
            current.append(line)
            if not in_fence and not line.strip():
                blocks.append("\n".join(current).strip())
                current = []

        if current:
            blocks.append("\n".join(current).strip())
        return [block for block in blocks if block]

    def _split_long_text(self, text: str) -> list[str]:
        words = text.split()
        chunks: list[str] = []
        current: list[str] = []
        current_len = 0

        for word in words:
            extra = len(word) + (1 if current else 0)
            if current_len + extra > self.chunk_size:
                chunks.append(" ".join(current))
                overlap_words = current[-max(1, self.chunk_overlap // 5) :]
                current = overlap_words + [word]
                current_len = len(" ".join(current))
            else:
                current.append(word)
                current_len += extra

        if current:
            chunks.append(" ".join(current))
        return chunks

    def _apply_overlap(self, chunks: list[str]) -> list[str]:
        if self.chunk_overlap <= 0 or len(chunks) <= 1:
            return chunks

        merged: list[str] = [chunks[0]]
        for index in range(1, len(chunks)):
            prev = merged[-1]
            tail = prev[-self.chunk_overlap :]
            merged.append(f"{tail}\n\n{chunks[index]}".strip())
        return merged
