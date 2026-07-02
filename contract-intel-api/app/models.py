"""Request/response models (the public contract of this API)."""
from datetime import date
from typing import Any

from pydantic import BaseModel, Field

AWARD_TYPE_CONTRACTS = ["A", "B", "C", "D"]  # USAspending prime contract codes


# ------------------------------------------------------------------ requests

class AwardSearchRequest(BaseModel):
    keywords: list[str] | None = Field(None, description="Free-text keywords, e.g. ['radar', 'maintenance']")
    naics_codes: list[str] | None = Field(None, description="NAICS codes, e.g. ['336411']")
    psc_codes: list[str] | None = Field(None, description="Product/Service Codes, e.g. ['1560']")
    agency: str | None = Field(None, description="Awarding top-tier agency name, e.g. 'Department of Defense'")
    recipient_search_text: str | None = Field(None, description="Recipient (vendor) name to match")
    start_date: date | None = Field(None, description="Action date window start (YYYY-MM-DD)")
    end_date: date | None = Field(None, description="Action date window end (YYYY-MM-DD)")
    min_amount: float | None = None
    max_amount: float | None = None
    sort: str = Field("Award Amount", description="One of: 'Award Amount', 'Start Date', 'End Date', 'Recipient Name'")
    order: str = Field("desc", pattern="^(asc|desc)$")
    limit: int = Field(25, ge=1, le=100)
    page: int = Field(1, ge=1)


class RecompeteRequest(BaseModel):
    """Find contracts whose period of performance ends inside a window --
    i.e. predictable upcoming re-competitions."""
    months_ahead: int = Field(12, ge=1, le=36, description="Window size from today, in months")
    naics_codes: list[str] | None = None
    psc_codes: list[str] | None = None
    agency: str | None = Field(None, description="Awarding top-tier agency name")
    keywords: list[str] | None = None
    min_amount: float | None = Field(None, description="Only include awards >= this obligated amount")
    limit: int = Field(50, ge=1, le=200)


class SpendingBreakdownRequest(BaseModel):
    dimension: str = Field(..., pattern="^(naics|psc|awarding_agency|recipient)$")
    keywords: list[str] | None = None
    naics_codes: list[str] | None = None
    agency: str | None = None
    fiscal_year: int | None = Field(None, ge=2008, le=2030)
    limit: int = Field(25, ge=1, le=100)
    page: int = Field(1, ge=1)


# ----------------------------------------------------------------- responses

class Award(BaseModel):
    award_id: str | None = None
    internal_id: str | None = Field(None, description="Pass to /v1/awards/{internal_id} for full detail")
    recipient_name: str | None = None
    description: str | None = None
    amount: float | None = None
    start_date: str | None = None
    end_date: str | None = None
    awarding_agency: str | None = None
    awarding_sub_agency: str | None = None
    naics: str | None = None
    psc: str | None = None


class RecompeteCandidate(Award):
    months_until_expiry: float | None = None
    recompete_score: float | None = Field(
        None,
        description="0-100 priority score: larger, sooner-expiring contracts rank higher",
    )


class Paged(BaseModel):
    page: int
    limit: int
    has_next: bool | None = None
    results: list[Any]


class Opportunity(BaseModel):
    notice_id: str | None = None
    title: str | None = None
    solicitation_number: str | None = None
    agency: str | None = None
    notice_type: str | None = None
    posted_date: str | None = None
    response_deadline: str | None = None
    naics_code: str | None = None
    set_aside: str | None = None
    ui_link: str | None = None
