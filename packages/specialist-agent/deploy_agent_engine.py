import os
import vertexai
from vertexai import agent_engines
from dive_specialist_agent.agent import build_specialist_agent

vertexai.init(
    project=os.environ.get("GCP_PROJECT", "crack-glider-464713-t4"),
    location=os.environ.get("GCP_LOCATION", "us-central1"),
    staging_bucket=os.environ["STAGING_BUCKET"],  # gs://...
)

# A template agent for deployment; per-request BYOK is resolved at call time inside build_specialist_agent.
root_agent = build_specialist_agent(instruction="Dive specialist agent.", user_id="__template__")

remote_app = agent_engines.create(
    agent_engine=root_agent,
    requirements=["google-cloud-aiplatform[adk,agent_engines]", "litellm", "httpx"],
    display_name="dive-specialist-agent",
)
print("Deployed:", remote_app.resource_name)
