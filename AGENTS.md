# CrickAIt

Cricket AI chatbot with multi-agent architecture using LangGraph, FastAPI backend, and React frontend.

## Quick Start

```bash
./start.sh  # Starts Redis, FastAPI (port 8000), and Streamlit
```

## Development Commands

| Task | Command |
|------|---------|
| Backend | `uvicorn main:app --reload --port 8000` |
| Frontend dev | `cd frontend && npm run dev` (port 3000) |
| Frontend build | `cd frontend && npm run build` |
| Redis | `docker start redis-cricket` or start fresh with `redis/redis-stack-server:latest` |

## Architecture

**Backend** (`main.py`):
- FastAPI + LangGraph multi-agent system
- Graph flow: `profile_extractor → router → expert_node/tools/summarizer`
- LLMs via Groq: `llama-3.1-8b-instant` (routing), `llama-3.1-70b-versatile` (expert)
- Tools: Tavily search, Wikipedia, Cricbuzz API

**Frontend**:
- React + Vite (`frontend/`)
- Alternative Streamlit UI (`frontend.py`)

**Data Layer**:
- `checkpoints.db`: SQLite for users + LangGraph state
- Redis: Sessions, rate limiting, user profiles, SQLite backup
- `vector_db/`: FAISS index (built via `vector_store_builder.py`)

## Required Environment

- `GROQ_API_KEY` — required, app won't start without it
- `REDIS_URL` — defaults to `redis://localhost:6379`
- `CRICKET_API_KEY` — for Cricbuzz player data

## Key Patterns

**User scoping**: All session IDs are namespaced as `{username}:{session_id}`. Never query SQLite with bare session IDs.

**Redis mock fallback**: `SmartRedisClient` auto-falls back to in-memory mock if Redis is unreachable. Logs warning and continues.

**Rate limits**: Free=100/day, Guest=20/day, Pro=unlimited. Tracked via Redis `usage:{username}:{date}`.

**Auth**: Token-based (Bearer header). Sessions stored in Redis `session:{token}` with 24h TTL.

## File Structure

```
main.py                 # FastAPI app, LangGraph agents, auth, API endpoints
frontend.py             # Streamlit alternative UI
vector_store_builder.py # Build FAISS index from Cricsheet JSON data
retriever.py            # Vector search queries
data_loader.py          # Load Cricsheet match data
document_embeddings.py  # Embedding utilities
frontend/               # React/Vite frontend
data/cricsheet_raw/     # Raw cricket match JSON data
```
