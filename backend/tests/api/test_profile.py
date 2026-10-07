import pytest
import json
import aiosqlite
from backend.app.main import redis_client

@pytest.mark.asyncio
async def test_get_profile_default(authenticated_client):
    res = await authenticated_client.get("/profile")
    assert res.status_code == 200
    assert res.json() == {}

@pytest.mark.asyncio
async def test_save_and_get_profile(authenticated_client):
    profile_data = {
        "favorite_players": ["Virat Kohli", "MS Dhoni"],
        "favorite_teams": ["India", "CSK"],
        "expertise_level": "Expert",
        "preferred_format": ["T20", "ODI"],
        "rival_teams": ["Australia"],
        "verbosity_level": "Detailed"
    }
    # Save
    res = await authenticated_client.post("/profile", json=profile_data)
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    
    # Get
    res2 = await authenticated_client.get("/profile")
    assert res2.status_code == 200
    data = res2.json()
    assert data["favorite_players"] == ["Virat Kohli", "MS Dhoni"]
    assert data["expertise_level"] == "Expert"

@pytest.mark.asyncio
async def test_update_profile_details(authenticated_client):
    # Patch display_name
    update_data = {
        "display_name": "Updated Test User",
        "avatar": "/avatars/avatar_2.png"
    }
    res = await authenticated_client.patch("/auth/me", json=update_data)
    assert res.status_code == 200
    
    # Verify in auth/me
    res2 = await authenticated_client.get("/auth/me")
    assert res2.status_code == 200
    data = res2.json()
    assert data["display_name"] == "Updated Test User"
    assert data["avatar"] == "/avatars/avatar_2.png"

@pytest.mark.asyncio
async def test_remove_profile_item(authenticated_client):
    profile_data = {
        "favorite_players": ["Virat Kohli", "MS Dhoni"],
        "favorite_teams": ["India"]
    }
    await authenticated_client.post("/profile", json=profile_data)
    
    # Remove one player
    res = await authenticated_client.delete("/profile/item?category=favorite_players&item=Virat Kohli")
    assert res.status_code == 200
    
    # Get profile and verify
    res2 = await authenticated_client.get("/profile")
    data = res2.json()
    assert "Virat Kohli" not in data.get("favorite_players", [])
    assert "MS Dhoni" in data.get("favorite_players", [])

@pytest.mark.asyncio
async def test_clear_profile(authenticated_client):
    profile_data = {
        "favorite_players": ["Virat Kohli"]
    }
    await authenticated_client.post("/profile", json=profile_data)
    
    # Clear profile
    res = await authenticated_client.delete("/profile/clear")
    assert res.status_code == 200
    
    # Get and assert empty
    res2 = await authenticated_client.get("/profile")
    assert res2.json() == {}

@pytest.mark.asyncio
async def test_get_limits_free_plan(authenticated_client):
    res = await authenticated_client.get("/limits?local_date=2026-07-14")
    assert res.status_code == 200
    data = res.json()
    assert data["plan"] == "free"
    assert data["limit"] == 100
    assert data["remaining"] == 100
