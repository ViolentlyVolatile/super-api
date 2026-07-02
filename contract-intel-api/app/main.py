"""Federal Contract Intelligence API.

Unified, developer-friendly access to US federal contracting data:
awards, live opportunities, spending analytics, and recompete forecasting.
Sources: USAspending.gov and SAM.gov (public domain US government data).
"""
from fastapi import FastAPI

from .config import get_settings
from .routers import analytics, awards, opportunities, recompetes

DESCRIPTION = """
Search **$700B+/year** of US federal contract activity through one clean JSON API.

| Capability | Endpoint |
|---|---|
| Contract award search | `POST /v1/awards/search` |
| Full award detail | `GET /v1/awards/{internal_id}` |
| Live solicitations | `GET /v1/opportunities/search` |
| Spending analytics | `POST /v1/analytics/spending` |
| **Recompete Radar** — contracts expiring soon | `POST /v1/recompetes/search` |

Authenticate with the `X-API-Key` header (or subscribe via RapidAPI).
All underlying data is public-domain US government data.
"""


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title=s.app_name,
        version=s.app_version,
        description=DESCRIPTION,
        contact={"name": "NexMath", "email": "karan@nexmath.com"},
        license_info={"name": "Data: US public domain; Service: commercial"},
    )
    app.include_router(awards.router)
    app.include_router(recompetes.router)
    app.include_router(analytics.router)
    app.include_router(opportunities.router)

    @app.get("/health", tags=["Meta"], summary="Liveness probe (no auth)")
    async def health() -> dict:
        return {
            "status": "ok",
            "version": s.app_version,
            "sam_gov_configured": bool(s.sam_api_key),
        }

    return app


app = create_app()
