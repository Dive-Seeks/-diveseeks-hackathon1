import os
from fastapi import FastAPI
from pydantic import BaseModel
from google.adk.runners import InMemoryRunner
from google.genai import types
from .agent import build_specialist_agent

app = FastAPI()


class RunRequest(BaseModel):
    specialist: str
    team: str
    isCoding: bool
    userId: str
    tenantId: str
    sessionId: str
    task: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/run")
async def run(req: RunRequest):
    instruction = (
        f"You are the '{req.specialist}' specialist on the '{req.team}' team. "
        f"Complete the task using the available tools. Task: {req.task}"
    )
    agent = build_specialist_agent(instruction=instruction, user_id=req.userId)
    runner = InMemoryRunner(agent=agent, app_name="dive_specialist")
    await runner.session_service.create_session(
        app_name="dive_specialist", user_id=req.userId, session_id=req.sessionId
    )

    final_text = ""
    async for event in runner.run_async(
        user_id=req.userId,
        session_id=req.sessionId,
        new_message=types.Content(role="user", parts=[types.Part(text=req.task)]),
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    final_text = part.text

    return {
        "result": final_text or "(no output)",
        "report": {"taskOutcome": "pass" if final_text else "needs_review", "duration": 0, "errorPatterns": []},
    }
