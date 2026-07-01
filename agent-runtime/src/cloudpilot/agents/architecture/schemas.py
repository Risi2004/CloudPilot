"""ADK tool schemas for the Architecture Agent."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SearchArchitectureDocsInput(BaseModel):
    question: str
    platform: str | None = None


class SearchArchitectureDocsOutput(BaseModel):
    platform: str | None = None
    chunk_count: int = 0
    context: str = ""


class ListArchitecturePlatformsOutput(BaseModel):
    platforms: list[str] = Field(default_factory=list)
    count: int = 0
