"""Platform Selection Agent ADK tools."""

from cloudpilot.agents.platform_selection.tools.search_platform_docs import (
    list_available_platforms,
    search_platform_documentation,
)

ALL_TOOLS = [
    list_available_platforms,
    search_platform_documentation,
]
