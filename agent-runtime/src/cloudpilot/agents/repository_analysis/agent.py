"""Repository Analysis Agent definition."""

from __future__ import annotations

from google.adk.agents import LlmAgent

from cloudpilot.agents.repository_analysis.models import AnalysisNarrative
from cloudpilot.agents.repository_analysis.prompt import SYSTEM_INSTRUCTION
from cloudpilot.agents.repository_analysis.tools import ALL_TOOLS
from cloudpilot.config import configure_runtime, get_default_llm_model

configure_runtime()

root_agent = LlmAgent(
    model=get_default_llm_model(),
    name="repository_analysis_agent",
    description=(
        "Analyzes software repositories and produces structured facts plus "
        "a human-readable technical assessment."
    ),
    instruction=SYSTEM_INSTRUCTION,
    tools=ALL_TOOLS,
    output_schema=AnalysisNarrative,
)
