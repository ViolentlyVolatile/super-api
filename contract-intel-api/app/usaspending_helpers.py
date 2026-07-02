"""Translate our public request models into USAspending v2 filter payloads,
and normalize its rows into our stable response shape."""
from datetime import date

from .models import AWARD_TYPE_CONTRACTS, Award

FIELDS = [
    "Award ID",
    "Recipient Name",
    "Description",
    "Award Amount",
    "Start Date",
    "End Date",
    "Awarding Agency",
    "Awarding Sub Agency",
    "NAICS",
    "PSC",
    "generated_internal_id",
]

_DEFAULT_LOOKBACK_START = "2007-10-01"  # USAspending requires a time_period


def build_filters(
    *,
    keywords: list[str] | None = None,
    naics_codes: list[str] | None = None,
    psc_codes: list[str] | None = None,
    agency: str | None = None,
    recipient_search_text: str | None = None,
    start_date: date | str | None = None,
    end_date: date | str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
) -> dict:
    f: dict = {
        "award_type_codes": AWARD_TYPE_CONTRACTS,
        "time_period": [
            {
                "start_date": str(start_date) if start_date else _DEFAULT_LOOKBACK_START,
                "end_date": str(end_date) if end_date else str(date.today()),
            }
        ],
    }
    if keywords:
        f["keywords"] = keywords
    if naics_codes:
        f["naics_codes"] = naics_codes
    if psc_codes:
        f["psc_codes"] = psc_codes
    if agency:
        f["agencies"] = [{"type": "awarding", "tier": "toptier", "name": agency}]
    if recipient_search_text:
        f["recipient_search_text"] = [recipient_search_text]
    if min_amount is not None or max_amount is not None:
        bound: dict = {}
        if min_amount is not None:
            bound["lower_bound"] = min_amount
        if max_amount is not None:
            bound["upper_bound"] = max_amount
        f["award_amounts"] = [bound]
    return f


def normalize_award(row: dict) -> Award:
    return Award(
        award_id=row.get("Award ID"),
        internal_id=row.get("generated_internal_id"),
        recipient_name=row.get("Recipient Name"),
        description=row.get("Description"),
        amount=row.get("Award Amount"),
        start_date=row.get("Start Date"),
        end_date=row.get("End Date"),
        awarding_agency=row.get("Awarding Agency"),
        awarding_sub_agency=row.get("Awarding Sub Agency"),
        naics=_code(row.get("NAICS")),
        psc=_code(row.get("PSC")),
    )


def _code(value) -> str | None:
    """USAspending sometimes returns {'code':..,'description':..} for NAICS/PSC."""
    if isinstance(value, dict):
        return value.get("code")
    return value
