"""HTTP clients for the two upstream sources.

USAspending.gov  -- award/spending data, no API key required.
SAM.gov          -- contract opportunities + exclusions, free API key required.
"""
from typing import Any

import httpx
from fastapi import HTTPException

from .config import get_settings

_USER_AGENT = "contract-intel-api/1.0 (+marketplace listing)"


def _client() -> httpx.AsyncClient:
    s = get_settings()
    return httpx.AsyncClient(
        timeout=s.upstream_timeout_seconds,
        headers={"User-Agent": _USER_AGENT},
        # Public endpoints only; ignore ambient proxy env (breaks in sandboxes/CI).
        trust_env=False,
    )


def _raise_upstream(source: str, resp: httpx.Response) -> None:
    if resp.status_code >= 500:
        raise HTTPException(502, f"{source} is temporarily unavailable (HTTP {resp.status_code}). Retry shortly.")
    if resp.status_code == 429:
        raise HTTPException(503, f"{source} rate limit hit. Retry shortly.")
    if resp.status_code >= 400:
        detail: Any
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text[:300]
        raise HTTPException(502, {"source": source, "upstream_status": resp.status_code, "upstream_error": detail})


# ---------------------------------------------------------------- USAspending

async def usaspending_post(path: str, body: dict) -> dict:
    s = get_settings()
    async with _client() as c:
        resp = await c.post(f"{s.usaspending_base_url}{path}", json=body)
    _raise_upstream("USAspending", resp)
    return resp.json()


async def usaspending_get(path: str, params: dict | None = None) -> dict:
    s = get_settings()
    async with _client() as c:
        resp = await c.get(f"{s.usaspending_base_url}{path}", params=params or {})
    _raise_upstream("USAspending", resp)
    return resp.json()


# --------------------------------------------------------------------- SAM.gov

async def sam_get(path: str, params: dict) -> dict:
    s = get_settings()
    if not s.sam_api_key:
        raise HTTPException(
            503,
            "SAM.gov endpoints are not configured on this deployment "
            "(set FCI_SAM_API_KEY; keys are free at sam.gov > Account Details).",
        )
    params = {**params, "api_key": s.sam_api_key}
    async with _client() as c:
        resp = await c.get(f"{s.sam_base_url}{path}", params=params)
    _raise_upstream("SAM.gov", resp)
    return resp.json()
