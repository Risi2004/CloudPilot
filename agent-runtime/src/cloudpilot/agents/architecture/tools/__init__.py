"""Architecture Agent ADK tools."""

from cloudpilot.agents.architecture.tools.search_architecture_docs import (
    list_architecture_platforms,
    search_architecture_documentation,
)

ALL_TOOLS = [
    list_architecture_platforms,
    search_architecture_documentation,
]
