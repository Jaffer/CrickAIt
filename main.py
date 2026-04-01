import os, httpx, uuid, time, json, operator
from pydantic import BaseModel, Field
from typing import Optional, Literal, Annotated
from fastapi import FastAPI
from contextlib import asynccontextmanager
from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, RemoveMessage, AIMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.redis.aio import AsyncRedisSaver
from redis.asyncio import Redis as AsyncRedis

CRICKET_API_KEY = "4b68aca0-7f62-493a-af9b-4db9622d04d1"
GROQ_API_KEY = "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"
REDIS_URL = "redis://localhost:6379"

redis_client = AsyncRedis.from_url(REDIS_URL)

# 1. MULTI-AGENT SETUP & MODELS
fast_router_llm = ChatGroq(temperature=0.0, model_name="llama-3.1-8b-instant", api_key=GROQ_API_KEY)
expert_llm = ChatGroq(temperature=0.0, model_name="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)

class UserProfileExtraction(BaseModel):
    favorite_players: Optional[list[str]] = Field(default=None)
    favorite_teams: Optional[list[str]] = Field(default=None)
    expertise_level: Optional[str] = Field(
        default="Standard", 
        description="User's knowledge level: 'Casual', 'Expert', or 'Tactician'."
    )
    preferred_format: Optional[list[str]] = Field(
        default=["T20", "ODI", "Test"],
        description="The formats the user cares about most."
    )
    rival_teams: Optional[list[str]] = Field(
        default=None,
        description="Teams the user explicitly dislikes for banter purposes."
    )

# NEW: Model for renaming chat sessions
class RenameRequest(BaseModel):
    new_name: str
structured_extractor = fast_router_llm.with_structured_output(UserProfileExtraction)

web_search = DuckDuckGoSearchRun()
wiki = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())

@tool
def get_historical_context(query: str):
    """Search Wikipedia for historical cricket facts."""
    return wiki.invoke(f"{query} cricket")

@tool
def fetch_live_web(query: str):
    """MANDATORY for live 2026 cricket data, scores, and news. DO NOT call this twice."""
    print(f"🌐 [WEB SEARCH TRIGGERED]: {query}")
    try:
        # We just add the date context, giving the AI freedom to search anything!
        raw_data = web_search.invoke(f"{query} March 2026")
        return raw_data[:2000]
    except Exception as e:
        return f"Search failed: {e}"

@tool
async def fetch_player_and_live_matches(query: str):
    """Use ONLY to find a player's country. THIS DOES NOT RETURN STATS. If the user asks for stats, DO NOT USE THIS TOOL. Use fetch_live_web or get_historical_context instead."""
    async with httpx.AsyncClient() as client:
        url = f"https://api.cricapi.com/v1/players?apikey={CRICKET_API_KEY}&search={query}"
        try:
            data = (await client.get(url, timeout=5.0)).json().get("data", [])
            return ", ".join(f"{p['name']} ({p['country']})" for p in data[:5]) or "No players found."
        except: return "API_ERROR: Data not found in database. TRY LIVE WEB SEARCH INSTEAD."

tools = [get_historical_context, fetch_player_and_live_matches, fetch_live_web]
tool_node = ToolNode(tools)
expert_llm_with_tools = expert_llm.bind_tools(tools)

STRICT_SYSTEM_PROMPT = """
You are a LIVE Cricket Data Engine. TODAY'S DATE: March 31, 2026.

CRITICAL INSTRUCTIONS:
1. CONTEXT FIRST: If the user asks to reformat, summarize, or modify data you ALREADY provided in the chat history (like "make it a table"), DO NOT call any tools. Just look at the history and reformat it.
2. ONE SEARCH ONLY: If you need new data, use a tool, but answer immediately after the first search.
3. NO META-TALK: Never say "Based on the search..." or "Here is what I found...". Just output the facts.
"""

# 2. STATE & NODES
class AgentState(MessagesState):
    route_decision: str
    summary: str
    retry_count: Annotated[int, operator.add]
    user_profile: Annotated[dict, operator.ior]

async def profile_extractor_node(state: AgentState):
    """Runs silently to sync the Global Redis Profile with the Local Chat State."""
    last_msg = state["messages"][-1]
    
    global_data_str = await redis_client.get("global_user_profile")
    global_profile = json.loads(global_data_str) if global_data_str else {}
    
    for key in ["favorite_players", "favorite_teams"]:
        if key not in global_profile:
            global_profile[key] = []
            
    if last_msg.type != "human":
        return {"user_profile": global_profile}

    # 🛡️ THE FIX: THE UNBREAKABLE GUARDRAIL
    # Only allow the AI to extract data if the user explicitly uses one of these words.
    msg_lower = last_msg.content.lower()
    trigger_phrases = [
        "favorite", "favourite", "my team", "my player", 
        "i support", "huge fan", "diehard fan", "i love", "biggest fan"
    ]    
    if not any(phrase in msg_lower for phrase in trigger_phrases):
        # If no trigger phrases are found, completely skip the AI extraction phase.
        return {"user_profile": global_profile}

    prompt = f"""Extract the user's favorite cricket players or teams from the message.
    CRITICAL RULES:
    1. ONLY extract if explicitly declared (e.g., "I love...", "I support...").
    2. CLASSIFY CORRECTLY: Acronyms (CSK, MI, RCB) and Countries are TEAMS. Human names are PLAYERS.
    Message: "{last_msg.content}"
    """
    
    try:
        extracted_data = await structured_extractor.ainvoke(prompt)
        data_changed = False
        
        current_players_lower = [p.lower() for p in global_profile["favorite_players"]]
        current_teams_lower = [t.lower() for t in global_profile["favorite_teams"]]
        
        if extracted_data.favorite_players:
            for new_player in extracted_data.favorite_players:
                clean_name = new_player.strip()
                if clean_name.lower() not in current_players_lower and clean_name.lower() not in current_teams_lower:
                    global_profile["favorite_players"].append(clean_name)
                    current_players_lower.append(clean_name.lower())
                    data_changed = True
                    
        if extracted_data.favorite_teams:
            for new_team in extracted_data.favorite_teams:
                clean_name = new_team.strip()
                if clean_name.lower() not in current_teams_lower and clean_name.lower() not in current_players_lower:
                    global_profile["favorite_teams"].append(clean_name)
                    current_teams_lower.append(clean_name.lower())
                    data_changed = True
        
        if data_changed:
            await redis_client.set("global_user_profile", json.dumps(global_profile))
            
        return {"user_profile": global_profile}
        
    except Exception as e:
        print(f"⚠️ [EXTRACTOR ERROR]: {e}")
        return {"user_profile": global_profile}

async def router_node(state: AgentState):
    last_msg = state["messages"][-1].content
    
    # 1. SMARTER ROUTING: Explicitly tell it to send "favorites" to the Simple bot
    prompt = f"Decide if this user query requires a web search for live cricket stats/news (EXPERT), or if it is a casual chat, greeting, or asking about their own saved favorites/profile (SIMPLE). Query: '{last_msg}'. Reply with EXACTLY the word 'EXPERT' or 'SIMPLE'."
    decision = await fast_router_llm.ainvoke(prompt)
    
    profile = state.get("user_profile", {})
    
    if "EXPERT" in decision.content.upper():
        return {"route_decision": "EXPERT"}
    else:
        # 2. SMARTER SIMPLE BOT: Explicitly instruct it how to read the JSON memory
        import json
        memory_str = json.dumps(profile)
        system_instruction = f"""
        You are a friendly cricket bot. Keep it brief. 
        Here is the user's saved memory: {memory_str}. 
        If they ask what their favorite team or player is, look directly at this memory and tell them. 
        If the memory shows an acronym like 'CSK' or 'RCB', you know those are IPL teams.
        If the memory is empty for that category, politely tell them they haven't saved any yet.
        """
        
        fast_answer = await fast_router_llm.ainvoke([
            SystemMessage(content=system_instruction)
        ] + state["messages"])
        
        return {"messages": [fast_answer], "route_decision": "SIMPLE"}

async def summarizer_node(state: AgentState):
    summary = state.get("summary", "")
    messages = state["messages"]
    prompt = f"Summarize this chat history briefly: {summary}\n\nNew messages: {messages[:-2]}"
    new_summary = await fast_router_llm.ainvoke(prompt)
    delete_messages = [RemoveMessage(id=m.id) for m in messages[:-2]]
    return {"summary": new_summary.content, "messages": delete_messages}

async def expert_node(state: AgentState):
    profile = state.get("user_profile", {})
    current_retries = state.get("retry_count", 0)
    
    custom_prompt = STRICT_SYSTEM_PROMPT + f"\nUSER PROFILE: {profile}"
    messages = [SystemMessage(content=custom_prompt)] + state["messages"]
    
    if current_retries >= 1:
        messages.append(
            SystemMessage(content="CRITICAL: You have the search data. Answer the user's question with text or bullet points right now. DO NOT call any more tools.")
        )
        
    answer = await expert_llm_with_tools.ainvoke(messages)
    
    # 🚁 THE RESCUE OPERATION: Upgraded to include conversation history!
    if current_retries >= 1 and hasattr(answer, "tool_calls") and answer.tool_calls:
        print("🚁 [RESCUE OPERATION]: 70B failed. Using 8B model to format the data.")
        
        # Grab the last 5 messages to give the 8B model the full context (including the stats!)
        recent_history = "\n".join([f"{m.type.upper()}: {m.content}" for m in state["messages"][-5:]])
        user_question = next((m.content for m in reversed(state["messages"]) if m.type == "human"), "Format the data.")
        
        # Ask the fast 8B model to fix it using the chat history
        rescue_prompt = f"The user asked: '{user_question}'. Here is the recent chat history:\n{recent_history}\n\nWrite a clean response answering the user based ONLY on this history. If they asked for a table, output a Markdown table. Do NOT apologize."
        
        rescue_answer = await fast_router_llm.ainvoke(rescue_prompt)
        from langchain_core.messages import AIMessage
        answer = AIMessage(content=rescue_answer.content)
    
    retry_update = 1 if hasattr(answer, "tool_calls") and answer.tool_calls else 0
    return {"messages": [answer], "retry_count": retry_update}

# 3. EDGES & GRAPH
def route_after_router(state: AgentState) -> Literal["expert_node", "summarizer_node", "__end__"]:
    if len(state["messages"]) > 20:
        return "summarizer_node"
    if state.get("route_decision") == "EXPERT":
        return "expert_node"
    return "__end__"

def route_after_summarizer(state: AgentState) -> Literal["expert_node", "__end__"]:
    if state.get("route_decision") == "EXPERT":
        return "expert_node"
    return "__end__"

def route_after_expert(state: AgentState) -> Literal["tools", "__end__"]:
    last_message = state["messages"][-1]
    
    # We completely removed the circuit breaker from here because the expert_node 
    # now safely guarantees the AI will stop calling tools on the 3rd pass!
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
        
    return "__end__"

workflow = StateGraph(AgentState)
workflow.add_node("profile_extractor_node", profile_extractor_node)
workflow.add_node("router_node", router_node)
workflow.add_node("expert_node", expert_node)
workflow.add_node("tools", tool_node)
workflow.add_node("summarizer_node", summarizer_node) 

workflow.add_edge(START, "profile_extractor_node") 
workflow.add_edge("profile_extractor_node", "router_node") 
workflow.add_conditional_edges("router_node", route_after_router)
workflow.add_conditional_edges("summarizer_node", route_after_summarizer) 
workflow.add_conditional_edges("expert_node", route_after_expert)
workflow.add_edge("tools", "expert_node")

# 4. FASTAPI ENDPOINTS
agent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    async with AsyncRedisSaver.from_conn_string(REDIS_URL) as checkpointer:
        await checkpointer.setup()
        agent = workflow.compile(checkpointer=checkpointer)
        yield

app = FastAPI(lifespan=lifespan)

@app.get("/sessions")
async def list_sessions():
    keys = await redis_client.keys("checkpoint:*")
    return {"sessions": list(set([k.decode().split(":")[1] for k in keys if ":" in k.decode()]))}

@app.post("/ask")
async def ask(user_prompt: str, session_id: Optional[str] = None):
    sid = session_id or str(uuid.uuid4())
    try:
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=user_prompt)]}, 
            {"configurable": {"thread_id": sid}}
        )
        final_message = result["messages"][-1]
        route_used = result.get("route_decision", "SIMPLE")
        
        if hasattr(final_message, "tool_calls") and final_message.tool_calls:
            final_text = "I'm sorry, I'm having trouble fetching that data right now."
        else:
            final_text = final_message.content
            
        return {"response": final_text, "session_id": sid, "route": route_used}
    except Exception as e:
        print(f"AI Engine Error: {e}")
        return {"response": "Error processing request.", "session_id": sid, "route": "ERROR"}

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    state = await agent.aget_state({"configurable": {"thread_id": session_id}})
    history = []
    if state and "messages" in state.values:
        for m in state.values["messages"]:
            if m.type == "human": 
                history.append({"role": "user", "content": m.content})
            elif m.type == "ai" and m.content and not (hasattr(m, "tool_calls") and m.tool_calls):
                history.append({"role": "assistant", "content": m.content})
    return {"messages": history}

@app.delete("/clear/{session_id}")
async def clear_history(session_id: str):
    keys = await redis_client.keys(f"checkpoint:{session_id}:*")
    if keys: await redis_client.delete(*keys)
    return {"status": "success"}

@app.get("/profile")
async def get_profile():
    global_data_str = await redis_client.get("global_user_profile")
    return json.loads(global_data_str) if global_data_str else {}

# --- MISSING ENDPOINTS RESTORED ---
@app.get("/live-scores")
async def get_scores():
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://api.cricapi.com/v1/currentMatches?apikey={CRICKET_API_KEY}"
            data = (await client.get(url, timeout=5.0)).json().get("data", [])
            return {"matches": [{"name": m['name'], "status": m['status']} for m in data[:3]]}
    except: return {"matches": []}

news_cache = {"data": None, "time": 0}

@app.get("/top-news")
async def get_top_news(t: Optional[float] = None):
    global news_cache
    now = time.time()
    
    # Only search if cache is empty or 10 minutes (600s) have passed
    if not news_cache["data"] or (now - news_cache["time"] > 600):
        try:
            raw = web_search.invoke("latest cricket headlines March 2026")
            prompt = "List 5 short cricket headlines separated by ' | '. No intros, no fluff. Just headlines."
            news_cache["data"] = (await fast_router_llm.ainvoke(f"{prompt} Data: {raw}")).content.strip()
            news_cache["time"] = now  # <-- THE MISSING MAGIC LINE!
        except Exception as e: 
            print(f"News fetch failed: {e}")
            news_cache["data"] = "IPL 2026: Updates soon | Champions Trophy Prep | Live Scoreboard Active"
            news_cache["time"] = now  # Cache the fallback too so it stops spamming
            
    return {"news": news_cache["data"]}

@app.delete("/profile/clear")
async def clear_profile():
    await redis_client.delete("global_user_profile")
    return {"status": "cleared"}

@app.delete("/profile/item")
async def remove_profile_item(category: str, item: str):
    global_data_str = await redis_client.get("global_user_profile")
    if not global_data_str: 
        return {"status": "empty"}
        
    profile = json.loads(global_data_str)
    
    if category in profile and item in profile[category]:
        profile[category].remove(item)
        if not profile[category]: 
            del profile[category]
        await redis_client.set("global_user_profile", json.dumps(profile))
        
    return {"status": "success"}

@app.post("/rename/{session_id}")
async def rename_session(session_id: str, request: RenameRequest):
    """Saves a custom name to Redis AND a local JSON file backup."""
    # 1. Save to Redis (Primary Database)
    names_data = await redis_client.get("chat_names")
    names = json.loads(names_data) if names_data else {}
    names[session_id] = request.new_name
    await redis_client.set("chat_names", json.dumps(names))
    
    # 2. Save to Local File (Backup/Viewing)
    try:
        with open("chat_sessions.json", "w") as f:
            json.dump(names, f, indent=4)
    except Exception as e:
        print(f"⚠️ Could not write to chat_sessions.json: {e}")
        
    return {"status": "success", "new_name": request.new_name}

@app.get("/session-names")
async def get_session_names():
    """Retrieves all custom chat names."""
    names_data = await redis_client.get("chat_names")
    if names_data:
        return json.loads(names_data)
        
    # Fallback to local file if Redis is empty
    try:
        if os.path.exists("chat_sessions.json"):
            with open("chat_sessions.json", "r") as f:
                return json.load(f)
    except: pass
    
    return {}