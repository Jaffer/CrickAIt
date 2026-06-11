import os
import logging
import httpx
import uuid
import time
import json
import operator
import re
import bs4
import hashlib
import secrets
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional, Literal, Annotated
from datetime import datetime, date, timedelta
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, RemoveMessage
from langgraph.graph import StateGraph, START, MessagesState
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
import aiosqlite
from redis.asyncio import Redis as AsyncRedis

load_dotenv()

# Configure production-ready logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("crickait-backend")

CRICKET_API_KEY = os.getenv("CRICKET_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable is not set")

class SmartRedisClient:
    def __init__(self, redis_url: str):
        self.redis = AsyncRedis.from_url(redis_url)
        self.mock = None
        self.use_mock = False

    def _get_mock(self):
        if not self.mock:
            class MockRedis:
                def __init__(self):
                    self.data = {}
                    self.expirations = {}
                async def get(self, key: str):
                    import time
                    if key in self.expirations and self.expirations[key] < time.time():
                        self.data.pop(key, None)
                        self.expirations.pop(key, None)
                    val = self.data.get(key)
                    if val is None:
                        return None
                    return val if isinstance(val, bytes) else str(val).encode('utf-8')
                async def set(self, key: str, value: str, ex: int = None):
                    self.data[key] = value
                    if ex:
                        import time
                        self.expirations[key] = time.time() + ex
                async def incr(self, key: str):
                    import time
                    if key in self.expirations and self.expirations[key] < time.time():
                        self.data.pop(key, None)
                        self.expirations.pop(key, None)
                    val = int(self.data.get(key, 0)) + 1
                    self.data[key] = val
                    return val
                async def expire(self, key: str, seconds: int):
                    import time
                    self.expirations[key] = time.time() + seconds
                    return 1
            self.mock = MockRedis()
        return self.mock

    async def get(self, key: str):
        if self.use_mock:
            return await self._get_mock().get(key)
        try:
            return await self.redis.get(key)
        except Exception as e:
            logger.warning("Redis connection failed on get, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().get(key)

    async def set(self, key: str, value: str, ex: int = None):
        if self.use_mock:
            return await self._get_mock().set(key, value, ex)
        try:
            return await self.redis.set(key, value, ex=ex)
        except Exception as e:
            logger.warning("Redis connection failed on set, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().set(key, value, ex)

    async def setex(self, key: str, seconds: int, value: str):
        return await self.set(key, value, ex=seconds)

    async def incr(self, key: str):
        if self.use_mock:
            return await self._get_mock().incr(key)
        try:
            return await self.redis.incr(key)
        except Exception as e:
            logger.warning("Redis connection failed on incr, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().incr(key)

    async def expire(self, key: str, seconds: int):
        if self.use_mock:
            return await self._get_mock().expire(key, seconds)
        try:
            return await self.redis.expire(key, seconds)
        except Exception as e:
            logger.warning("Redis connection failed on expire, falling back to mock: %s", e)
            self.use_mock = True
            return await self._get_mock().expire(key, seconds)

redis_client = SmartRedisClient(REDIS_URL)

http_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=httpx.Timeout(10.0, connect=3.0)
        )
    return http_client


TEAM_IMAGE_CACHE = {}

FALLBACK_FLAGS = {
    "india": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776181/india-a.jpg"
    ),
    "australia": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776113/australia-a.jpg"
    ),
    "england": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776162/england-a.jpg"
    ),
    "south africa": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776269/south-africa-a.jpg"
    ),
    "pakistan": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776241/pakistan-a.jpg"
    ),
    "new zealand": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776228/new-zealand-a.jpg"
    ),
    "sri lanka": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776274/sri-lanka-a.jpg"
    ),
    "west indies": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776288/west-indies-a.jpg"
    ),
    "bangladesh": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776127/bangladesh-a.jpg"
    ),
    "afghanistan": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776100/afghanistan-a.jpg"
    ),
    "ireland": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776191/ireland-a.jpg"
    ),
    "zimbabwe": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776295/zimbabwe-a.jpg"
    ),
    "scotland": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776258/scotland-a.jpg"
    ),
    "netherlands": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776223/netherlands-a.jpg"
    ),
    "nepal": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776220/nepal-a.jpg"
    ),
    "usa": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776283/usa-a.jpg"
    ),
    "uae": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c776281/uae-a.jpg"
    ),
    "csk": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777413/"
        "chennai-super-kings-a.jpg"
    ),
    "mi": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777422/"
        "mumbai-indians-a.jpg"
    ),
    "rcb": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777431/"
        "royal-challengers-bengaluru-a.jpg"
    ),
    "kkr": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777418/"
        "kolkata-knight-riders-a.jpg"
    ),
    "dc": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777414/"
        "delhi-capitals-a.jpg"
    ),
    "srh": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777432/"
        "sunrisers-hyderabad-a.jpg"
    ),
    "rr": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777430/"
        "rajasthan-royals-a.jpg"
    ),
    "pbks": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777429/"
        "punjab-kings-a.jpg"
    ),
    "gt": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777415/"
        "gujarat-titans-a.jpg"
    ),
    "lsg": (
        "https://static.cricbuzz.com/a/img/v1/0x0/i1/c777419/"
        "lucknow-super-giants-a.jpg"
    )
}


def validate_session_id(session_id: str):
    if not re.match(r'^[a-zA-Z0-9\-_]+$', session_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid session ID format"
        )


# 1. MULTI-AGENT SETUP & MODELS

fast_router_llm = ChatGroq(
    temperature=0.0,
    model_name="llama-3.1-8b-instant",
    api_key=GROQ_API_KEY
)

expert_llm = ChatGroq(
    temperature=0.0,
    model_name="llama-3.1-70b-versatile",
    api_key=GROQ_API_KEY
)


class UserProfileExtraction(BaseModel):
    favorite_players: Optional[list[str]] = Field(default=None)
    favorite_teams: Optional[list[str]] = Field(default=None)
    expertise_level: Optional[str] = Field(
        default="Standard",
        description="User's knowledge: 'Casual', 'Expert', or 'Tactician'."
    )
    preferred_format: Optional[list[str]] = Field(
        default=["T20", "ODI", "Test"],
        description="The formats the user cares about most."
    )
    rival_teams: Optional[list[str]] = Field(
        default=None,
        description="Teams the user explicitly dislikes for banter."
    )


class RenameRequest(BaseModel):
    new_name: str


class AutoRenameRequest(BaseModel):
    user_prompt: str


class GuestLoginRequest(BaseModel):
    device_id: Optional[str] = None


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class GoogleLoginRequest(BaseModel):
    email: str
    display_name: str


structured_extractor = fast_router_llm.with_structured_output(
    UserProfileExtraction
)

web_search = TavilySearchResults(max_results=3)
wiki = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())


class HistoricalSearchInput(BaseModel):
    query: str = Field(..., description="The search query for historical cricket facts")

@tool(args_schema=HistoricalSearchInput)
def get_historical_context(query: str):
    """Search Wikipedia for historical cricket facts."""
    try:
        return wiki.invoke(f"{query} cricket")
    except Exception as e:
        logger.error("Wikipedia search failed: %s", e)
        return f"Wikipedia search failed: {e}"


class LiveWebSearchInput(BaseModel):
    query: str = Field(..., description="The search query for live cricket news and scores")

@tool(args_schema=LiveWebSearchInput)
def fetch_live_web(query: str):
    """MANDATORY for live 2026 cricket data, scores, and news.

    DO NOT call this twice.
    """
    logger.info("Web search triggered: %s", query)
    try:
        raw_data = web_search.invoke(query)
        return raw_data[:2000]
    except Exception as e:
        return f"Search failed: {e}"


class PlayerSearchInput(BaseModel):
    query: str = Field(..., description="The search query to find a player's country")

@tool(args_schema=PlayerSearchInput)
async def fetch_player_and_live_matches(query: str):
    """Use ONLY to find a player's country.

    THIS DOES NOT RETURN STATS. If the user asks for stats, DO NOT USE THIS.
    """
    client = get_http_client()
    url = (
        f"https://api.cricapi.com/v1/players"
        f"?apikey={CRICKET_API_KEY}&search={query}"
    )
    try:
        r = await client.get(url, timeout=5.0)
        data = r.json().get("data", [])
        return ", ".join(
            f"{p['name']} ({p['country']})" for p in data[:5]
        ) or "No players found."
    except Exception:
        return (
            "API_ERROR: Data not found in database. "
            "TRY LIVE WEB SEARCH INSTEAD."
        )


tools = [get_historical_context, fetch_player_and_live_matches, fetch_live_web]
tool_node = ToolNode(tools)
expert_llm_with_tools = expert_llm.bind_tools(tools)
fast_router_llm_with_tools = fast_router_llm.bind_tools(tools)

STRICT_SYSTEM_PROMPT = """
You are a LIVE Cricket Data Engine. TODAY'S DATE: March 31, 2026.

CRITICAL INSTRUCTIONS:
1. CONTEXT FIRST: If the user asks to reformat or modify data already provided
   in chat history, DO NOT call tools. Just reformulate based on history.
2. ONE SEARCH ONLY: If you need new data, search once, then answer immediately.
3. NO META-TALK: Never say "Based on search..." or "Here is what...". Just facts.
4. STRICT DOMAIN LOCK: You must ONLY answer questions related to the cricket industry, cricket matches, cricket players, rules, history, or cricket boards (e.g. BCCI, ICC). If the user asks about anything else (e.g. politics, prime ministers, geography, coding), politely decline and remind them you are a cricket AI.
5. CURRENT DATA (2026): Your internal knowledge cuts off in 2023. If the user asks for "current" information, "latest" news, or anything happening now (2024-2026) including current board members, you MUST use the fetch_live_web tool to get up-to-date data.
"""


# 2. STATE & NODES


class AgentState(MessagesState):
    route_decision: str
    summary: str
    retry_count: Annotated[int, operator.add]
    user_profile: Annotated[dict, operator.ior]


async def profile_extractor_node(state: AgentState, config = None):
    """Runs silently to sync the Global Redis Profile with Local Chat State."""
    last_msg = state["messages"][-1]
    
    # Extract username from namespaced thread_id: "username:session_id"
    thread_id = config.get("configurable", {}).get("thread_id", "") if config else ""
    username = thread_id.split(":", 1)[0] if ":" in thread_id else "global"
    redis_key = f"global_user_profile:{username}"

    global_data_str = await redis_client.get(redis_key)
    global_profile = json.loads(global_data_str) if global_data_str else {}

    for key in ["favorite_players", "favorite_teams"]:
        if key not in global_profile:
            global_profile[key] = []

    if last_msg.type != "human":
        return {"user_profile": global_profile}

    msg_lower = last_msg.content.lower()
    trigger_phrases = [
        "favorite", "favourite", "my team", "my player",
        "i support", "huge fan", "diehard fan", "i love", "biggest fan"
    ]
    if not any(phrase in msg_lower for phrase in trigger_phrases):
        return {"user_profile": global_profile}

    prompt = f"""Extract user's favorite cricket players or teams.
    CRITICAL RULES:
    1. ONLY extract if explicitly declared (e.g., "I love...", "I support...").
    2. CLASSIFY CORRECTLY: Acronyms and Countries are TEAMS. Names are PLAYERS.
    Message: "{last_msg.content}"
    """

    try:
        extracted_data = await structured_extractor.ainvoke(prompt)
        data_changed = False

        c_players = [p.lower() for p in global_profile["favorite_players"]]
        c_teams = [t.lower() for t in global_profile["favorite_teams"]]

        if extracted_data.favorite_players:
            for new_player in extracted_data.favorite_players:
                clean_name = new_player.strip()
                if (clean_name.lower() not in c_players
                        and clean_name.lower() not in c_teams):
                    global_profile["favorite_players"].append(clean_name)
                    c_players.append(clean_name.lower())
                    data_changed = True

        if extracted_data.favorite_teams:
            for new_team in extracted_data.favorite_teams:
                clean_name = new_team.strip()
                if (clean_name.lower() not in c_teams
                        and clean_name.lower() not in c_players):
                    global_profile["favorite_teams"].append(clean_name)
                    c_teams.append(clean_name.lower())
                    data_changed = True

        if data_changed:
            await redis_client.set(
                redis_key,
                json.dumps(global_profile)
            )

        return {"user_profile": global_profile}
    except Exception as e:
        logger.error("Extractor error: %s", e, exc_info=True)
        return {"user_profile": global_profile}


async def router_node(state: AgentState):
    last_msg = state["messages"][-1].content
    prompt = (
        f"Decide if this user query requires a web search for live cricket "
        f"stats/news (EXPERT), or if it is a casual chat, greeting, or asking "
        f"about their own saved favorites/profile (SIMPLE). Query: '{last_msg}'"
        f". Reply with EXACTLY the word 'EXPERT' or 'SIMPLE'."
    )
    decision = await fast_router_llm.ainvoke(prompt)
    profile = state.get("user_profile", {})

    if "EXPERT" in decision.content.upper():
        return {"route_decision": "EXPERT"}
    else:
        memory_str = json.dumps(profile)
        system_instruction = f"""
        You are a friendly cricket bot. Keep it brief.
        Here is the user's saved memory: {memory_str}.
        If they ask what their favorite team or player is, look at memory.
        If memory shows acronym like 'CSK' or 'RCB', they are IPL teams.
        If empty, politely tell them they haven't saved any yet.
        STRICT DOMAIN LOCK: ONLY answer questions about the cricket industry, cricket boards, rules, or players. Decline all other topics.
        """
        fast_answer = await fast_router_llm.ainvoke(
            [SystemMessage(content=system_instruction)] + state["messages"]
        )
        return {"messages": [fast_answer], "route_decision": "SIMPLE"}


async def summarizer_node(state: AgentState):
    summary = state.get("summary", "")
    messages = state["messages"]
    prompt = (
        f"Summarize this chat history briefly: {summary}\n\n"
        f"New messages: {messages[:-2]}"
    )
    new_summary = await fast_router_llm.ainvoke(prompt)
    delete_messages = [RemoveMessage(id=m.id) for m in messages[:-2]]
    return {"summary": new_summary.content, "messages": delete_messages}


async def expert_node(state: AgentState):
    profile = state.get("user_profile", {})
    current_retries = state.get("retry_count", 0)

    custom_prompt = STRICT_SYSTEM_PROMPT + f"\nUSER PROFILE: {profile}"
    if current_retries >= 1:
        custom_prompt += (
            "\n\nCRITICAL: You have the search data. Answer the question "
            "with text or bullet points now. DO NOT call more tools."
        )

    messages = [SystemMessage(content=custom_prompt)] + state["messages"]
    
    try:
        answer = await expert_llm_with_tools.ainvoke(messages)
    except Exception as e:
        logger.error("Expert LLM invocation failed: %s", e)
        # Fallback to fast_router_llm WITH tools to prevent a 500 crash on tool history
        answer = await fast_router_llm_with_tools.ainvoke(messages)

    if current_retries >= 1 and hasattr(answer, "tool_calls") and answer.tool_calls:
        logger.warning("Rescue operation: 70B failed, falling back to 8B model")
        recent_history = "\n".join(
            [f"{m.type.upper()}: {m.content}" for m in state["messages"][-5:]]
        )
        user_question = next(
            (m.content for m in reversed(state["messages"]) if m.type == "human"),
            "Format the data."
        )
        rescue_prompt = (
            f"The user asked: '{user_question}'. History:\n{recent_history}\n\n"
            f"Write response based ONLY on history. Use tables if requested."
        )
        rescue_answer = await fast_router_llm.ainvoke(rescue_prompt)
        answer = HumanMessage(content=rescue_answer.content)

    retry_update = 1 if hasattr(answer, "tool_calls") and answer.tool_calls else 0
    return {"messages": [answer], "retry_count": retry_update}


# 3. EDGES & GRAPH


def route_after_router(
    state: AgentState
) -> Literal["expert_node", "summarizer_node", "__end__"]:
    if len(state["messages"]) > 20:
        return "summarizer_node"
    if state.get("route_decision") == "EXPERT":
        return "expert_node"
    return "__end__"


def route_after_summarizer(
    state: AgentState
) -> Literal["expert_node", "__end__"]:
    if state.get("route_decision") == "EXPERT":
        return "expert_node"
    return "__end__"


def route_after_expert(state: AgentState) -> Literal["tools", "__end__"]:
    last_message = state["messages"][-1]
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


# 4. AUTH & USER HELPERS

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{key.hex()}"


def verify_password(stored_password: str, provided_password: str) -> bool:
    try:
        salt, key_hex = stored_password.split(':')
        key = hashlib.pbkdf2_hmac(
            'sha256',
            provided_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return key.hex() == key_hex
    except Exception:
        return False


async def get_current_user(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication token missing or invalid"
        )
    token = auth_header.split(" ")[1]
    username_bytes = await redis_client.get(f"session:{token}")
    if not username_bytes:
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid"
        )
    return username_bytes.decode('utf-8')


# 5. FASTAPI ENDPOINTS

agent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    # Initialize connection-pooled client
    get_http_client()

    # Create users table in checkpoints.db
    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                password_hash TEXT,
                auth_provider TEXT DEFAULT 'local',
                display_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                plan TEXT DEFAULT 'free'
            )
            """)
            # Try to add 'plan' column to existing table if it doesn't exist
            try:
                await conn.execute("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'")
            except Exception:
                pass  # Column likely exists
            
            # Seed creator account
            pwd_hash = hash_password('creatorspassword@118121')
            await conn.execute(
                "INSERT OR IGNORE INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, ?, 'local', ?, ?)",
                ('iamthecreator', 'creator@crickait.com', pwd_hash, 'App Creator', 'pro')
            )
            await conn.commit()
    except Exception as e:
        logger.error("Failed to initialize users table: %s", e)

    async with AsyncSqliteSaver.from_conn_string("checkpoints.db") as checkpointer:
        await checkpointer.setup()
        agent = workflow.compile(checkpointer=checkpointer)
        yield
    if http_client:
        await http_client.aclose()


app = FastAPI(lifespan=lifespan)

# Setup CORS for separated frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://crickait.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/register")
async def register(request: RegisterRequest):
    username = request.username.strip().lower()
    email = request.email.strip().lower()
    password = request.password

    if not username or not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Username, email, and password are required"
        )

    if not re.match(r'^[a-zA-Z0-9\-_]+$', username):
        raise HTTPException(
            status_code=400,
            detail="Username can only contain alphanumeric characters, hyphens, and underscores"
        )

    # Validate email
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address"
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long"
        )
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one letter and one number"
        )
    special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?\\~`")
    if not any(c in special_chars for c in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character"
        )

    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            if username == 'iamthecreator':
                raise HTTPException(
                    status_code=400,
                    detail="Reserved username. Please login instead."
                )

            # Check if username exists
            async with conn.execute("SELECT username FROM users WHERE username = ?", (username,)) as c:
                if await c.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="Username is already taken"
                    )
            # Check if email exists
            async with conn.execute("SELECT email FROM users WHERE email = ?", (email,)) as c:
                if await c.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="Email is already registered"
                    )

            plan = 'pro' if username in ('admin', 'creator') or email in ('admin@crickait.com', 'creator@crickait.com') else 'free'
            pwd_hash = hash_password(password)
            await conn.execute(
                "INSERT INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, ?, 'local', ?, ?)",
                (username, email, pwd_hash, request.username, plan)
            )
            await conn.commit()

            # Save persistent backup to Redis
            redis_user = {
                "username": username,
                "email": email,
                "password_hash": pwd_hash,
                "auth_provider": "local",
                "display_name": request.username,
                "plan": plan
            }
            await redis_client.set(f"user:account:{username}", json.dumps(redis_user))
            await redis_client.set(f"user:email:{email}", username)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration database error: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Database error during registration"
        )

    # Generate token
    token = uuid.uuid4().hex
    await redis_client.setex(f"session:{token}", 86400, username)
    return {
        "token": token,
        "username": username,
        "display_name": request.username
    }


@app.post("/auth/guest")
async def guest_login(request: GuestLoginRequest):
    dev_id = request.device_id or ""
    device_id = re.sub(r'[^a-zA-Z0-9\-_]', '', dev_id)
    if not device_id:
        device_id = uuid.uuid4().hex[:8]
    username = f"guest_{device_id}"
    token = uuid.uuid4().hex
    await redis_client.setex(f"session:{token}", 86400, username)
    # Save guest profile explicitly
    guest_profile = {
        "favorite_players": [],
        "favorite_teams": [],
        "expertise_level": "Casual",
        "preferred_format": ["T20"],
        "rival_teams": []
    }
    await redis_client.setex(f"global_user_profile:{username}", 86400, json.dumps(guest_profile))
    return {
        "token": token,
        "username": username,
        "display_name": "Guest User"
    }


@app.post("/auth/login")
async def login(request: LoginRequest):
    username = request.username.strip().lower()
    password = request.password

    try:
        # Check Redis persistent fallback first to restore user if SQLite was wiped
        redis_data = await redis_client.get(f"user:account:{username}")
        if "@" in username:
            resolved_username = await redis_client.get(f"user:email:{username}")
            if resolved_username:
                username_str = resolved_username.decode('utf-8') if isinstance(resolved_username, bytes) else resolved_username
                redis_data = await redis_client.get(f"user:account:{username_str}")
        
        if redis_data:
            redis_data_str = redis_data.decode('utf-8') if isinstance(redis_data, bytes) else redis_data
            user_data = json.loads(redis_data_str)
            async with aiosqlite.connect("checkpoints.db") as conn:
                await conn.execute(
                    "INSERT OR IGNORE INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, ?, ?, ?, ?)",
                    (user_data["username"], user_data["email"], user_data["password_hash"], user_data["auth_provider"], user_data["display_name"], user_data["plan"])
                )
                await conn.commit()
    except Exception as re_err:
        logger.error("Failed to restore local user from Redis fallback: %s", re_err)

    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            conn.row_factory = aiosqlite.Row
            async with conn.execute("SELECT * FROM users WHERE username = ? OR email = ?", (username, username)) as c:
                row = await c.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid username or password"
                    )

                if row["auth_provider"] != "local":
                    raise HTTPException(
                        status_code=400,
                        detail="This account is registered via Google login"
                    )

                if not verify_password(row["password_hash"], password):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid username or password"
                    )

                username = row["username"]
                display_name = row["display_name"] or row["username"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login database error: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Database error during login"
        )

    token = uuid.uuid4().hex
    await redis_client.setex(f"session:{token}", 86400, username)
    return {"token": token, "username": username, "display_name": display_name}


@app.post("/auth/google")
async def google_login(request: GoogleLoginRequest):
    email = request.email.strip().lower()
    display_name = request.display_name.strip()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Generate username from email
    base_username = email.split("@")[0]
    base_username = re.sub(r'[^a-zA-Z0-9\-_]', '', base_username)
    if not base_username:
        base_username = "google_user"

    username = base_username
    try:
        # Check Redis persistent fallback first to restore user if SQLite was wiped
        username_from_redis = await redis_client.get(f"user:email:{email}")
        if username_from_redis:
            username_str = username_from_redis.decode('utf-8') if isinstance(username_from_redis, bytes) else username_from_redis
            redis_data = await redis_client.get(f"user:account:{username_str}")
            if redis_data:
                redis_data_str = redis_data.decode('utf-8') if isinstance(redis_data, bytes) else redis_data
                user_data = json.loads(redis_data_str)
                async with aiosqlite.connect("checkpoints.db") as conn:
                    await conn.execute(
                        "INSERT OR IGNORE INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, ?, ?, ?, ?)",
                        (user_data["username"], user_data["email"], user_data["password_hash"], user_data["auth_provider"], user_data["display_name"], user_data["plan"])
                    )
                    await conn.commit()
    except Exception as re_err:
        logger.error("Failed to restore Google user from Redis fallback: %s", re_err)

    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            conn.row_factory = aiosqlite.Row
            # Check if user already exists
            async with conn.execute("SELECT * FROM users WHERE email = ?", (email,)) as c:
                row = await c.fetchone()
                if row:
                    username = row["username"]
                    display_name = row["display_name"] or display_name
                else:
                    # Resolve username conflicts
                    counter = 1
                    while True:
                        async with conn.execute("SELECT username FROM users WHERE username = ?", (username,)) as uc:
                            if not await uc.fetchone():
                                  break
                            username = f"{base_username}_{counter}"
                            counter += 1

                    plan = 'pro' if username in ('admin', 'creator') or email in ('admin@crickait.com', 'creator@crickait.com') else 'free'
                    await conn.execute(
                        "INSERT INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, NULL, 'google', ?, ?)",
                        (username, email, display_name, plan)
                    )
                    await conn.commit()

                    # Save persistent backup to Redis
                    redis_user = {
                        "username": username,
                        "email": email,
                        "password_hash": None,
                        "auth_provider": "google",
                        "display_name": display_name,
                        "plan": plan
                    }
                    await redis_client.set(f"user:account:{username}", json.dumps(redis_user))
                    await redis_client.set(f"user:email:{email}", username)
    except Exception as e:
        logger.error("Google login database error: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Database error during Google login"
        )

    token = uuid.uuid4().hex
    await redis_client.setex(f"session:{token}", 86400, username)
    return {"token": token, "username": username, "display_name": display_name}


@app.post("/auth/logout")
async def logout(request: Request):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        await redis_client.delete(f"session:{token}")
    return {"status": "success"}


@app.get("/auth/me")
async def get_me(username: str = Depends(get_current_user)):
    if username.startswith('guest_'):
        return {
            "username": username,
            "email": "guest@crickait.com",
            "display_name": "Guest User",
            "plan": "guest"
        }
    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            async with conn.execute("SELECT username, email, display_name, plan FROM users WHERE username = ?", (username,)) as c:
                row = await c.fetchone()
                if row:
                    return {
                        "username": row[0],
                        "email": row[1],
                        "display_name": row[2],
                        "plan": row[3]
                    }
                raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch user profile: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@app.get("/limits")
async def get_limits(local_date: Optional[str] = None, username: str = Depends(get_current_user)):
    try:
        if username.startswith('guest_'):
            plan = 'guest'
        else:
            async with aiosqlite.connect("checkpoints.db") as conn:
                async with conn.execute("SELECT plan FROM users WHERE username = ?", (username,)) as c:
                    row = await c.fetchone()
                    plan = row[0] if row else 'free'
    except Exception:
        plan = 'free'
        
    limit = 20 if plan == 'guest' else (100 if plan == 'free' else None)
    
    today = local_date if local_date else date.today().isoformat()
    
    if limit is not None:
        daily_key = f"usage:{username}:{today}"
        usage_val = await redis_client.get(daily_key)
        usage = int(usage_val) if usage_val else 0
        remaining = max(0, limit - usage)
    else:
        usage = 0
        remaining = 999999
        
    return {
        "plan": plan,
        "usage": usage,
        "limit": limit,
        "remaining": remaining
    }



@app.delete("/auth/delete-account")
async def delete_account(username: str = Depends(get_current_user)):
    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            # Delete user from users table
            await conn.execute(
                "DELETE FROM users WHERE username = ?",
                (username,)
            )

            # Delete user's checkpoints (namespaced username:session_id)
            pattern = f"{username}:%"
            await conn.execute(
                "DELETE FROM checkpoints WHERE thread_id LIKE ?",
                (pattern,)
            )
            await conn.execute(
                "DELETE FROM writes WHERE thread_id LIKE ?",
                (pattern,)
            )
            await conn.commit()

        # Clean Redis
        await redis_client.delete(f"global_user_profile:{username}")
        await redis_client.delete(f"chat_names:{username}")

    except Exception as e:
        logger.error("Failed to delete account: %s", e)
        raise HTTPException(status_code=500, detail="Failed to delete account")

    return {"status": "success"}


@app.get("/sessions")
async def list_sessions(username: str = Depends(get_current_user)):
    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            pattern = f"{username}:%"
            async with conn.execute("SELECT DISTINCT thread_id FROM checkpoints WHERE thread_id LIKE ?", (pattern,)) as cursor:
                rows = await cursor.fetchall()
                sessions = [row[0].split(":", 1)[1] for row in rows if ":" in row[0]]
                return {"sessions": sessions}
    except Exception as e:
        logger.error("Failed to list sessions from SQLite: %s", e, exc_info=True)
        return {"sessions": []}


@app.post("/ask")
async def ask(user_prompt: str, session_id: Optional[str] = None, local_date: Optional[str] = None, username: str = Depends(get_current_user)):
    sid = session_id or str(uuid.uuid4())
    scoped_sid = f"{username}:{sid}"
    
    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            async with conn.execute("SELECT plan FROM users WHERE username = ?", (username,)) as c:
                row = await c.fetchone()
                plan = row[0] if row else 'free'
                
        # Guest accounts have 'guest_' prefix and circumvent the SQL user table
        if username.startswith('guest_'):
            plan = 'guest'
                
        if plan in ('free', 'guest'):
            today = local_date if local_date else date.today().isoformat()
            daily_key = f"usage:{username}:{today}"
            usage = await redis_client.incr(daily_key)
            if usage == 1:
                await redis_client.expire(daily_key, 86400)
            
            if plan == 'guest' and usage > 20:
                return {
                    "response": "You have reached your limit of 20 messages as a Guest. Please Sign Up to continue chatting!",
                    "session_id": sid,
                    "route": "LIMIT_REACHED"
                }
            elif plan == 'free' and usage > 100:
                return {
                    "response": "You have reached your daily limit of 100 messages on the Free plan. Please upgrade to Pro in the settings menu!",
                    "session_id": sid,
                    "route": "LIMIT_REACHED"
                }

        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=user_prompt)]},
            {"configurable": {"thread_id": scoped_sid}}
        )
        final_message = result["messages"][-1]
        route_used = result.get("route_decision", "SIMPLE")

        if hasattr(final_message, "tool_calls") and final_message.tool_calls:
            final_text = (
                "I'm sorry, I'm having trouble fetching that data right now."
            )
        else:
            final_text = final_message.content

        return {"response": final_text, "session_id": sid, "route": route_used}
    except Exception as e:
        import traceback
        tb_str = traceback.format_exc()
        logger.error("AI Engine error: %s\n%s", e, tb_str)
        # Save error to redis for remote debugging
        import asyncio
        asyncio.create_task(redis_client.setex("debug_last_error", 3600, tb_str))
        
        return {
            "response": "Error processing request.",
            "session_id": sid,
            "route": "ERROR"
        }

@app.get("/debug-logs")
async def get_debug_logs():
    error = await redis_client.get("debug_last_error")
    return {"last_error": error.decode('utf-8') if error else "No recent errors."}


@app.get("/history/{session_id}")
async def get_history(session_id: str, username: str = Depends(get_current_user)):
    validate_session_id(session_id)
    scoped_sid = f"{username}:{session_id}"
    state = await agent.aget_state({"configurable": {"thread_id": scoped_sid}})
    history = []
    if state and "messages" in state.values:
        for m in state.values["messages"]:
            if m.type == "human":
                history.append({"role": "user", "content": m.content})
            elif (m.type == "ai" and m.content and not
                  (hasattr(m, "tool_calls") and m.tool_calls)):
                history.append({"role": "assistant", "content": m.content})
    return {"messages": history}


@app.delete("/clear/{session_id}")
async def clear_history(session_id: str, username: str = Depends(get_current_user)):
    validate_session_id(session_id)
    scoped_sid = f"{username}:{session_id}"
    try:
        async with aiosqlite.connect("checkpoints.db") as conn:
            await conn.execute("DELETE FROM checkpoints WHERE thread_id = ?", (scoped_sid,))
            await conn.execute("DELETE FROM writes WHERE thread_id = ?", (scoped_sid,))
            await conn.commit()
    except Exception as e:
        logger.error("Failed to clear history from SQLite: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to clear history")
    return {"status": "success"}


@app.get("/profile")
async def get_profile(username: str = Depends(get_current_user)):
    global_data_str = await redis_client.get(f"global_user_profile:{username}")
    return json.loads(global_data_str) if global_data_str else {}


@app.post("/profile")
async def save_profile(profile_data: UserProfileExtraction, username: str = Depends(get_current_user)):
    redis_key = f"global_user_profile:{username}"
    data = profile_data.model_dump(exclude_none=True)
    await redis_client.set(redis_key, json.dumps(data))
    return {"status": "success", "profile": data}


async def v2_fetch_scorecard_data_async(match_id: str):
    url = f"https://www.cricbuzz.com/live-cricket-scorecard/{match_id}"
    client = get_http_client()
    r = await client.get(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10.0
    )
    if r.status_code != 200:
        return None
    soup = bs4.BeautifulSoup(r.text, 'html.parser')
    script_tag = soup.find('script', string=re.compile(r'scorecardApiData'))
    if not script_tag:
        return None

    json_str = script_tag.string
    brace_start = json_str.find('{')
    if brace_start == -1:
        return None

    depth = 0
    end = -1
    for i in range(brace_start, len(json_str)):
        c = json_str[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        return None
    return json.loads(json_str[brace_start:end + 1])


@app.get("/live-scores")
async def get_scores(username: str = Depends(get_current_user)):
    if username.startswith('guest_'):
        raise HTTPException(
            status_code=403,
            detail="Signup to access the live scoreboard"
        )
    url = "https://www.cricbuzz.com/cricket-match/live-scores"
    client = get_http_client()
    try:
        r = await client.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10.0
        )
        if r.status_code != 200:
            return {"matches": []}

        soup = bs4.BeautifulSoup(r.text, 'html.parser')
        match_cards = soup.find_all(
            'div',
            class_='cb-mtch-lst cb-col cb-col-100 cb-tms-itm'
        )
        live_matches = []

        for card in match_cards:
            status_div = card.find('div', class_='cb-text-complete')
            if status_div:
                continue

            link_tag = card.find('a', class_='text-hvr-underline')
            if not link_tag or 'live-cricket-scores' not in link_tag['href']:
                continue

            match_id = link_tag['href'].split('/')[2]
            title = link_tag.get('title', '').strip()

            img_tags = card.find_all('img')
            for img in img_tags:
                src = img.get('src', '')
                if 'flag' in src or 'teams' in src:
                    alt = img.get('alt', '').lower()
                    if src.startswith('//'):
                        src = 'https:' + src
                    TEAM_IMAGE_CACHE[alt] = src

            state_div = card.find(
                'div',
                class_='cb-scr-wckt-bat-lbl cb-clscr-bg-live'
            )
            state = state_div.text.strip() if state_div else "Live"

            teams_div = card.find_all('div', class_='cb-hmscg-tm-nm')
            teams = [t.text.strip() for t in teams_div]

            scores_div = card.find_all(
                'div',
                class_='cb-col-50 cb-lst-tbl-sm text-right text-bold'
            )
            scores = []
            for s in scores_div:
                scores.append(s.text.strip())

            t1_score = scores[0] if len(scores) > 0 else "-"
            t2_score = scores[1] if len(scores) > 1 else "-"

            t1_overs = "-"
            t2_overs = "-"
            if "(" in t1_score:
                parts = t1_score.split("(")
                t1_score = parts[0].strip()
                t1_overs = parts[1].replace(")", "").strip()
            if "(" in t2_score:
                parts = t2_score.split("(")
                t2_score = parts[0].strip()
                t2_overs = parts[1].replace(")", "").strip()

            t1_name = teams[0] if len(teams) > 0 else "-"
            t2_name = teams[1] if len(teams) > 1 else "-"

            def get_flag(t_name):
                t_name_l = t_name.lower()
                if t_name_l in TEAM_IMAGE_CACHE:
                    return TEAM_IMAGE_CACHE[t_name_l]
                for k, f_url in FALLBACK_FLAGS.items():
                    if k in t_name_l:
                        return f_url
                return ""

            t1_img = get_flag(t1_name)
            t2_img = get_flag(t2_name)

            live_matches.append({
                "id": match_id,
                "title": title,
                "state": state,
                "teams": [t1_name, t2_name],
                "teamInfo": [
                    {"name": t1_name, "img": t1_img},
                    {"name": t2_name, "img": t2_img}
                ],
                "scores": [
                    {"score": t1_score, "overs": t1_overs},
                    {"score": t2_score, "overs": t2_overs}
                ]
            })

        return {"matches": live_matches}
    except Exception as e:
        logger.error("Live matches scraping error: %s", e, exc_info=True)
        return {"matches": []}


@app.get("/scorecard/{match_id}")
async def get_scorecard(match_id: str, username: str = Depends(get_current_user)):
    """Fetches detailed scorecard for a specific match from Cricbuzz."""
    if username.startswith('guest_'):
        raise HTTPException(
            status_code=403,
            detail="Signup to access the live scoreboard"
        )
    if not match_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid match ID format")
    try:
        data = await v2_fetch_scorecard_data_async(match_id)
        if not data:
            return {"error": "Failed to fetch scorecard from Cricbuzz"}

        mh = data.get('matchHeader', {})
        score_cards = data.get('scoreCard', [])

        t1 = mh.get('team1', {})
        t2 = mh.get('team2', {})
        teams = [t1.get('name', ''), t2.get('name', '')]

        def get_flag(team_name, short_name):
            t_name_l = team_name.lower()
            s_name_l = short_name.lower()
            if t_name_l in TEAM_IMAGE_CACHE:
                return TEAM_IMAGE_CACHE[t_name_l]
            if s_name_l in TEAM_IMAGE_CACHE:
                return TEAM_IMAGE_CACHE[s_name_l]
            for k, f_url in FALLBACK_FLAGS.items():
                if k in t_name_l:
                    return f_url
            return ""

        team_info = [
            {
                "name": t1.get('name', ''),
                "shortname": t1.get('shortName', ''),
                "img": get_flag(t1.get('name', ''), t1.get('shortName', ''))
            },
            {
                "name": t2.get('name', ''),
                "shortname": t2.get('shortName', ''),
                "img": get_flag(t2.get('name', ''), t2.get('shortName', ''))
            }
        ]

        scores = []
        for sc in score_cards:
            bat_team = sc.get('batTeamDetails', {})
            sd = sc.get('scoreDetails', {})
            scores.append({
                "inning": bat_team.get('batTeamShortName', ''),
                "r": sd.get('runs', 0),
                "w": sd.get('wickets', 0),
                "o": sd.get('overs', 0.0)
            })

        scorecard_list = []
        for sc in score_cards:
            bat_team = sc.get('batTeamDetails', {})
            bowl_team = sc.get('bowlTeamDetails', {})

            batting_list = []
            batsmen_data = bat_team.get('batsmenData', {})
            try:
                sorted_batsmen = sorted(
                    batsmen_data.items(),
                    key=lambda x: int(x[0].split('_')[1])
                )
            except Exception:
                sorted_batsmen = sorted(batsmen_data.items())

            for k, b in sorted_batsmen:
                out_desc = b.get('outDesc', '')
                dismissal = "not out"
                if out_desc and out_desc.lower() != 'batting':
                    dismissal = out_desc

                batting_list.append({
                    "batsman": {"name": b.get('batName', '')},
                    "dismissal": dismissal,
                    "dismissal-text": (
                        out_desc if out_desc.lower() != 'batting' else ''
                    ),
                    "r": b.get('runs', 0),
                    "b": b.get('balls', 0),
                    "4s": b.get('fours', 0),
                    "6s": b.get('sixes', 0),
                    "sr": b.get('strikeRate', 0.0)
                })

            bowling_list = []
            bowlers_data = bowl_team.get('bowlersData', {})
            try:
                sorted_bowlers = sorted(
                    bowlers_data.items(),
                    key=lambda x: int(x[0].split('_')[1])
                )
            except Exception:
                sorted_bowlers = sorted(bowlers_data.items())

            for k, bw in sorted_bowlers:
                bowling_list.append({
                    "bowler": {"name": bw.get('bowlName', '')},
                    "o": bw.get('overs', 0.0),
                    "m": bw.get('maidens', 0),
                    "r": bw.get('runs', 0),
                    "w": bw.get('wickets', 0),
                    "eco": bw.get('economy', 0.0)
                })

            scorecard_list.append({
                "inning": f"{bat_team.get('batTeamName', '')} Innings",
                "batting": batting_list,
                "bowling": bowling_list
            })

        toss_res = mh.get('tossResults', {})

        return {
            "id": match_id,
            "name": (
                f"{t1.get('name', '')} vs {t2.get('name', '')}, "
                f"{mh.get('matchDescription', '')}"
            ),
            "status": mh.get('status', ''),
            "matchType": mh.get('matchFormat', ''),
            "venue": mh.get('venue', {}).get('name', ''),
            "date": "",
            "teams": teams,
            "teamInfo": team_info,
            "score": scores,
            "tossWinner": toss_res.get('tossWinnerName', ''),
            "tossChoice": toss_res.get('decision', ''),
            "scorecard": scorecard_list
        }
    except Exception as e:
        logger.error("Scorecard error: %s", e, exc_info=True)
        return {"error": "Failed to load scorecard from Cricbuzz"}


news_cache = {"data": None, "time": 0}


@app.get("/top-news")
async def get_top_news(t: Optional[float] = None):
    now = time.time()

    if not news_cache["data"] or (now - news_cache["time"] > 600):
        try:
            raw = web_search.invoke("latest cricket headlines March 2026")
            prompt = (
                "List 5 short cricket headlines separated by ' | '. "
                "No intros, no fluff. Just headlines."
            )
            news_cache["data"] = (
                await fast_router_llm.ainvoke(f"{prompt} Data: {raw}")
            ).content.strip()
            news_cache["time"] = now
        except Exception as e:
            logger.error("News fetch failed: %s", e, exc_info=True)
            news_cache["data"] = (
                "IPL 2026: Updates soon | Champions Trophy Prep | "
                "Live Scoreboard Active"
            )
            news_cache["time"] = now

    return {"news": news_cache["data"]}


@app.delete("/profile/clear")
async def clear_profile(username: str = Depends(get_current_user)):
    await redis_client.delete(f"global_user_profile:{username}")
    return {"status": "cleared"}


@app.delete("/profile/item")
async def remove_profile_item(category: str, item: str, username: str = Depends(get_current_user)):
    if category not in ["favorite_players", "favorite_teams"]:
        raise HTTPException(status_code=400, detail="Invalid category")
    redis_key = f"global_user_profile:{username}"
    global_data_str = await redis_client.get(redis_key)
    if not global_data_str:
        return {"status": "empty"}

    profile = json.loads(global_data_str)

    if category in profile and item in profile[category]:
        profile[category].remove(item)
        if not profile[category]:
            del profile[category]
        await redis_client.set(
            redis_key,
            json.dumps(profile)
        )

    return {"status": "success"}


@app.post("/rename/{session_id}")
async def rename_session(session_id: str, request: RenameRequest, username: str = Depends(get_current_user)):
    """Saves a custom name to Redis namespaced by username."""
    validate_session_id(session_id)
    clean_name = re.sub(r'<[^>]*>', '', request.new_name).strip()
    if not clean_name:
        raise HTTPException(
            status_code=400,
            detail="New name cannot be empty"
        )

    redis_key = f"chat_names:{username}"
    names_data = await redis_client.get(redis_key)
    names = json.loads(names_data) if names_data else {}
    names[session_id] = clean_name
    await redis_client.set(redis_key, json.dumps(names))

    return {"status": "success", "new_name": clean_name}


@app.post("/auto-rename/{session_id}")
async def auto_rename_session(session_id: str, request: AutoRenameRequest, username: str = Depends(get_current_user)):
    """Uses LLM to generate a concise chat name based on first prompt and saves it namespaced by user."""
    validate_session_id(session_id)
    prompt = (
        f"Generate a very short, concise chat title (max 5 words) for a "
        f"chat that starts with this user query: '{request.user_prompt}'. "
        f"Output ONLY the title, no quotes, no extra text."
    )

    try:
        response = await fast_router_llm.ainvoke(prompt)
        new_name = response.content.strip().strip('"').strip("'")
    except Exception as e:
        print(f"⚠️ [AUTO RENAME ERROR]: {e}")
        new_name = (
            request.user_prompt[:25] + "..."
            if len(request.user_prompt) > 25
            else request.user_prompt
        )

    redis_key = f"chat_names:{username}"
    names_data = await redis_client.get(redis_key)
    names = json.loads(names_data) if names_data else {}
    names[session_id] = new_name
    await redis_client.set(redis_key, json.dumps(names))

    return {"status": "success", "new_name": new_name}


@app.get("/session-names")
async def get_session_names(username: str = Depends(get_current_user)):
    """Retrieves all custom chat names for the current user."""
    redis_key = f"chat_names:{username}"
    names_data = await redis_client.get(redis_key)
    if names_data:
        return json.loads(names_data)

    return {}


# Static files removed for separate frontend deployments

@app.get("/debug-groq")
async def debug_groq():
    try:
        from langchain_core.messages import HumanMessage
        res = await fast_router_llm.ainvoke([HumanMessage(content="Hello")])
        return {"status": "ok", "response": res.content}
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc()
        }
