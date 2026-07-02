"""Tiny TTL cache for upstream responses (async-safe enough for one worker;
run multiple workers behind a shared cache like Redis if you scale out)."""
import hashlib
import json
from typing import Any

from cachetools import TTLCache

from .config import get_settings

_settings = get_settings()
_general = TTLCache(maxsize=_settings.cache_max_entries, ttl=_settings.cache_ttl_seconds)
_recompete = TTLCache(maxsize=256, ttl=_settings.recompete_cache_ttl_seconds)


def _key(namespace: str, payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return namespace + ":" + hashlib.sha256(raw.encode()).hexdigest()


def get(namespace: str, payload: Any, *, recompete: bool = False):
    store = _recompete if recompete else _general
    return store.get(_key(namespace, payload))


def put(namespace: str, payload: Any, value: Any, *, recompete: bool = False) -> None:
    store = _recompete if recompete else _general
    store[_key(namespace, payload)] = value
