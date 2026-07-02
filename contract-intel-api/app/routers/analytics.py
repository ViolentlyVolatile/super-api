"""Spending breakdowns by NAICS / PSC / agency / recipient (source: USAspending)."""
from fastapi import APIRouter, Depends

from .. import cache, upstream
from ..auth import require_api_key
from ..models import Paged, SpendingBreakdownRequest
from ..usaspending_helpers import build_filters

router = APIRouter(prefix="/v1/analytics", tags=["Analytics"], dependencies=[Depends(require_api_key)])

_FY_START_MONTH_DAY = ("10-01", "09-30")  # US federal fiscal year


@router.post("/spending", response_model=Paged, summary="Spending totals grouped by a dimension")
async def spending_breakdown(req: SpendingBreakdownRequest) -> Paged:
    """Who gets the money? Group federal contract spending by `naics`, `psc`,
    `awarding_agency`, or `recipient` -- optionally scoped by keyword, NAICS,
    agency, and fiscal year. Ideal for market sizing and competitor analysis."""
    start = end = None
    if req.fiscal_year:
        start = f"{req.fiscal_year - 1}-{_FY_START_MONTH_DAY[0]}"
        end = f"{req.fiscal_year}-{_FY_START_MONTH_DAY[1]}"

    body = {
        "filters": build_filters(
            keywords=req.keywords,
            naics_codes=req.naics_codes,
            agency=req.agency,
            start_date=start,
            end_date=end,
        ),
        "limit": req.limit,
        "page": req.page,
    }
    cache_key = {"dimension": req.dimension, **body}
    if (hit := cache.get("analytics", cache_key)) is not None:
        return hit

    data = await upstream.usaspending_post(f"/search/spending_by_category/{req.dimension}/", body)
    out = Paged(
        page=req.page,
        limit=req.limit,
        has_next=data.get("page_metadata", {}).get("hasNext"),
        results=data.get("results", []),
    )
    cache.put("analytics", cache_key, out)
    return out
