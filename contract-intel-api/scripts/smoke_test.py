"""Live smoke test against the REAL upstream APIs. Run this before every deploy
and after any upstream schema change (unit tests use mocks and cannot catch
upstream drift).

Usage:
    python scripts/smoke_test.py                # tests USAspending only
    FCI_SAM_API_KEY=... python scripts/smoke_test.py   # also tests SAM.gov
"""
import asyncio
import os
import sys

import httpx

USA = "https://api.usaspending.gov/api/v2"
SAM = "https://api.sam.gov"

FAILURES: list[str] = []


def check(name: str, cond: bool, extra: str = "") -> None:
    mark = "PASS" if cond else "FAIL"
    print(f"[{mark}] {name} {extra}")
    if not cond:
        FAILURES.append(name)


async def main() -> None:
    async with httpx.AsyncClient(timeout=60) as c:
        # 1. award search with the exact filter/field payload the app sends
        body = {
            "filters": {
                "award_type_codes": ["A", "B", "C", "D"],
                "time_period": [{"start_date": "2024-10-01", "end_date": "2025-09-30"}],
                "agencies": [{"type": "awarding", "tier": "toptier", "name": "Department of Defense"}],
                "naics_codes": ["336411"],
            },
            "fields": [
                "Award ID", "Recipient Name", "Description", "Award Amount",
                "Start Date", "End Date", "Awarding Agency", "Awarding Sub Agency",
                "NAICS", "PSC", "generated_internal_id",
            ],
            "sort": "Award Amount", "order": "desc", "limit": 3, "page": 1,
        }
        r = await c.post(f"{USA}/search/spending_by_award/", json=body)
        ok = r.status_code == 200 and r.json().get("results")
        check("USAspending spending_by_award", bool(ok), f"(HTTP {r.status_code})")
        internal_id = None
        if ok:
            row = r.json()["results"][0]
            check("  field: Award ID present", "Award ID" in row)
            check("  field: End Date present", "End Date" in row)
            internal_id = row.get("generated_internal_id")

        # 2. sort by End Date desc (recompete scan depends on this)
        body2 = {**body, "sort": "End Date", "order": "desc", "limit": 3}
        r = await c.post(f"{USA}/search/spending_by_award/", json=body2)
        check("USAspending sort by End Date", r.status_code == 200, f"(HTTP {r.status_code})")

        # 3. award detail
        if internal_id:
            r = await c.get(f"{USA}/awards/{internal_id}/")
            check("USAspending award detail", r.status_code == 200, f"(HTTP {r.status_code})")

        # 4. spending_by_category
        r = await c.post(
            f"{USA}/search/spending_by_category/naics/",
            json={"filters": body["filters"], "limit": 5, "page": 1},
        )
        check("USAspending spending_by_category/naics", r.status_code == 200, f"(HTTP {r.status_code})")

        # 5. SAM.gov opportunities (optional)
        sam_key = os.environ.get("FCI_SAM_API_KEY", "")
        if sam_key:
            r = await c.get(
                f"{SAM}/opportunities/v2/search",
                params={
                    "api_key": sam_key, "postedFrom": "06/01/2026",
                    "postedTo": "07/01/2026", "limit": 1, "offset": 0,
                },
            )
            ok = r.status_code == 200 and "opportunitiesData" in r.json()
            check("SAM.gov opportunities search", bool(ok), f"(HTTP {r.status_code})")
        else:
            print("[SKIP] SAM.gov (set FCI_SAM_API_KEY to test)")

    if FAILURES:
        print(f"\n{len(FAILURES)} check(s) failed: {FAILURES}")
        sys.exit(1)
    print("\nAll live smoke checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
