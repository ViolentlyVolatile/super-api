import os

# Keep CI/sandbox proxy settings from leaking into mocked httpx transports.
for _v in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
    os.environ.pop(_v, None)

os.environ["FCI_API_KEYS"] = "test-key-1,test-key-2"
os.environ["FCI_RAPIDAPI_PROXY_SECRET"] = "rapid-secret"
os.environ["FCI_SAM_API_KEY"] = "sam-test-key"
os.environ["FCI_DEMO_MODE"] = "false"
os.environ["FCI_RATE_LIMIT_PER_MINUTE"] = "1000"
os.environ["FCI_RECOMPETE_PREWARM"] = "false"  # no real upstream calls from tests

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

AUTH = {"X-API-Key": "test-key-1"}


@pytest.fixture()
def client():
    return TestClient(create_app())


@pytest.fixture(autouse=True)
def clear_caches():
    from app import cache
    cache._general.clear()
    cache._recompete.clear()
    yield
