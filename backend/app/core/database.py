import asyncpg
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from backend.app.config.settings import settings

class DatabaseProvider:
    _pool: asyncpg.Pool = None

    @classmethod
    async def initialize(cls):
        if cls._pool is None:
            db_url = settings.DATABASE_URL
            if db_url.startswith("postgres://"):
                db_url = db_url.replace("postgres://", "postgresql://", 1)
            cls._pool = await asyncpg.create_pool(db_url)

    @classmethod
    async def close(cls):
        if cls._pool is not None:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    @asynccontextmanager
    async def get_db(cls) -> AsyncGenerator[asyncpg.Connection, None]:
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized")
        async with cls._pool.acquire() as conn:
            yield conn
