"""Recompete radar -- the differentiator.

Contracts whose period of performance ends within N months are highly likely
to be re-solicited. Incumbent-facing platforms sell this signal for
$300-1,000/seat/month; here it is a single API call.
"""
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

    # USAspending cannot bound "End Date" server-side, so we sort by End Date
    # descending (far future first) and scan pages until rows drop below today.
    candidates: list[RecompeteCandidate] = []
    for page in range(1, s.recompete_scan_pages + 1):
        body = {
            "filters": filters,
            "fields": FIELDS,
            "sort": "End Date",
            "order": "desc",
            "limit": 100,
            "page": page,
        }
        data = await upstream.usaspending_post("/search/spending_by_award/", body)
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
