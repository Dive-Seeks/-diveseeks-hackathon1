from google.adk.tools import LongRunningFunctionTool


def request_human_approval(reason: str) -> dict:
    """Pause for human approval. Returns a pending ticket; resolved out-of-band by the resume webhook."""
    # The actual decision is injected when the run resumes; this returns the pending marker.
    return {"status": "pending", "reason": reason}


human_approval_tool = LongRunningFunctionTool(func=request_human_approval)
