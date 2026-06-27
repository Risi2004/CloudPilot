"""Documentation Agent tool schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SearchDocumentationInput(BaseModel):
    question: str = Field(description="Natural language question about deployment or platform docs.")
    platform: str | None = Field(default=None, description="Optional platform filter such as render or vercel.")


class SearchDocumentationOutput(BaseModel):
    chunk_count: int
    context: str
