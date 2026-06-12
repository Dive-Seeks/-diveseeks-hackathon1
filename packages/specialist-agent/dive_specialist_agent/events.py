import json
import os
from typing import Optional
from google.cloud import pubsub_v1

_publisher = None
_topic = None


def build_phase_event(*, project_id: str, tenant_id: str, run_id: str, phase: str, **fields) -> dict:
    """Build the AdkPhaseEvent payload (camelCase), dropping None fields to match the BullMQ path."""
    evt = {"projectId": project_id, "tenantId": tenant_id, "runId": run_id, "phase": phase}
    for k, v in fields.items():
        if v is not None:
            evt[k] = v
    return evt


def publish_phase(event: dict) -> None:
    global _publisher, _topic
    if _publisher is None:
        _publisher = pubsub_v1.PublisherClient()
        _topic = os.environ["ADK_EVENTS_TOPIC"]  # projects/.../topics/adk-phase-events
    _publisher.publish(_topic, json.dumps(event).encode("utf-8"))
