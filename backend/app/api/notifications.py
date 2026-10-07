from fastapi import APIRouter, Depends
from backend.app.schemas.notification_schemas import NotifyRequest, MarkReadRequest
from backend.app.services.notification_service import NotificationService
from backend.app.core.security import get_current_user

router = APIRouter()
notification_service = NotificationService()

@router.get("/notifications")
async def get_notifications(username: str = Depends(get_current_user)):
    """Return all unread notifications for the current user (broadcast + personal)."""
    return await notification_service.get_notifications(username)

@router.post("/notifications/mark-read")
async def mark_notifications_read(req: MarkReadRequest, username: str = Depends(get_current_user)):
    """Mark a list of notification IDs as read for the current user."""
    return await notification_service.mark_notifications_read(req.ids, username)

@router.post("/admin/notify/broadcast")
async def admin_broadcast_notification(req: NotifyRequest, username: str = Depends(get_current_user)):
    """Send a notification to ALL users (username=NULL means broadcast)."""
    return await notification_service.broadcast_notification(req, username)

@router.post("/admin/notify/user/{target_username}")
async def admin_notify_user(target_username: str, req: NotifyRequest, username: str = Depends(get_current_user)):
    """Send a notification to a specific user only."""
    return await notification_service.notify_user(target_username, req, username)

@router.get("/admin/notify/list")
async def admin_list_notifications(username: str = Depends(get_current_user)):
    """List all notifications ever sent (creator view)."""
    return await notification_service.list_notifications(username)

@router.delete("/admin/notify/{notif_id}")
async def admin_delete_notification(notif_id: str, username: str = Depends(get_current_user)):
    """Delete a notification by ID (removes it for everyone)."""
    return await notification_service.delete_notification(notif_id, username)
