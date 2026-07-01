"""CloudPilot Architecture Agent root definition."""

from google.adk.agents import LlmAgent

from cloudpilot.agents.architecture.prompt import BLUEPRINT_SYSTEM_INSTRUCTION
from cloudpilot.agents.architecture.tools import ALL_TOOLS
from cloudpilot.config import configure_runtime, get_default_llm_model

configure_runtime()

root_agent = LlmAgent(
    model=get_default_llm_model(),
    name="architecture_agent",
    description=(
        "Designs deployment architecture and produces machine-readable deployment "
        "blueprints from repository analysis, platform selection, and documentation."
    ),
    instruction=BLUEPRINT_SYSTEM_INSTRUCTION,
    tools=ALL_TOOLS,
)
