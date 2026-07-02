"""Prime contract award search + detail (source: USAspending, public domain)."""
from fastapi import APIRouter, Depends

from .. import cache, upstream
from ..auth import require_api_key
from ..models import AwardSearchRequest, Paged
from ..usaspending_helpers import FIELDS, build_filters, normalize_award

router = APIRouter(prefix="/v1/awards", tags=["Awards"], dependencies=[Depends(require_api_key)])


@router.post("/search", response_model=Paged, summary="Search federal contract awards")
async def search_awards(req: AwardSearchRequest) -> Paged:
    """Search prime contract awards government-wide. Filter by keyword, NAICS,
    PSC, agency, vendor, action-date window, and award amount."""
    body = {
        "filters": build_filters(
            keywords=req.keywords,
            naics_codes=req.naics_codes,
            psc_codes=req.psc_codes,
            agency=req.agency,
            recipient_search_text=req.recipient_search_text,
            start_date=req.start_date,
            end_date=req.end_date,
            min_amount=req.min_amount,
            max_amount=req.max_amount,
        ),
        "fields": FIELDS,
        "sort": req.sort,
        "order": req.order,
        "limit": req.limit,
        "page": req.page,
    }
    if (hit := cache.get("awards", body)) is not None:
        return hit
    data = await upstream.usaspending_post("/search/spending_by_award/", body)
    out = Paged(
        page=req.page,
        limit=req.limit,
        has_next=data.get("page_metadata", {}).get("hasNext"),
        results=[normalize_award(r) for r in data.get("results", [])],
    )
    cache.put("awards", body, out)
    return out


@router.get("/{internal_id}", summary="Full award detail")
async def award_detail(internal_id: str) -> dict:
    """Full USAspending record for one award. Use the `internal_id` returned by
    /v1/awards/search (e.g. `CONT_AWD_...`)."""
    if (hit := cache.get("award_detail", internal_id)) is not None:
        return hit
    data = await upstream.usaspending_get(f"/awards/{internal_id}/")
    cache.put("award_detail", internal_id, data)
    return data
