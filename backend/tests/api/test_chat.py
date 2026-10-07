import pytest
import aiosqlite
from langchain_core.messages import AIMessage
from backend.app.main import redis_client

@pytest.mark.asyncio
async def test_ask_simple_route_success(authenticated_client, mock_llm_responses):
    # Mock routing node to reply simple
    router_res = AIMessage(content="SIMPLE")
    mock_llm_responses["fast_router_llm"].ainvoke.return_value = router_res
    
    # Mock simple node response
    simple_res = AIMessage(content="Mock response: India's next match is tomorrow.")
    mock_llm_responses["fast_router_llm"].ainvoke.side_effect = [router_res, simple_res]
    
    params = {
        "user_prompt": "When is India's next match?",
        "session_id": "test_session_1",
        "lang": "English (UK)",
        "local_date": "2026-07-14"
    }
    
    res = await authenticated_client.post("/ask", params=params)
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert data["response"] == "Mock response: India's next match is tomorrow."
    assert data["session_id"] == "test_session_1"
    assert data["route"] == "SIMPLE"

@pytest.mark.asyncio
async def test_ask_expert_route_success(authenticated_client, mock_llm_responses):
    # Mock routing node to reply EXPERT
    router_res = AIMessage(content="EXPERT")
    mock_llm_responses["fast_router_llm"].ainvoke.return_value = router_res
    
    # Mock expert node response
    expert_res = AIMessage(content="Expert analysis of India's match.")
    mock_llm_responses["expert_llm_with_tools"].ainvoke.return_value = expert_res
    
    params = {
        "user_prompt": "Analyze India's batting line-up",
        "session_id": "test_session_1",
        "lang": "English (UK)",
        "local_date": "2026-07-14"
    }
    
    res = await authenticated_client.post("/ask", params=params)
    assert res.status_code == 200
    data = res.json()
    assert data["response"] == "Expert analysis of India's match."
    assert data["route"] == "EXPERT"

@pytest.mark.asyncio
async def test_session_history_and_deletion(authenticated_client, mock_llm_responses):
    # Add a mock message to session
    router_res = AIMessage(content="SIMPLE")
    simple_res = AIMessage(content="Hi there!")
    mock_llm_responses["fast_router_llm"].ainvoke.side_effect = [router_res, simple_res]
    
    params = {
        "user_prompt": "Hello",
        "session_id": "session123",
        "lang": "English (UK)",
        "local_date": "2026-07-14"
    }
    
    await authenticated_client.post("/ask", params=params)
    
    # Get sessions list
    res = await authenticated_client.get("/sessions")
    assert res.status_code == 200
    assert "session123" in res.json()["sessions"]
    
    # Get history of session123
    res2 = await authenticated_client.get("/history/session123")
    assert res2.status_code == 200
    messages = res2.json()["messages"]
    assert len(messages) >= 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Hello"
    assert messages[1]["role"] == "assistant"
    
    # Clear history of session123
    res3 = await authenticated_client.delete("/clear/session123")
    assert res3.status_code == 200
    
    # Get history again and verify cleared
    res4 = await authenticated_client.get("/history/session123")
    assert len(res4.json()["messages"]) == 0

@pytest.mark.asyncio
async def test_rename_and_auto_rename_session(authenticated_client, mock_llm_responses):
    session_id = "rename_session"
    
    # Rename manually
    res = await authenticated_client.post(f"/rename/{session_id}", json={"new_name": "My Custom Title"})
    assert res.status_code == 200
    assert res.json()["new_name"] == "My Custom Title"
    
    # Get session names
    res2 = await authenticated_client.get("/session-names")
    assert res2.json()[session_id] == "My Custom Title"
    
    # Auto-rename via LLM
    auto_res = AIMessage(content="Auto Title")
    mock_llm_responses["fast_router_llm"].ainvoke.return_value = auto_res
    
    res3 = await authenticated_client.post(f"/auto-rename/{session_id}", json={"user_prompt": "What is the capital of France?"})
    assert res3.status_code == 200
    assert res3.json()["new_name"] == "Auto Title"

@pytest.mark.asyncio
async def test_ask_limits_free_exceeded(authenticated_client, mock_llm_responses):
    # Set usage directly in Redis to 101 to simulate free limit exceeded
    username = "testuser"
    date_str = "2026-07-14"
    daily_key = f"usage:{username}:{date_str}"
    
    # Set limit hit
    await redis_client.set(daily_key, "101")
    
    params = {
        "user_prompt": "Limit checking prompt",
        "session_id": "limit_session",
        "lang": "English (UK)",
        "local_date": date_str
    }
    
    res = await authenticated_client.post("/ask", params=params)
    assert res.status_code == 200
    data = res.json()
    assert "limit" in data["response"]
    assert data["route"] == "LIMIT_REACHED"
    
    # Reset limit
    await redis_client.delete(daily_key)
