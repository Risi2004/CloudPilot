"""CloudPilot Deployment Agent root definition."""

from google.adk.agents import LlmAgent

from cloudpilot.agents.deployment.prompt import DEPLOYMENT_SYSTEM_INSTRUCTION
from cloudpilot.agents.deployment.tools import ALL_TOOLS
from cloudpilot.config import configure_runtime, get_default_llm_model

configure_runtime()

root_agent = LlmAgent(
    model=get_default_llm_model(),
    name="deployment_agent",
    description=(
        "Validates deployment blueprints, orchestrates Render and Vercel deployments, "
        "and analyzes failures using official documentation."
    ),
    instruction=DEPLOYMENT_SYSTEM_INSTRUCTION,
    tools=ALL_TOOLS,
)
