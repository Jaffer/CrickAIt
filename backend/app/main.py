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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from backend.app.core.database import DatabaseProvider
from redis.asyncio import Redis as AsyncRedis

# Configure production-ready logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("crickait-backend")

from backend.app.config.settings import settings
from backend.app.core.security import (
    redis_client,
    get_current_user,
    get_http_client,
    hash_password,
    verify_password,
    SmartRedisClient
)

CRICKET_API_KEY = settings.CRICKET_API_KEY
GROQ_API_KEY = settings.GROQ_API_KEY
REDIS_URL = settings.REDIS_URL
SMTP_HOST = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
SMTP_FROM = settings.SMTP_FROM
TURNSTILE_SECRET_KEY = settings.TURNSTILE_SECRET_KEY

# Cache dict for team flags
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

from backend.app.schemas.profile_schemas import UserProfileExtraction
from pydantic import BaseModel

class RenameRequest(BaseModel):
    new_name: str

class AutoRenameRequest(BaseModel):
    user_prompt: str



from backend.app.agents.llms import fast_router_llm
from backend.app.agents.graph import build_graph

# 4. AUTH & USER HELPERS



# 5. FASTAPI ENDPOINTS

agent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    import os
    import asyncio
    
    # Initialize connection-pooled client
    get_http_client()
    
    # Initialize Postgres Pool
    await DatabaseProvider.initialize()

    # Create users table
    try:
        async with DatabaseProvider.get_db() as conn:
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                password_hash TEXT,
                auth_provider TEXT DEFAULT 'local',
                display_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                plan TEXT DEFAULT 'free',
                avatar TEXT
            )
            """)
            try:
                await conn.execute("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'")
            except Exception:
                pass
            try:
                await conn.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
            except Exception:
                pass
            
            pwd_hash = hash_password('creatorspassword@118121')
            await conn.execute(
                "INSERT INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES ($1, $2, $3, 'local', $4, $5) ON CONFLICT (username) DO NOTHING",
                'iamthecreator', 'creator@crickait.com', pwd_hash, 'App Creator', 'pro'
            )
    except Exception as e:
        logger.error("Failed to initialize users table: %s", e)

    # Create notifications tables
    try:
        async with DatabaseProvider.get_db() as conn:
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id          TEXT PRIMARY KEY,
                username    TEXT,
                title       TEXT NOT NULL,
                message     TEXT NOT NULL,
                type        TEXT DEFAULT 'info',
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at  TIMESTAMP
            )
            """)
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS notification_reads (
                username    TEXT NOT NULL,
                notif_id    TEXT NOT NULL,
                PRIMARY KEY (username, notif_id)
            )
            """)
    except Exception as e:
        logger.error("Failed to initialize notifications tables: %s", e)

    # Create password_resets table
    try:
        async with DatabaseProvider.get_db() as conn:
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
    except Exception as e:
        logger.error("Failed to initialize password_resets table: %s", e)

    checkpointer = AsyncPostgresSaver(DatabaseProvider._pool)
    await checkpointer.setup()
    agent = build_graph().compile(checkpointer=checkpointer)
    
    yield
    
    # Teardown
    await DatabaseProvider.close()

app = FastAPI(
    title="CrickAIt Backend API",
    description="Backend for the CrickAIt AI Application",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.app.api.auth import router as auth_router
app.include_router(auth_router)

from backend.app.api.notifications import router as notifications_router
app.include_router(notifications_router)

from backend.app.api.profile import router as profile_router
app.include_router(profile_router)


@app.get("/sessions")
async def list_sessions(username: str = Depends(get_current_user)):
    try:
        async with DatabaseProvider.get_db() as conn:
            pattern = f"{username}:%"
            rows = await conn.fetch("SELECT DISTINCT thread_id FROM checkpoints WHERE thread_id LIKE $1", pattern)
            sessions = [row[0].split(":", 1)[1] for row in rows if ":" in row[0]]
            return {"sessions": sessions}
    except Exception as e:
        logger.error("Failed to list sessions from SQLite: %s", e, exc_info=True)
        return {"sessions": []}


@app.post("/ask")
async def ask(user_prompt: str, session_id: Optional[str] = None, local_date: Optional[str] = None, lang: Optional[str] = "English (UK)", username: str = Depends(get_current_user)):
    sid = session_id or str(uuid.uuid4())
    scoped_sid = f"{username}:{sid}"
    
    try:
        # Use the resolved parameter (default to English (UK) if empty)
        resolved_lang = lang if lang else "English (UK)"

        async with DatabaseProvider.get_db() as conn:
            row = await conn.fetchrow("SELECT plan FROM users WHERE username = $1", username)
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
            {
                "messages": [HumanMessage(content=user_prompt)],
                "preferred_lang": resolved_lang
            },
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

@app.get("/health")
@app.head("/health")
async def health_check():
    return {"status": "ok"}

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
        async with DatabaseProvider.get_db() as conn:
            await conn.execute("DELETE FROM checkpoints WHERE thread_id = $1", scoped_sid)
            await conn.execute("DELETE FROM writes WHERE thread_id = $1", scoped_sid)
    except Exception as e:
        logger.error("Failed to clear history from SQLite: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to clear history")
    return {"status": "success"}





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


live_scores_cache = {"data": None, "time": 0}

async def fetch_live_scores_from_cricbuzz():
    try:
        url = "https://www.cricbuzz.com/cricket-match/live-scores"
        client = get_http_client()
        r = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, timeout=10.0)
        if r.status_code != 200:
            logger.warning("Cricbuzz live-scores status code: %s", r.status_code)
            return []
            
        soup = bs4.BeautifulSoup(r.text, 'html.parser')
        
        # Find all series containers
        series_containers = soup.find_all("div", class_=re.compile(r"cb-lv-main"))
        if not series_containers:
            # Fallback to general search if class name changed slightly
            series_containers = soup.find_all("div", class_=re.compile(r"cb-plyr-tbody"))
            
        matches = []
        for s in series_containers:
            match_divs = s.find_all("div", class_=re.compile(r"cb-mtch-lst"))
            for m in match_divs:
                try:
                    a_tag = m.find("a")
                    if not a_tag or not a_tag.get("href"):
                        continue
                    
                    href = a_tag["href"]
                    # Extract match ID
                    # e.g., /live-cricket-scores/87622/ind-vs-aus
                    parts = href.strip("/").split("/")
                    match_id = None
                    for term in ["live-cricket-scores", "cricket-scores", "live-cricket-scorecard", "live-cricket-match"]:
                        if term in parts:
                            idx = parts.index(term)
                            if idx + 1 < len(parts):
                                match_id = parts[idx + 1]
                                break
                    
                    if not match_id:
                        # Fallback: find any number in parts
                        for p in parts:
                            if p.isdigit():
                                match_id = p
                                break
                                
                    if not match_id:
                        continue
                        
                    # Check duplicate
                    if any(x["id"] == match_id for x in matches):
                        continue
                        
                    # Extract match name
                    name_tag = m.find("h3", class_=re.compile(r"cb-lv-scr-mtch-hdr"))
                    name = name_tag.text.strip() if name_tag else ""
                    if not name and a_tag:
                        name = a_tag.text.strip()
                    
                    # Clean match name (e.g. remove extra spaces)
                    name = " ".join(name.split())
                    
                    # Extract status
                    status = "Live"
                    status_tag = m.find("div", class_=re.compile(r"cb-text-live|cb-text-complete|cb-text-preview|cb-lv-scrs-state"))
                    if status_tag:
                        status = status_tag.text.strip()
                    
                    # Skip matches that are explicitly complete or won
                    if "won" in status.lower() or "draw" in status.lower() or "complete" in status.lower():
                        continue
                        
                    # Extract scores
                    score = []
                    teams = []
                    
                    score_div = m.find("div", class_=re.compile(r"cb-lv-scrs-col|cb-scr-wll-chvrn"))
                    if score_div:
                        bat_div = score_div.find("div", class_=re.compile(r"cb-hmscg-bat-txt"))
                        bwl_div = score_div.find("div", class_=re.compile(r"cb-hmscg-bwl-txt"))
                        
                        # Fallback to search inside score_div
                        if not bat_div and not bwl_div:
                            divs = score_div.find_all("div", class_=re.compile(r"cb-hmscg"))
                            if len(divs) >= 1:
                                bat_div = divs[0]
                            if len(divs) >= 2:
                                bwl_div = divs[1]
                                
                        for div in [bat_div, bwl_div]:
                            if not div:
                                continue
                            team_name_tag = div.find("div", class_=re.compile(r"cb-hmscg-tm-nm"))
                            if not team_name_tag:
                                continue
                            team_name = team_name_tag.text.strip()
                            teams.append(team_name)
                            
                            score_text_tags = div.find_all("div", class_=re.compile(r"cb-ovr-flo"))
                            score_text = score_text_tags[-1].text.strip() if score_text_tags else ""
                            
                            # Also check if the text is empty or says something like "yet to bat"
                            if score_text and "yet to bat" not in score_text.lower():
                                r_match = re.search(r'(\d+)(?:/(\d+))?', score_text)
                                o_match = re.search(r'\(([\d\.]+)\)', score_text)
                                
                                runs = int(r_match.group(1)) if r_match else 0
                                wickets = int(r_match.group(2)) if r_match and r_match.group(2) else (10 if (r_match and "/" in score_text) else 0)
                                overs = o_match.group(1) if o_match else "-"
                                
                                score.append({
                                    "inning": team_name,
                                    "r": runs,
                                    "w": wickets,
                                    "o": overs
                                })
                            else:
                                score.append({
                                    "inning": team_name,
                                    "r": 0,
                                    "w": 0,
                                    "o": "-"
                                })
                                
                    if not teams and " vs " in name:
                        teams = [t.strip() for t in name.split(" vs ")]
                        
                    matches.append({
                        "id": match_id,
                        "name": name,
                        "status": status,
                        "teams": teams,
                        "teamInfo": [{"name": t, "shortname": t[:3].upper(), "img": f"https://static.cricbuzz.com/a/img/v1/72x72/i1/c170661/default.jpg"} for t in teams],
                        "score": score
                    })
                except Exception as inner_e:
                    logger.error("Error parsing single match: %s", inner_e, exc_info=True)
                    continue
        return matches
    except Exception as e:
        logger.error("Error scraping live scores from Cricbuzz: %s", e, exc_info=True)
        return []

@app.get("/live-scores-preview")
async def get_scores_preview():
    now = time.time()
    if live_scores_cache["data"] is not None and (now - live_scores_cache["time"] < 90):
        return {"matches": live_scores_cache["data"]}

    live_matches = []
    cricapi_failed = False
    
    try:
        url = f"https://api.cricapi.com/v1/currentMatches?apikey={CRICKET_API_KEY}&offset=0"
        client = get_http_client()
        r = await client.get(url, timeout=8.0)
        data = r.json()
        
        if data.get("status") == "success":
            for match in data.get("data", []):
                if match.get("matchEnded", False):
                    continue

                scores = []
                for s in match.get("score", []):
                    scores.append({
                        "inning": s.get("inning", "Score"),
                        "r": s.get("r", 0),
                        "w": s.get("w", 0),
                        "o": s.get("o", 0)
                    })
                
                live_matches.append({
                    "id": match.get("id"),
                    "name": match.get("name"),
                    "status": match.get("status"),
                    "teams": match.get("teams", []),
                    "teamInfo": match.get("teamInfo", []),
                    "score": scores
                })
        else:
            cricapi_failed = True
    except Exception as e:
        logger.error("Live matches CricAPI error (preview): %s", e)
        cricapi_failed = True

    if cricapi_failed or not live_matches:
        scraped_matches = await fetch_live_scores_from_cricbuzz()
        if scraped_matches:
            live_matches = scraped_matches

    if not live_matches and live_scores_cache["data"] is not None:
        return {"matches": live_scores_cache["data"]}

    live_scores_cache["data"] = live_matches
    live_scores_cache["time"] = now

    return {"matches": live_matches}


@app.get("/news-preview")
async def get_news_preview():
    try:
        client = get_http_client()
        r = await client.get("https://www.cricbuzz.com/rss.xml", timeout=6.0)
        xml = r.text
        import re
        items = re.findall(r"<item>(.*?)</item>", xml, re.DOTALL)
        news_list = []
        for item in items[:5]:
            title = re.search(r"<title>(.*?)</title>", item)
            desc = re.search(r"<description>(.*?)</description>", item)
            link = re.search(r"<link>(.*?)</link>", item)
            
            title_text = title.group(1).replace("<![CDATA[", "").replace("]]>", "").strip() if title else ""
            desc_text = desc.group(1).replace("<![CDATA[", "").replace("]]>", "").strip() if desc else ""
            link_text = link.group(1).strip() if link else ""
            
            desc_text = re.sub(r"<[^>]*>", "", desc_text)
            
            news_list.append({
                "title": title_text,
                "description": desc_text,
                "link": link_text
            })
        return {"news": news_list}
    except Exception as e:
        logger.error("Error fetching news preview: %s", e)
        return {"news": [
            {"title": "IPL matches heating up as playoff race intensifies", "description": "Teams battle for the crucial top 4 spots in the table.", "link": "#"},
            {"title": "Fast bowlers dominate in latest red-ball fixtures", "description": "Pace friendly tracks result in early finishes across venues.", "link": "#"}
        ]}
async def get_scores(username: str = Depends(get_current_user)):
    if username.startswith('guest_'):
        raise HTTPException(
            status_code=403,
            detail="Signup to access the live scoreboard"
        )
    
    now = time.time()
    # Cache hit check (90 seconds)
    if live_scores_cache["data"] is not None and (now - live_scores_cache["time"] < 90):
        return {"matches": live_scores_cache["data"]}

    live_matches = []
    cricapi_failed = False
    
    # 1. Attempt CricAPI
    try:
        url = f"https://api.cricapi.com/v1/currentMatches?apikey={CRICKET_API_KEY}&offset=0"
        client = get_http_client()
        r = await client.get(url, timeout=8.0)
        data = r.json()
        
        if data.get("status") == "success":
            for match in data.get("data", []):
                if match.get("matchEnded", False):
                    continue

                scores = []
                for s in match.get("score", []):
                    scores.append({
                        "inning": s.get("inning", "Score"),
                        "r": s.get("r", 0),
                        "w": s.get("w", 0),
                        "o": s.get("o", 0)
                    })
                
                live_matches.append({
                    "id": match.get("id"),
                    "name": match.get("name"),
                    "status": match.get("status"),
                    "teams": match.get("teams", []),
                    "teamInfo": match.get("teamInfo", []),
                    "score": scores
                })
        else:
            logger.warning("CricAPI currentMatches returned non-success: %s", data)
            cricapi_failed = True
    except Exception as e:
        logger.error("Live matches CricAPI error: %s", e, exc_info=True)
        cricapi_failed = True

    # 2. If CricAPI failed or returned no live matches, fallback to scraping Cricbuzz
    if cricapi_failed or not live_matches:
        logger.info("CricAPI failed or empty. Falling back to Cricbuzz live scores scraper...")
        scraped_matches = await fetch_live_scores_from_cricbuzz()
        if scraped_matches:
            live_matches = scraped_matches

    # 3. If everything fails but we have stale cache, use it
    if not live_matches and live_scores_cache["data"] is not None:
        return {"matches": live_scores_cache["data"]}

    # Update cache
    live_scores_cache["data"] = live_matches
    live_scores_cache["time"] = now

    return {"matches": live_matches}


@app.get("/scorecard/{match_id}")
async def get_scorecard(match_id: str, username: str = Depends(get_current_user)):
    """Fetches detailed scorecard for a specific match from Cricbuzz."""
    if username.startswith('guest_'):
        raise HTTPException(
            status_code=403,
            detail="Signup to access the live scoreboard"
        )
    try:
        url = f"https://api.cricapi.com/v1/match_scorecard?apikey={CRICKET_API_KEY}&id={match_id}"
        client = get_http_client()
        r = await client.get(url, timeout=12.0)
        data = r.json()

        if data.get("status") != "success":
            # Log the reason so we can diagnose in Render logs
            reason = data.get("reason", data.get("message", "unknown"))
            logger.error("CricAPI scorecard failed for %s: status=%s reason=%s", match_id, data.get("status"), reason)
            
            # Fallback: try match_info endpoint which works on free tier
            fallback_url = f"https://api.cricapi.com/v1/match_info?apikey={CRICKET_API_KEY}&id={match_id}"
            r2 = await client.get(fallback_url, timeout=10.0)
            data2 = r2.json()
            
            if data2.get("status") == "success":
                match_data = data2.get("data", {})
                scores = []
                for s in match_data.get("score", []):
                    scores.append({
                        "inning": s.get("inning", "Score"),
                        "r": s.get("r", 0),
                        "w": s.get("w", 0),
                        "o": s.get("o", 0)
                    })
                return {
                    "teams": match_data.get("teams", []),
                    "teamInfo": match_data.get("teamInfo", []),
                    "status": match_data.get("status", ""),
                    "score": scores,
                    "tossWinner": match_data.get("tossWinner", ""),
                    "tossChoice": match_data.get("tossChoice", ""),
                    "scorecard": [],
                    "note": "Detailed scorecard unavailable on current plan. Showing match summary."
                }
            
            return {"error": f"Scorecard unavailable: {reason}"}

        match_data = data.get("data", {})
        
        # Format strictly to what frontend expects
        formatted_scorecard = []
        for inning in match_data.get("scorecard", []):
            formatted_scorecard.append({
                "inning": inning.get("inning", ""),
                "batting": inning.get("batting", []),
                "bowling": inning.get("bowling", [])
            })

        scores = []
        for s in match_data.get("score", []):
            scores.append({
                "inning": s.get("inning", "Score"),
                "r": s.get("r", 0),
                "w": s.get("w", 0),
                "o": s.get("o", 0)
            })

        team_info = match_data.get("teamInfo", [])
        if not team_info and len(match_data.get("teams", [])) >= 2:
            team_info = [
                {"name": match_data["teams"][0], "shortname": match_data["teams"][0][:3], "img": ""},
                {"name": match_data["teams"][1], "shortname": match_data["teams"][1][:3], "img": ""}
            ]

        return {
            "teams": match_data.get("teams", []),
            "teamInfo": team_info,
            "status": match_data.get("status", ""),
            "score": scores,
            "tossWinner": match_data.get("tossWinner", ""),
            "tossChoice": match_data.get("tossChoice", ""),
            "scorecard": formatted_scorecard
        }
    except Exception as e:
        logger.error("Scorecard API error: %s", e, exc_info=True)
        return {"error": "Failed to load scorecard"}


news_cache = {"data": None, "time": 0}


@app.get("/top-news")
async def get_top_news(t: Optional[float] = None):
    now = time.time()

    if not news_cache["data"] or (now - news_cache["time"] > 600):
        try:
            raw = web_search.invoke("latest cricket headlines March 2026")
            prompt = (
                "Write 5 distinct, informative one-sentence news updates about recent cricket events or matches. "
                "Each sentence should tell a complete piece of news. "
                "Separate each sentence with ' | '. "
                "No intros, no fluff, just the 5 sentences separated by |."
            )
            news_text = (
                await fast_router_llm.ainvoke(f"{prompt} Data: {raw}")
            ).content.strip()

            try:
                url = f"https://api.cricapi.com/v1/currentMatches?apikey={CRICKET_API_KEY}&offset=0"
                client = get_http_client()
                r = await client.get(url, timeout=5.0)
                data = r.json()
                completed_matches = []
                if data.get("status") == "success":
                    for match in data.get("data", []):
                        if match.get("matchEnded", False):
                            completed_matches.append(f"{match.get('name')} ({match.get('status')})")
                
                if completed_matches:
                    match_str = " | ".join(completed_matches[:4])
                    news_text = f"🏏 RECENT RESULTS: {match_str} | 📰 LATEST NEWS: {news_text}"
            except Exception as e:
                logger.error("Failed to fetch completed matches for news: %s", e)

            news_cache["data"] = news_text
            news_cache["time"] = now
        except Exception as e:
            logger.error("News fetch failed: %s", e, exc_info=True)
            news_cache["data"] = (
                "IPL 2026: Updates soon | Champions Trophy Prep | "
                "Live Scoreboard Active"
            )
            news_cache["time"] = now

    return {"news": news_cache["data"]}





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

class UpgradeUserRequest(BaseModel):
    username: str
    plan: str

@app.get("/admin/users")
async def admin_get_users(username: str = Depends(get_current_user)):
    if username != "iamthecreator":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access only.")
    try:
        async with DatabaseProvider.get_db() as conn:
            rows = await conn.fetch("SELECT username, email, auth_provider, plan, created_at FROM users")
            users = []
            for r in rows:
                users.append({
                    "username": r[0],
                    "email": r[1],
                    "auth_provider": r[2],
                    "plan": r[3],
                    "created_at": r[4]
                })
            return {"users": users}
    except Exception as e:
        logger.error("Admin user fetch error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch users")


@app.post("/admin/upgrade-user")
async def admin_upgrade_user(req: UpgradeUserRequest, username: str = Depends(get_current_user)):
    if username != "iamthecreator":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access only.")
    
    if req.plan not in ["free", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan type")
        
    try:
        async with DatabaseProvider.get_db() as conn:
            await conn.execute("UPDATE users SET plan = $1 WHERE username = $2", req.plan, req.username)
            return {"status": "success", "message": f"User {req.username} upgraded to {req.plan}"}
    except Exception as e:
        logger.error("Admin user upgrade error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to upgrade user")




