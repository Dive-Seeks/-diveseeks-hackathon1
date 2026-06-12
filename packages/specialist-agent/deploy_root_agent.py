import os
import vertexai
from vertexai import agent_engines
from dive_specialist_agent.root_agent import build_root_agent

vertexai.init(
    project=os.environ.get("GCP_PROJECT", "crack-glider-464713-t4"),
    location=os.environ.get("GCP_LOCATION", "us-central1"),
    staging_bucket=os.environ["STAGING_BUCKET"],
)

remote_app = agent_engines.create(
    agent_engine=build_root_agent(),
    requirements=[
        "google-cloud-aiplatform[adk,agent_engines]", "litellm", "httpx",
        "google-cloud-pubsub",
    ],
    display_name="dive-run-orchestrator",
)
print("Deployed:", remote_app.resource_name)  # set as ADK_REASONING_ENGINE
