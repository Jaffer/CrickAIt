from typing import Optional, List, Dict, Any
from backend.app.core.database import DatabaseProvider

class NotificationRepository:
    def __init__(self, db_provider: Optional[DatabaseProvider] = None):
        self.db_provider = db_provider or DatabaseProvider()

    async def get_user_notifications(self, username: str) -> List[Dict[str, Any]]:
        async with self.db_provider.get_db() as conn:
            rows = await conn.fetch(
                """
                SELECT n.id, n.title, n.message, n.type, n.created_at
                FROM notifications n
                WHERE (n.username = $1 OR n.username IS NULL)
                  AND n.id NOT IN (
                      SELECT notif_id FROM notification_reads WHERE username = $2
                  )
                  AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
                ORDER BY n.created_at DESC
                LIMIT 50
                """,
                username, username
            )
            return [dict(r) for r in rows]

    async def mark_notifications_as_read(self, username: str, notif_ids: List[str]) -> None:
        async with self.db_provider.get_db() as conn:
            await conn.executemany(
                "INSERT INTO notification_reads (username, notif_id) VALUES ($1, $2) ON CONFLICT (username, notif_id) DO NOTHING",
                [(username, nid) for nid in notif_ids]
            )

    async def create_notification(
        self,
        notif_id: str,
        username: Optional[str],
        title: str,
        message: str,
        type_str: str,
        expires_at: Optional[str]
    ) -> None:
        async with self.db_provider.get_db() as conn:
            # Note: in postgres expires_at needs to be a timestamp or NULL
            await conn.execute(
                "INSERT INTO notifications (id, username, title, message, type, expires_at) VALUES ($1, $2, $3, $4, $5, $6)",
                notif_id, username, title, message, type_str, expires_at
            )

    async def get_all_notifications(self) -> List[Dict[str, Any]]:
        async with self.db_provider.get_db() as conn:
            rows = await conn.fetch(
                "SELECT id, username, title, message, type, created_at, expires_at FROM notifications ORDER BY created_at DESC"
            )
            return [dict(r) for r in rows]

    async def delete_notification(self, notif_id: str) -> None:
        async with self.db_provider.get_db() as conn:
            await conn.execute("DELETE FROM notification_reads WHERE notif_id = $1", notif_id)
            await conn.execute("DELETE FROM notifications WHERE id = $1", notif_id)
