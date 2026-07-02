"""API-key auth + per-key sliding-window rate limiting.

Two accepted credentials:
1. X-API-Key: <key>            -- direct customers (keys in FCI_API_KEYS)
2. X-RapidAPI-Proxy-Secret     -- requests proxied by the RapidAPI gateway
"""
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request

from .config import get_settings

_WINDOW = 60.0
_hits: dict[str, deque] = defaultdict(deque)


def _rate_limit(key: str, limit: int) -> None:
    now = time.monotonic()
    q = _hits[key]
    while q and now - q[0] > _WINDOW:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Upgrade your plan or retry in a minute.",
            headers={"Retry-After": "60"},
        )
    q.append(now)


async def require_api_key(
    request: Request,
    x_api_key: str | None = Header(default=None),
    x_rapidapi_proxy_secret: str | None = Header(default=None),
) -> str:
    """Returns the caller identity used for rate limiting."""
    s = get_settings()

    if s.demo_mode:
        ident = request.client.host if request.client else "demo"
        _rate_limit(f"demo:{ident}", s.rate_limit_per_minute)
        return "demo"

    if s.rapidapi_proxy_secret and x_rapidapi_proxy_secret == s.rapidapi_proxy_secret:
        # RapidAPI meters per-subscriber quotas itself; we only guard bursts.
        user = request.headers.get("X-RapidAPI-User", "rapidapi")
        _rate_limit(f"rapid:{user}", s.rate_limit_per_minute)
        return f"rapid:{user}"

    if x_api_key and x_api_key in s.api_key_set:
        _rate_limit(f"key:{x_api_key}", s.rate_limit_per_minute)
        return f"key:{x_api_key}"

    raise HTTPException(
        status_code=401,
        detail="Missing or invalid API key. Pass it in the X-API-Key header.",
    )
