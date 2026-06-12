import os
from google.adk.agents import LoopAgent, LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from .events import build_phase_event, publish_phase
from .hitl import human_approval_tool

MCP_URL = os.environ.get("DIVE_MCP_URL", "https://mcp.diveseeks.cloud/mcp")


def _emit_after_task(callback_context):
    """after_agent_callback: read run/task ids from session state and publish agent_complete."""
    state = callback_context.state
    publish_phase(build_phase_event(
        project_id=state.get("projectId"), tenant_id=state.get("tenantId"), run_id=state.get("runId"),
        phase="agent_complete", specialist=state.get("currentSpecialist"),
        outcome=state.get("lastOutcome"), summary=state.get("lastSummary"),
    ))


def build_root_agent() -> LoopAgent:
    task_agent = LlmAgent(
        model="gemini-2.5-flash",  # per-task BYOK swap happens via state-driven model resolution
        name="dive_task_agent",
        instruction=(
            "You process exactly ONE queued task for the current run using the Dive MCP tools. "
            "Read the next queued task, do the work via tools, then record the outcome in state "
            "(lastOutcome, lastSummary). If a destructive or budget-spending action is needed, call "
            "request_human_approval and stop."
        ),
        tools=[
            MCPToolset(connection_params=StreamableHTTPConnectionParams(url=MCP_URL)),
            human_approval_tool,
        ],
        after_agent_callback=_emit_after_task,
    )
    # Loops until no queued tasks remain (sub-agent escalates) or max_iterations hit.
    return LoopAgent(name="dive_run", sub_agents=[task_agent], max_iterations=50)
