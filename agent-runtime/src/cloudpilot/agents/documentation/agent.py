"""CloudPilot Documentation Agent root definition."""

from google.adk.agents import LlmAgent

from cloudpilot.agents.documentation.prompt import SYSTEM_INSTRUCTION
from cloudpilot.agents.documentation.tools import ALL_TOOLS
from cloudpilot.config import get_default_llm_model

root_agent = LlmAgent(
    model=get_default_llm_model(),
    name="documentation_agent",
    description=(
        "Answers deployment and platform configuration questions using CloudPilot's "
        "official documentation knowledge base."
    ),
    instruction=SYSTEM_INSTRUCTION,
    tools=ALL_TOOLS,
)
