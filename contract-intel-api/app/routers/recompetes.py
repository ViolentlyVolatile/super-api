"""Recompete radar -- the differentiator.

Contracts whose period of performance ends within N months are highly likely
to be re-solicited. Incumbent-facing platforms sell this signal for
$300-1,000/seat/month; here it is a single API call.
"""
import asyncio
import logging
from datetime import date, timedelta

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


def _last_end_date(rows: list[dict]) -> date | None:
    """Last parseable End Date in a page (rows are sorted by End Date desc)."""
    for row in reversed(rows):
        raw = row.get("End Date")
        if not raw:
            continue
        try:
            return date.fromisoformat(raw)
        except ValueError:
            continue
    return None


async def _fetch_page(filters: dict, page: int) -> dict:
    return await upstream.usaspending_post(
        "/search/spending_by_award/",
        {
            "filters": filters,
            "fields": FIELDS,
            "sort": "End Date",
            "order": "desc",
            "limit": 100,
            "page": page,
        },
    )


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

    # USAspending cannot bound "End Date" server-side. Sorting desc puts the
    # far future first -- including data-entry typos (end dates in year 8201!)
    # -- so a linear scan from page 1 never reaches the real window. Instead we
    # locate the first page whose rows have descended into the window
    # (exponential probe + binary search on the page number), then collect.
    async def window_reached(page: int) -> tuple[bool, dict]:
        """True once this page's rows have descended to/past window_end."""
        data = await _fetch_page(filters, page)
        rows = data.get("results", [])
        if not rows:
            return True, data  # ran out of data: window is at/behind this page
        last = _last_end_date(rows)
        return (last is None or last <= window_end), data

    reached, first_data = await window_reached(1)
    start_page = 1
    if not reached and first_data.get("page_metadata", {}).get("hasNext"):
        # Exponential probe: find some page where the window is reached.
        lo, hi = 1, None
        p = 2
        for _ in range(20):  # up to page ~1M
            reached, _data = await window_reached(p)
            if reached:
                hi = p
                break
            lo = p
            p *= 2
        # Binary search: smallest page where the window is reached.
        if hi is not None:
            while hi - lo > 1:
                mid = (lo + hi) // 2
                reached, _data = await window_reached(mid)
                if reached:
                    hi = mid
                else:
                    lo = mid
            start_page = hi
        else:
            start_page = p  # window deeper than probe budget; collect best-effort

    candidates: list[RecompeteCandidate] = []
    for page in range(start_page, start_page + s.recompete_scan_pages):
        data = first_data if page == 1 else await _fetch_page(filters, page)
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
        if past_window or not data.get("page_metadata", {}).get("hasNext"):
            break

    candidates.sort(key=lambda c: c.recompete_score or 0, reverse=True)
    out = Paged(page=1, limit=req.limit, has_next=False, results=candidates[: req.limit])
    cache.put("recompetes", cache_body, out, recompete=True)
    return out


# --- Cache pre-warming -------------------------------------------------------
# The first uncached scan costs ~15-20 upstream calls (30-60s). Warm the most
# common queries on startup and re-warm before the cache TTL expires, so the
# marketplace first-call experience is fast.

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
