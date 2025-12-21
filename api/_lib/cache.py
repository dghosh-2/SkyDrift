from cachetools import TTLCache
from typing import Any, Optional
import asyncio
from functools import wraps

# Global caches with different TTLs
_caches: dict[str, TTLCache] = {
    "balloons": TTLCache(maxsize=100, ttl=300),      # 5 minutes
    "fires": TTLCache(maxsize=10, ttl=900),          # 15 minutes
    "storms": TTLCache(maxsize=10, ttl=600),         # 10 minutes
    "weather": TTLCache(maxsize=500, ttl=600),       # 10 minutes
    "wind": TTLCache(maxsize=10, ttl=900),           # 15 minutes
}


def get_cache(cache_name: str) -> TTLCache:
    """Get a specific cache by name."""
    if cache_name not in _caches:
        _caches[cache_name] = TTLCache(maxsize=100, ttl=300)
    return _caches[cache_name]


def clear_cache(cache_name: Optional[str] = None) -> None:
    """Clear a specific cache or all caches."""
    if cache_name:
        if cache_name in _caches:
            _caches[cache_name].clear()
    else:
        for cache in _caches.values():
            cache.clear()


def cache_with_ttl(cache_name: str):
    """Decorator to cache async function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_cache(cache_name)
            # Create a cache key from function name and arguments
            key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            if key in cache:
                return cache[key]
            
            result = await func(*args, **kwargs)
            cache[key] = result
            return result
        return wrapper
    return decorator

