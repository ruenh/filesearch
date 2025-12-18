"""Redis cache utility functions."""
import json
import functools
from typing import Any, Optional, Callable
import redis
from flask import current_app


class CacheManager:
    """Redis cache manager for the application."""
    
    _client: Optional[redis.Redis] = None
    
    @classmethod
    def get_client(cls) -> Optional[redis.Redis]:
        """Get or create Redis client."""
        if cls._client is None:
            try:
                redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
                cls._client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                cls._client.ping()
            except (redis.ConnectionError, redis.RedisError) as e:
                current_app.logger.warning(f"Redis connection failed: {e}. Caching disabled.")
                cls._client = None
        return cls._client
    
    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """Get value from cache."""
        client = cls.get_client()
        if client is None:
            return None
        try:
            value = client.get(key)
            if value:
                return json.loads(value)
            return None
        except (redis.RedisError, json.JSONDecodeError) as e:
            current_app.logger.error(f"Cache get error: {e}")
            return None
    
    @classmethod
    def set(cls, key: str, value: Any, timeout: Optional[int] = None) -> bool:
        """Set value in cache."""
        client = cls.get_client()
        if client is None:
            return False
        try:
            if timeout is None:
                timeout = current_app.config.get('CACHE_DEFAULT_TIMEOUT', 300)
            serialized = json.dumps(value)
            client.setex(key, timeout, serialized)
            return True
        except (redis.RedisError, TypeError) as e:
            current_app.logger.error(f"Cache set error: {e}")
            return False

    @classmethod
    def delete(cls, key: str) -> bool:
        """Delete value from cache."""
        client = cls.get_client()
        if client is None:
            return False
        try:
            client.delete(key)
            return True
        except redis.RedisError as e:
            current_app.logger.error(f"Cache delete error: {e}")
            return False
    
    @classmethod
    def delete_pattern(cls, pattern: str) -> bool:
        """Delete all keys matching pattern."""
        client = cls.get_client()
        if client is None:
            return False
        try:
            keys = client.keys(pattern)
            if keys:
                client.delete(*keys)
            return True
        except redis.RedisError as e:
            current_app.logger.error(f"Cache delete pattern error: {e}")
            return False
    
    @classmethod
    def clear(cls) -> bool:
        """Clear all cache."""
        client = cls.get_client()
        if client is None:
            return False
        try:
            client.flushdb()
            return True
        except redis.RedisError as e:
            current_app.logger.error(f"Cache clear error: {e}")
            return False


def cached(key_prefix: str, timeout: Optional[int] = None):
    """Decorator for caching function results.
    
    Args:
        key_prefix: Prefix for cache key
        timeout: Cache timeout in seconds (default: CACHE_DEFAULT_TIMEOUT)
    
    Usage:
        @cached('search_results', timeout=300)
        def search(query, storage_id):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from function arguments
            key_parts = [key_prefix]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(key_parts)
            
            # Try to get from cache
            cached_value = CacheManager.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            CacheManager.set(cache_key, result, timeout)
            return result
        return wrapper
    return decorator


def invalidate_cache(pattern: str):
    """Decorator to invalidate cache after function execution.
    
    Args:
        pattern: Cache key pattern to invalidate (supports wildcards)
    
    Usage:
        @invalidate_cache('search_results:*')
        def update_document(doc_id, data):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            CacheManager.delete_pattern(pattern)
            return result
        return wrapper
    return decorator
