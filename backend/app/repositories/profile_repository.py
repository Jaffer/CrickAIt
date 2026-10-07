from typing import Optional
from backend.app.core.database import DatabaseProvider

class ProfileRepository:
    def __init__(self, db_provider: Optional[DatabaseProvider] = None):
        self.db_provider = db_provider or DatabaseProvider()

    async def get_user_plan(self, username: str) -> str:
        try:
            async with self.db_provider.get_db() as conn:
                row = await conn.fetchrow("SELECT plan FROM users WHERE username = $1", username)
                return row['plan'] if row else 'free'
        except Exception:
            return 'free'
