"""Tool input/output schemas for the Platform Selection ADK agent."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ListPlatformsOutput(BaseModel):
    platforms: list[str] = Field(default_factory=list)
    count: int = 0


class SearchPlatformDocsInput(BaseModel):
    question: str
    platform: str | None = None


class SearchPlatformDocsOutput(BaseModel):
    platform: str | None = None
    chunk_count: int = 0
    context: str = ""
