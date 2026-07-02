"""Application configuration via environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Service identity ---
    app_name: str = "Federal Contract Intelligence API"
    app_version: str = "1.0.0"

    # --- Auth ---
    # Comma-separated list of valid API keys for direct customers.
    api_keys: str = ""
    # Secret RapidAPI injects on every proxied request (X-RapidAPI-Proxy-Secret).
    # When set, requests carrying this header bypass the api_keys check because
    # RapidAPI has already authenticated and metered the caller.
    rapidapi_proxy_secret: str = ""
    # When true, no auth required (local dev / demo sandbox only).
    demo_mode: bool = False

    # --- Rate limiting (per API key, sliding minute window) ---
    rate_limit_per_minute: int = 120

    # --- Upstream: USAspending (no key required) ---
    usaspending_base_url: str = "https://api.usaspending.gov/api/v2"

    # --- Upstream: SAM.gov (key required; free at sam.gov account page) ---
    sam_base_url: str = "https://api.sam.gov"
    sam_api_key: str = ""

    # --- Caching ---
    cache_ttl_seconds: int = 900          # general upstream responses
    recompete_cache_ttl_seconds: int = 21600  # recompete scans are expensive; 6h
    cache_max_entries: int = 2048

    # --- Recompete scan tuning ---
    recompete_scan_pages: int = 5   # upstream pages (100 rows each) scanned per query
    upstream_timeout_seconds: float = 30.0

    model_config = {"env_prefix": "FCI_", "env_file": ".env", "extra": "ignore"}

    @property
    def api_key_set(self) -> set[str]:
        return {k.strip() for k in self.api_keys.split(",") if k.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
