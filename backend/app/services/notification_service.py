import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException

from backend.app.schemas.notification_schemas import NotifyRequest
from backend.app.repositories.notification_repository import NotificationRepository
from backend.app.repositories.user_repository import UserRepository
from backend.app.core.base_service import BaseService


class NotificationService(BaseService):
    def __init__(
        self,
        notif_repo: Optional[NotificationRepository] = None,
        user_repo: Optional[UserRepository] = None
    ):
        super().__init__("crickait-backend")
        self.notif_repo = notif_repo or NotificationRepository()
        self.user_repo = user_repo or UserRepository()

    def _require_creator(self, username: str):
        self.validate_condition(
            username == "iamthecreator",
            status_code=403,
            detail="Forbidden: Creator access only."
        )

    async def get_notifications(self, username: str) -> dict:
        try:
            rows = await self.notif_repo.get_user_notifications(username)
            return {"notifications": rows}
        except Exception as e:
            self.handle_error("Get notifications", e, detail="Failed to fetch notifications")

    async def mark_notifications_read(self, ids: List[str], username: str) -> dict:
        if not ids:
            return {"status": "ok"}
        try:
            await self.notif_repo.mark_notifications_as_read(username, ids)
            return {"status": "ok", "marked": len(ids)}
        except Exception as e:
            self.handle_error("Mark-read", e, detail="Failed to mark notifications read")

    async def broadcast_notification(self, req: NotifyRequest, creator_username: str) -> dict:
        self._require_creator(creator_username)
        self.validate_condition(
            req.type in ("info", "update", "alert", "promo"),
            detail="type must be one of: info, update, alert, promo"
        )
        try:
            notif_id = str(uuid.uuid4())
            expires_at = None
            if req.expires_days:
                expires_at = (datetime.utcnow() + timedelta(days=req.expires_days)).isoformat()
            await self.notif_repo.create_notification(
                notif_id=notif_id,
                username=None,
                title=req.title,
                message=req.message,
                type_str=req.type,
                expires_at=expires_at
            )
            self.logger.info("Broadcast notification sent: [%s] %s", req.type, req.title)
            return {"status": "sent", "id": notif_id, "audience": "all_users"}
        except Exception as e:
            self.handle_error("Broadcast notification", e, detail="Failed to send notification")

    async def notify_user(self, target_username: str, req: NotifyRequest, creator_username: str) -> dict:
        self._require_creator(creator_username)
        self.validate_condition(
            req.type in ("info", "update", "alert", "promo"),
            detail="type must be one of: info, update, alert, promo"
        )

        # Verify target user exists
        try:
            user = await self.user_repo.get_user_by_username(target_username)
            if not user:
                raise HTTPException(status_code=404, detail=f"User '{target_username}' not found")
        except Exception as e:
            self.handle_error("User existence check", e, detail="Failed to send notification")

        try:
            notif_id = str(uuid.uuid4())
            expires_at = None
            if req.expires_days:
                expires_at = (datetime.utcnow() + timedelta(days=req.expires_days)).isoformat()
            await self.notif_repo.create_notification(
                notif_id=notif_id,
                username=target_username,
                title=req.title,
                message=req.message,
                type_str=req.type,
                expires_at=expires_at
            )
            self.logger.info("User notification sent to %s: [%s] %s", target_username, req.type, req.title)
            return {"status": "sent", "id": notif_id, "audience": target_username}
        except Exception as e:
            self.handle_error("User notification", e, detail="Failed to send notification")

    async def list_notifications(self, creator_username: str) -> dict:
        self._require_creator(creator_username)
        try:
            rows = await self.notif_repo.get_all_notifications()
            return {"notifications": rows}
        except Exception as e:
            self.handle_error("Admin list notifications", e, detail="Failed to list notifications")

    async def delete_notification(self, notif_id: str, creator_username: str) -> dict:
        self._require_creator(creator_username)
        try:
            await self.notif_repo.delete_notification(notif_id)
            return {"status": "deleted", "id": notif_id}
        except Exception as e:
            self.handle_error("Delete notification", e, detail="Failed to delete notification")
