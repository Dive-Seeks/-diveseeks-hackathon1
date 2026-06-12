import os
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset

try:
    from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams as ConnectionParams
except ImportError:
    from google.adk.tools.mcp_tool.mcp_toolset import SseServerParams as ConnectionParams

from .key_client import fetch_user_key

MCP_URL = os.environ.get("DIVE_MCP_URL", "https://mcp.diveseeks.cloud/mcp")

# LiteLlm needs a "provider/model" string. Gemini is the default when the user has no BYOK key.
_LITELLM_PREFIX = {"openai": "openai", "groq": "groq", "openrouter": "openrouter", "google": "gemini"}


def _model_for(user_key) -> LiteLlm | str:
    if not user_key:
        return "gemini-2.5-flash"  # platform default (Gemini), env-keyed by the runtime
    prefix = _LITELLM_PREFIX.get(user_key["provider"], "gemini")
    return LiteLlm(model=f'{prefix}/{user_key["model"]}', api_key=user_key["apiKey"])


def build_specialist_agent(*, instruction: str, user_id: str) -> LlmAgent:
    """Build a one-task specialist agent: BYOK model + the Dive MCP toolset."""
    api_base = os.environ["DIVE_API_URL"]
    secret = os.environ["INTERNAL_API_SECRET"]
    user_key = fetch_user_key(api_base, secret, user_id)

    return LlmAgent(
        model=_model_for(user_key),
        name="dive_specialist",
        instruction=instruction,
        tools=[
            MCPToolset(
                connection_params=ConnectionParams(url=MCP_URL),
            )
        ],
    )
