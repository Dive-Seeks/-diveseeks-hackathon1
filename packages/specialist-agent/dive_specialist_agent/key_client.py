import httpx
from typing import Optional, TypedDict


class UserKey(TypedDict):
    provider: str
    model: str
    apiKey: str


def fetch_user_key(api_base: str, secret: str, user_id: str) -> Optional[UserKey]:
    """Fetch {provider, model, apiKey} from the NestJS internal endpoint. None if unavailable."""
    try:
        resp = httpx.get(
            f"{api_base}/internal/llm-key/{user_id}",
            headers={"x-internal-secret": secret},
            timeout=10.0,
        )
        if resp.status_code != 200:
            return None
        return resp.json()
    except httpx.HTTPError:
        return None
