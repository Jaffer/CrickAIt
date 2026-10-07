import asyncpg
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from backend.app.config.settings import settings

class DatabaseProvider:
    _pool: asyncpg.Pool = None

    @classmethod
    async def initialize(cls):
        if cls._pool is None:
            cls._pool = await asyncpg.create_pool(settings.DATABASE_URL)

    @classmethod
    async def close(cls):
        if cls._pool is not None:
            await cls._pool.close()
            cls._pool = None

    @asynccontextmanager
    async def get_db(self) -> AsyncGenerator[asyncpg.Connection, None]:
        if self._pool is None:
            raise RuntimeError("Database pool not initialized")
        async with self._pool.acquire() as conn:
            yield conn
