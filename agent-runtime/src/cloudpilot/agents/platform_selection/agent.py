"""CloudPilot Platform Selection Agent root definition."""

from google.adk.agents import LlmAgent

from cloudpilot.agents.platform_selection.prompt import INTERVIEW_SYSTEM_INSTRUCTION
from cloudpilot.agents.platform_selection.tools import ALL_TOOLS
from cloudpilot.config import configure_runtime, get_default_llm_model

configure_runtime()

root_agent = LlmAgent(
    model=get_default_llm_model(),
    name="platform_selection_agent",
    description=(
        "Conducts adaptive deployment interviews and recommends hosting platforms "
        "grounded in official documentation from the CloudPilot knowledge base."
    ),
    instruction=INTERVIEW_SYSTEM_INSTRUCTION,
    tools=ALL_TOOLS,
)
