from typing import Optional, List, Dict, Any
from backend.app.core.database import DatabaseProvider
import json

class UserRepository:
    def __init__(self, db_provider: Optional[DatabaseProvider] = None):
        self.db_provider = db_provider or DatabaseProvider()

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        async with self.db_provider.get_db() as conn:
            row = await conn.fetchrow("SELECT * FROM users WHERE username = $1", username)
            return dict(row) if row else None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        async with self.db_provider.get_db() as conn:
            row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
            return dict(row) if row else None

    async def get_user_by_username_or_email(self, username_or_email: str) -> Optional[Dict[str, Any]]:
        async with self.db_provider.get_db() as conn:
            row = await conn.fetchrow("SELECT * FROM users WHERE username = $1 OR email = $2", username_or_email, username_or_email)
            return dict(row) if row else None

    async def create_user(self, username: str, email: str, password_hash: Optional[str], auth_provider: str, display_name: str, plan: str) -> None:
        async with self.db_provider.get_db() as conn:
            await conn.execute(
                "INSERT INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES ($1, $2, $3, $4, $5, $6)",
                username, email, password_hash, auth_provider, display_name, plan
            )

    async def restore_user(self, username: str, email: str, password_hash: Optional[str], auth_provider: str, display_name: str, plan: str, avatar: Optional[str]) -> None:
        async with self.db_provider.get_db() as conn:
            await conn.execute(
                "INSERT INTO users (username, email, password_hash, auth_provider, display_name, plan, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (username) DO NOTHING",
                username, email, password_hash, auth_provider, display_name, plan, avatar
            )

    async def update_user_profile(self, username: str, display_name: Optional[str], avatar: Optional[str]) -> None:
        async with self.db_provider.get_db() as conn:
            update_fields = []
            params = []
            param_idx = 1
            if display_name is not None:
                update_fields.append(f"display_name = ${param_idx}")
                params.append(display_name.strip())
                param_idx += 1
            if avatar is not None:
                update_fields.append(f"avatar = ${param_idx}")
                params.append(avatar)
                param_idx += 1
            
            if not update_fields:
                return
            
            params.append(username)
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE username = ${param_idx}"
            await conn.execute(query, *params)

    async def update_user_password(self, email_or_username: str, new_password_hash: str, is_email: bool = True) -> None:
        async with self.db_provider.get_db() as conn:
            if is_email:
                await conn.execute("UPDATE users SET password_hash = $1 WHERE email = $2", new_password_hash, email_or_username)
            else:
                await conn.execute("UPDATE users SET password_hash = $1 WHERE username = $2", new_password_hash, email_or_username)

    async def delete_user(self, username: str) -> None:
        async with self.db_provider.get_db() as conn:
            await conn.execute("DELETE FROM users WHERE username = $1", username)
            pattern = f"{username}:%"
            await conn.execute("DELETE FROM checkpoints WHERE thread_id LIKE $1", pattern)
            await conn.execute("DELETE FROM writes WHERE thread_id LIKE $1", pattern)

    async def invalidate_password_resets(self, email: str) -> None:
        async with self.db_provider.get_db() as conn:
            await conn.execute("UPDATE password_resets SET used = 1 WHERE email = $1 AND used = 0", email)

    async def create_password_reset(self, email: str, otp: str, expires_at: str) -> None:
        # expires_at is passed as string in SQLite, in PG we should pass it as datetime, but assuming it matches column type
        async with self.db_provider.get_db() as conn:
            await conn.execute(
                "INSERT INTO password_resets (email, otp, expires_at) VALUES ($1, $2, $3)",
                email, otp, expires_at
            )

    async def get_unused_password_reset(self, email: str, otp: str) -> Optional[Dict[str, Any]]:
        async with self.db_provider.get_db() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM password_resets WHERE email = $1 AND otp = $2 AND used = 0 ORDER BY id DESC LIMIT 1",
                email, otp
            )
            return dict(row) if row else None

    async def mark_password_reset_used(self, reset_id: int) -> None:
        async with self.db_provider.get_db() as conn:
            await conn.execute("UPDATE password_resets SET used = 1 WHERE id = $1", reset_id)

    async def list_users(self) -> List[Dict[str, Any]]:
        async with self.db_provider.get_db() as conn:
            rows = await conn.fetch("SELECT username, email, auth_provider, plan, created_at FROM users")
            return [dict(r) for r in rows]

    async def upgrade_user_plan(self, username: str, plan: str) -> None:
        async with self.db_provider.get_db() as conn:
            await conn.execute("UPDATE users SET plan = $1 WHERE username = $2", plan, username)
