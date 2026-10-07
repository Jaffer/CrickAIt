import os
from langchain_groq import ChatGroq
from backend.app.schemas.profile_schemas import UserProfileExtraction
from backend.app.agents.tools.historical import get_historical_context
from backend.app.agents.tools.live_web import fetch_live_web
from backend.app.agents.tools.cricapi_tool import fetch_player_and_live_matches

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

fast_router_llm = ChatGroq(
    temperature=0.0,
    model_name="llama3-8b-8192",
    api_key=GROQ_API_KEY
)

expert_llm = ChatGroq(
    temperature=0.0,
    model_name="llama3-70b-8192",
    api_key=GROQ_API_KEY
)

structured_extractor = fast_router_llm.with_structured_output(
    UserProfileExtraction
)

tools = [get_historical_context, fetch_player_and_live_matches, fetch_live_web]

expert_llm_with_tools = expert_llm.bind_tools(tools)
fast_router_llm_with_tools = fast_router_llm.bind_tools(tools)
