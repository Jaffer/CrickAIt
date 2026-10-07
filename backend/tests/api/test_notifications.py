import pytest
import aiosqlite

@pytest.mark.asyncio
async def test_get_notifications_unread_broadcast(authenticated_client):
    # Register a broadcast notification directly in DB
    async with aiosqlite.connect("data/sqlite/test_checkpoints.db") as conn:
        await conn.execute("DELETE FROM notifications")
        await conn.execute(
            "INSERT INTO notifications (id, username, title, message, type, expires_at) VALUES (?, NULL, ?, ?, 'info', NULL)",
            ("notif_b1", "System Maintenance", "Scheduled maintenance on Sunday.")
        )
        await conn.commit()
        
    res = await authenticated_client.get("/notifications")
    assert res.status_code == 200
    data = res.json()
    assert "notifications" in data
    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["id"] == "notif_b1"
    assert data["notifications"][0]["title"] == "System Maintenance"

@pytest.mark.asyncio
async def test_mark_notifications_read(authenticated_client):
    # Setup notifications
    async with aiosqlite.connect("data/sqlite/test_checkpoints.db") as conn:
        await conn.execute("DELETE FROM notifications")
        await conn.execute("DELETE FROM notification_reads")
        await conn.execute(
            "INSERT INTO notifications (id, username, title, message, type, expires_at) VALUES (?, NULL, ?, ?, 'info', NULL)",
            ("notif_read_1", "Maintenance Check", "Database backups complete.")
        )
        await conn.commit()

    # Verify unread
    res1 = await authenticated_client.get("/notifications")
    assert len(res1.json()["notifications"]) == 1

    # Mark as read
    payload = {"ids": ["notif_read_1"]}
    res2 = await authenticated_client.post("/notifications/mark-read", json=payload)
    assert res2.status_code == 200
    assert res2.json()["marked"] == 1

    # Verify no unread remaining
    res3 = await authenticated_client.get("/notifications")
    assert len(res3.json()["notifications"]) == 0
