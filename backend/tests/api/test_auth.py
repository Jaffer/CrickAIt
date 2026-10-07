import pytest
import aiosqlite
from backend.app.main import hash_password

@pytest.mark.asyncio
async def test_register_success(client):
    payload = {
        "username": "newuser",
        "email": "newuser@gmail.com",
        "password": "Password123!",
        "turnstile_token": "mock_token"
    }
    res = await client.post("/auth/register", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["username"] == "newuser"
    assert data["display_name"] == "newuser"

@pytest.mark.asyncio
async def test_register_duplicate(client):
    payload = {
        "username": "dupuser",
        "email": "dupuser@gmail.com",
        "password": "Password123!",
        "turnstile_token": "mock_token"
    }
    # First time registration
    res1 = await client.post("/auth/register", json=payload)
    assert res1.status_code == 200
    
    # Duplicate username registration
    res2 = await client.post("/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already taken" in res2.json()["detail"]

@pytest.mark.asyncio
async def test_register_invalid_inputs(client):
    # Short password
    payload = {
        "username": "baduser",
        "email": "baduser@gmail.com",
        "password": "123",
        "turnstile_token": "mock_token"
    }
    res = await client.post("/auth/register", json=payload)
    assert res.status_code == 400
    assert "at least 8 characters" in res.json()["detail"]

@pytest.mark.asyncio
async def test_login_success(client):
    # Setup user
    username = "loginuser"
    email = "loginuser@gmail.com"
    password = "Password123!"
    
    async with aiosqlite.connect("data/sqlite/test_checkpoints.db") as conn:
        pwd_hash = hash_password(password)
        await conn.execute(
            "INSERT OR IGNORE INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, ?, 'local', ?, 'free')",
            (username, email, pwd_hash, username)
        )
        await conn.commit()
        
    payload = {
        "username": username,
        "password": password,
        "turnstile_token": "mock_token"
    }
    res = await client.post("/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["username"] == username

@pytest.mark.asyncio
async def test_login_invalid_password(client):
    payload = {
        "username": "loginuser",
        "password": "wrongpassword",
        "turnstile_token": "mock_token"
    }
    res = await client.post("/auth/login", json=payload)
    assert res.status_code == 400
    assert "Invalid username or password" in res.json()["detail"]

@pytest.mark.asyncio
async def test_google_login(client):
    payload = {
        "email": "googleuser@gmail.com",
        "display_name": "Google User"
    }
    res = await client.post("/auth/google", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["username"] == "googleuser"

@pytest.mark.asyncio
async def test_guest_login(client):
    payload = {
        "device_id": "device123"
    }
    res = await client.post("/auth/guest", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["username"] == "guest_device123"
    assert data["display_name"] == "Guest User"

@pytest.mark.asyncio
async def test_auth_me_authenticated(authenticated_client):
    res = await authenticated_client.get("/auth/me")
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "testuser"
    assert data["email"] == "testuser@gmail.com"

@pytest.mark.asyncio
async def test_auth_me_unauthorized(client):
    res = await client.get("/auth/me")
    assert res.status_code == 401
    assert "missing or invalid" in res.json()["detail"]

@pytest.mark.asyncio
async def test_logout(authenticated_client):
    # Logout
    res = await authenticated_client.post("/auth/logout")
    assert res.status_code == 200
    
    # ME endpoint should now fail
    res2 = await authenticated_client.get("/auth/me")
    assert res2.status_code == 401

@pytest.mark.asyncio
async def test_forgot_password_and_reset(client):
    email = "resetuser@gmail.com"
    username = "resetuser"
    
    # 1. Setup user in DB
    async with aiosqlite.connect("data/sqlite/test_checkpoints.db") as conn:
        pwd_hash = hash_password("OldPassword1!")
        await conn.execute(
            "INSERT OR IGNORE INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, ?, 'local', ?, 'free')",
            (username, email, pwd_hash, username)
        )
        await conn.commit()
        
    # 2. Request OTP
    res = await client.post("/auth/forgot-password", json={"email": email})
    assert res.status_code == 200
    
    # 3. Retrieve OTP directly from DB for verification since SMTP is mocked
    async with aiosqlite.connect("data/sqlite/test_checkpoints.db") as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT otp FROM password_resets WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1", (email,)) as c:
            row = await c.fetchone()
            otp = row["otp"]
            
    # 4. Verify OTP
    res2 = await client.post("/auth/verify-otp", json={"email": email, "otp": otp})
    assert res2.status_code == 200
    
    # 5. Reset password
    reset_payload = {
        "email": email,
        "otp": otp,
        "new_password": "NewPassword123!"
    }
    res3 = await client.post("/auth/reset-password", json=reset_payload)
    assert res3.status_code == 200
    
    # 6. Verify login with new password
    login_payload = {
        "username": username,
        "password": "NewPassword123!",
        "turnstile_token": "mock_token"
    }
    res4 = await client.post("/auth/login", json=login_payload)
    assert res4.status_code == 200
