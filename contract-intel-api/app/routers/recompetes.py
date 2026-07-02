"""Recompete radar -- the differentiator.

Contracts whose period of performance ends within N months are highly likely
to be re-solicited. Incumbent-facing platforms sell this signal for
$300-1,000/seat/month; here it is a single API call.
"""
import asyncio
import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from .. import cache, upstream
from ..auth import require_api_key
from ..config import get_settings
from ..models import Paged, RecompeteCandidate, RecompeteRequest
from ..usaspending_helpers import FIELDS, build_filters, normalize_award

router = APIRouter(prefix="/v1/recompetes", tags=["Recompete Radar"], dependencies=[Depends(require_api_key)])


def _score(amount: float | None, months_left: float, horizon: int) -> float:
    """0-100: bigger contracts expiring sooner score higher."""
    amt = min(max(amount or 0.0, 0.0), 1_000_000_000.0)
    size = (amt ** 0.5) / (1_000_000_000.0 ** 0.5)          # 0..1, sqrt-damped
    urgency = max(0.0, 1.0 - months_left / max(horizon, 1))  # 1 = expiring now
    return round(100 * (0.6 * size + 0.4 * urgency), 1)


# Sentinel for the forged search_after cursor: larger than any real record id,
# so rows whose End Date equals the boundary date are included, not skipped.
_CURSOR_MAX_ID = 2**62


def _cursor_date(value: str | int) -> str:
    """USAspending echoes the End Date sort value as epoch milliseconds
    ("1813968000000") in page_metadata, but rejects that exact value when sent
    back (503/422) -- it only accepts date strings. Convert before reuse."""
    s = str(value)
    if s.isdigit():
        return datetime.fromtimestamp(int(s) / 1000, tz=timezone.utc).date().isoformat()
    return s


@router.post("/search", response_model=Paged, summary="Find contracts expiring soon (likely recompetes)")
async def search_recompetes(req: RecompeteRequest) -> Paged:
    s = get_settings()
    cache_body = req.model_dump()
    if (hit := cache.get("recompetes", cache_body, recompete=True)) is not None:
        return hit

    today = date.today()
    window_end = today + timedelta(days=req.months_ahead * 30)

    filters = build_filters(
        keywords=req.keywords,
        naics_codes=req.naics_codes,
        psc_codes=req.psc_codes,
        agency=req.agency,
        min_amount=req.min_amount,
    )

    # USAspending cannot bound "End Date" server-side, and sorting desc puts
    # data-entry typos (end dates in year 8201!) first -- often more than the
    # 50,000-row random-access pagination cap, making the window unreachable
    # by page number alone. Instead we forge an Elasticsearch search_after
    # cursor at the window boundary: pass window_end as last_record_sort_value
    # and jump directly to the first row with End Date <= window_end, then
    # paginate sequentially until rows drop below today.
    candidates: list[RecompeteCandidate] = []
    cursor_value: str | int = str(window_end)
    cursor_id: int = _CURSOR_MAX_ID
    for page in range(1, s.recompete_scan_pages + 1):
        data = await upstream.usaspending_post(
            "/search/spending_by_award/",
            {
                "filters": filters,
                "fields": FIELDS,
                "sort": "End Date",
                "order": "desc",
                "limit": 100,
                "page": page,
                "last_record_sort_value": cursor_value,
                "last_record_unique_id": cursor_id,
            },
        )
        rows = data.get("results", [])
        if not rows:
            break
        past_window = False
        for row in rows:
            a = normalize_award(row)
            if not a.end_date:
                continue
            try:
                end = date.fromisoformat(a.end_date)
            except ValueError:
                continue
            if end < today:
                past_window = True
                break
            if end > window_end:
                continue  # still descending toward the window
            months_left = round((end - today).days / 30.44, 1)
            candidates.append(
                RecompeteCandidate(
                    **a.model_dump(),
                    months_until_expiry=months_left,
                    recompete_score=_score(a.amount, months_left, req.months_ahead),
                )
            )
        meta = data.get("page_metadata", {})
        if past_window or not meta.get("hasNext"):
            break
        # advance the search_after cursor to the last row of this page
        next_value, next_id = meta.get("last_record_sort_value"), meta.get("last_record_unique_id")
        if next_value is None or next_id is None:
            break
        cursor_value, cursor_id = _cursor_date(next_value), next_id

    candidates.sort(key=lambda c: c.recompete_score or 0, reverse=True)
    out = Paged(page=1, limit=req.limit, has_next=False, results=candidates[: req.limit])
    cache.put("recompetes", cache_body, out, recompete=True)
    return out


# --- Cache pre-warming -------------------------------------------------------
# Scans are only a few upstream calls now, but warming the most common queries
# at startup (and before the cache TTL expires) keeps the marketplace
# first-call experience instant.

log = logging.getLogger("fci.prewarm")

PREWARM_QUERIES = [
    RecompeteRequest(),                                     # default: 12 months
    RecompeteRequest(months_ahead=6),
    RecompeteRequest(months_ahead=12, min_amount=5_000_000),
]


async def prewarm_loop() -> None:
    s = get_settings()
    while True:
        for req in PREWARM_QUERIES:
            try:
                await search_recompetes(req)
            except Exception as exc:  # never let warming kill the app
                log.warning("prewarm failed for %s: %s", req.model_dump(), exc)
        # re-warm 30 min before expiry so users never hit a cold cache
        await asyncio.sleep(max(s.recompete_cache_ttl_seconds - 1800, 600))
