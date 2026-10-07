import pytest
import aiosqlite

@pytest.mark.asyncio
async def test_admin_endpoints_authorization_failure(client, authenticated_client):
    # Standard user trying to access admin endpoints should fail
    res = await authenticated_client.get("/admin/users")
    assert res.status_code == 403
    assert "Admin access only" in res.json()["detail"]

    # Upgrade request
    payload = {"username": "testuser", "plan": "pro"}
    res2 = await authenticated_client.post("/admin/upgrade-user", json=payload)
    assert res2.status_code == 403
    assert "Admin access only" in res2.json()["detail"]

    # Broadcast notification
    notif_payload = {
        "title": "Admin Broadcast",
        "message": "This is a broadcast message.",
        "type": "update"
    }
    res3 = await authenticated_client.post("/admin/notify/broadcast", json=notif_payload)
    assert res3.status_code == 403
    assert "Creator access only" in res3.json()["detail"]

@pytest.mark.asyncio
async def test_admin_lifecycle_and_broadcast_success(client):
    # 1. Log in as creator (iamthecreator)
    # Creator has the password seeded on database startup: "creatorspassword@118121"
    login_payload = {
        "username": "iamthecreator",
        "password": "creatorspassword@118121",
        "turnstile_token": "mock_token"
    }
    
    res = await client.post("/auth/login", json=login_payload)
    assert res.status_code == 200
    token = res.json()["token"]
    
    # Configure headers
    admin_headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get list of users
    res2 = await client.get("/admin/users", headers=admin_headers)
    assert res2.status_code == 200
    users = res2.json()["users"]
    assert len(users) > 0
    assert any(u["username"] == "iamthecreator" for u in users)
    
    # 3. Create target user to upgrade
    username_to_upgrade = "freeuser"
    email_to_upgrade = "freeuser@gmail.com"
    from backend.app.main import hash_password
    async with aiosqlite.connect("data/sqlite/test_checkpoints.db") as conn:
        pwd_hash = hash_password("Password123!")
        await conn.execute(
            "INSERT OR IGNORE INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, ?, 'local', ?, 'free')",
            (username_to_upgrade, email_to_upgrade, pwd_hash, username_to_upgrade)
        )
        await conn.commit()
        
    # 4. Upgrade target user to pro
    upgrade_payload = {"username": username_to_upgrade, "plan": "pro"}
    res3 = await client.post("/admin/upgrade-user", json=upgrade_payload, headers=admin_headers)
    assert res3.status_code == 200
    assert res3.json()["status"] == "success"
    
    # Verify upgraded status in database
    async with aiosqlite.connect("data/sqlite/test_checkpoints.db") as conn:
        async with conn.execute("SELECT plan FROM users WHERE username = ?", (username_to_upgrade,)) as cursor:
            row = await cursor.fetchone()
            assert row[0] == "pro"
            
    # 5. Broadcast system alert notification
    broadcast_payload = {
        "title": "Major Update v2.0",
        "message": "CrickAIt has successfully migrated to the new backend layout!",
        "type": "update",
        "expires_days": 10
    }
    res4 = await client.post("/admin/notify/broadcast", json=broadcast_payload, headers=admin_headers)
    assert res4.status_code == 200
    assert res4.json()["status"] == "sent"
    assert res4.json()["audience"] == "all_users"
    
    # 6. List admin notifications
    res5 = await client.get("/admin/notify/list", headers=admin_headers)
    assert res5.status_code == 200
    notifications = res5.json()["notifications"]
    assert any(n["title"] == "Major Update v2.0" for n in notifications)
    
    # 7. Delete admin notification
    notif_id = res4.json()["id"]
    res6 = await client.delete(f"/admin/notify/{notif_id}", headers=admin_headers)
    assert res6.status_code == 200
    assert res6.json()["status"] == "deleted"
