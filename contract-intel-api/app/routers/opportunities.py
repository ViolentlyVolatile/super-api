"""Live contract opportunities (source: SAM.gov Get Opportunities v2).

Requires FCI_SAM_API_KEY on the deployment (free key from any sam.gov account).
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from .. import cache, upstream
from ..auth import require_api_key
from ..models import Opportunity, Paged

router = APIRouter(prefix="/v1/opportunities", tags=["Opportunities"], dependencies=[Depends(require_api_key)])

_MMDDYYYY = "%m/%d/%Y"


def _normalize(item: dict) -> Opportunity:
    return Opportunity(
        notice_id=item.get("noticeId"),
        title=item.get("title"),
        solicitation_number=item.get("solicitationNumber"),
        agency=item.get("fullParentPathName"),
        notice_type=item.get("type"),
        posted_date=item.get("postedDate"),
        response_deadline=item.get("responseDeadLine"),
        naics_code=item.get("naicsCode"),
        set_aside=item.get("typeOfSetAsideDescription"),
        ui_link=item.get("uiLink"),
    )


@router.get("/search", response_model=Paged, summary="Search live solicitations")
async def search_opportunities(
    keywords: str | None = Query(None, description="Free-text title search"),
    naics: str | None = Query(None, description="NAICS code, e.g. 336411"),
    notice_type: str | None = Query(
        None,
        description="p=Presolicitation, o=Solicitation, k=Combined Synopsis, r=Sources Sought, s=Special Notice",
    ),
    set_aside: str | None = Query(None, description="e.g. SBA, 8A, WOSB, SDVOSBC"),
    days_back: int = Query(30, ge=1, le=365, description="How many days of postings to search"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> Paged:
    today = date.today()
    params: dict = {
        "postedFrom": (today - timedelta(days=days_back)).strftime(_MMDDYYYY),
        "postedTo": today.strftime(_MMDDYYYY),
        "limit": limit,
        "offset": offset,
    }
    if keywords:
        params["title"] = keywords
    if naics:
        params["ncode"] = naics
    if notice_type:
        params["ptype"] = notice_type
    if set_aside:
        params["typeOfSetAside"] = set_aside

    if (hit := cache.get("opps", params)) is not None:
        return hit
    data = await upstream.sam_get("/opportunities/v2/search", params)
    total = data.get("totalRecords", 0)
    out = Paged(
        page=offset // limit + 1,
        limit=limit,
        has_next=offset + limit < total,
        results=[_normalize(i) for i in data.get("opportunitiesData", [])],
    )
    cache.put("opps", params, out)
    return out
