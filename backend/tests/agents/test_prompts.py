import pytest
from backend.app.agents.prompts.loader import load_prompt
from backend.app.agents.tools.historical import get_historical_context
from backend.app.agents.tools.live_web import fetch_live_web
from backend.app.agents.tools.cricapi_tool import fetch_player_and_live_matches

def test_prompt_files_load_correctly():
    """Ensure all required prompt files are present and can be read."""
    expert_prompt = load_prompt("expert_system.txt")
    assert "You are a LIVE Cricket Data Engine." in expert_prompt
    assert "STRICT DOMAIN LOCK:" in expert_prompt
    
    router_decision = load_prompt("router_decision.txt")
    assert "EXPERT" in router_decision
    assert "SIMPLE" in router_decision

    router_prompt = load_prompt("router_prompt.txt")
    assert "You are a friendly cricket bot." in router_prompt

    extractor_prompt = load_prompt("extractor_prompt.txt")
    assert "Extract user's favorite cricket players or teams." in extractor_prompt

    summarizer_prompt = load_prompt("summarizer_prompt.txt")
    assert "Summarize this chat history briefly:" in summarizer_prompt
    
    rescue_prompt = load_prompt("expert_rescue.txt")
    assert "Write response based ONLY on history." in rescue_prompt
    
    retry_prompt = load_prompt("expert_retry.txt")
    assert "DO NOT call more tools." in retry_prompt

def test_tool_modules_import_correctly():
    """Ensure the tools were successfully extracted and remain valid LangChain tools."""
    assert hasattr(get_historical_context, "invoke")
    assert hasattr(fetch_live_web, "invoke")
    assert hasattr(fetch_player_and_live_matches, "invoke")
    
    assert get_historical_context.name == "get_historical_context"
    assert fetch_live_web.name == "fetch_live_web"
    assert fetch_player_and_live_matches.name == "fetch_player_and_live_matches"
