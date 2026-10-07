import os
import sys
import pytest
import asyncio
import aiosqlite
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Mock environment variables BEFORE importing main
os.environ["GROQ_API_KEY"] = "mock_groq_key"
os.environ["REDIS_URL"] = "redis://localhost:6379"
os.environ["CRICKET_API_KEY"] = "mock_cricket_key"
os.environ["SMTP_HOST"] = "smtp.gmail.com"
os.environ["SMTP_PORT"] = "587"
os.environ["SMTP_USER"] = "mock_user@gmail.com"
os.environ["SMTP_PASSWORD"] = "mock_password"
# Redirect database connection to test DB
from backend.app.config.settings import settings
settings.TURNSTILE_SECRET_KEY = ""

TEST_DB_PATH = "data/sqlite/test_checkpoints.db"
os.makedirs("data/sqlite", exist_ok=True)

# Monkeypatch aiosqlite.connect and AsyncSqliteSaver
original_connect = aiosqlite.connect
def mock_connect(database, *args, **kwargs):
    if "checkpoints.db" in database:
        return original_connect(TEST_DB_PATH, *args, **kwargs)
    return original_connect(database, *args, **kwargs)
aiosqlite.connect = mock_connect

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
original_from_conn_string = AsyncSqliteSaver.from_conn_string
@classmethod
def mock_from_conn_string(cls, conn_string, *args, **kwargs):
    if "checkpoints.db" in conn_string:
        return original_from_conn_string(TEST_DB_PATH, *args, **kwargs)
    return original_from_conn_string(conn_string, *args, **kwargs)
AsyncSqliteSaver.from_conn_string = mock_from_conn_string

# Redefine the Lock to be event-loop aware
_local_locks = {}
@property
def dynamic_lock(self):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop not in _local_locks:
        _local_locks[loop] = asyncio.Lock()
    return _local_locks[loop]

@dynamic_lock.setter
def dynamic_lock(self, value):
    pass

AsyncSqliteSaver.lock = dynamic_lock

# Import the main FastAPI app
from backend.app.main import app, redis_client, UserProfileExtraction, SmartRedisClient
import backend.app.main as main_module

# Patch SmartRedisClient to support delete method to prevent test crashes
async def mock_delete(self, key: str):
    if self.use_mock:
        mock_inst = self._get_mock()
        mock_inst.data.pop(key, None)
        mock_inst.expirations.pop(key, None)
        return 1
    try:
        return await self.redis.delete(key)
    except Exception:
        self.use_mock = True
        self._get_mock().data.pop(key, None)
        return 1

SmartRedisClient.delete = mock_delete

# Force SmartRedisClient to use the local in-memory mock client
redis_client.use_mock = True

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Remove old test DB if exists
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass
    yield
    # Cleanup test DB after session
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

@pytest.fixture(scope="session", autouse=True)
async def run_app_lifespan(setup_test_db):
    async with main_module.lifespan(app):
        yield

@pytest.fixture
def mock_llm_responses():
    # Setup AsyncMocks for LLM calls using object.__setattr__ to bypass Pydantic constraints
    mock_fast_router = AsyncMock()
    mock_expert = AsyncMock()
    mock_expert_tools = AsyncMock()
    mock_fast_router_tools = AsyncMock()
    mock_extractor = AsyncMock()
    import backend.app.agents.llms as llms_module
    
    object.__setattr__(llms_module.fast_router_llm, "ainvoke", mock_fast_router)
    object.__setattr__(llms_module.expert_llm, "ainvoke", mock_expert)
    object.__setattr__(llms_module.expert_llm_with_tools, "ainvoke", mock_expert_tools)
    object.__setattr__(llms_module.fast_router_llm_with_tools, "ainvoke", mock_fast_router_tools)
    object.__setattr__(llms_module.structured_extractor, "ainvoke", mock_extractor)
    
    from langchain_core.messages import AIMessage
    # Defaults
    router_res = AIMessage(content="SIMPLE")
    mock_fast_router.return_value = router_res
    
    expert_res = AIMessage(content="This is a mock response from the expert agent.")
    mock_expert.return_value = expert_res
    mock_expert_tools.return_value = expert_res
    
    extractor_res = UserProfileExtraction(
        favorite_players=["virat kohli"],
        favorite_teams=["india"],
        expertise_level="Expert",
        preferred_format=["T20"],
        rival_teams=["australia"],
        verbosity_level="Standard"
    )
    mock_extractor.return_value = extractor_res

    return {
        "fast_router_llm": llms_module.fast_router_llm,
        "expert_llm": llms_module.expert_llm,
        "expert_llm_with_tools": llms_module.expert_llm_with_tools,
        "fast_router_llm_with_tools": llms_module.fast_router_llm_with_tools,
        "structured_extractor": llms_module.structured_extractor
    }

@pytest.fixture
async def client():
    import httpx
    # Ensure Turnstile verification is bypassed in tests
    main_module.TURNSTILE_SECRET_KEY = ""
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def authenticated_client(client):
    # Setup a mock registered user
    username = "testuser"
    email = "testuser@gmail.com"
    password = "Password123!"
    
    # Register the user directly in DB
    from backend.app.main import hash_password
    async with aiosqlite.connect(TEST_DB_PATH) as conn:
        pwd_hash = hash_password(password)
        await conn.execute(
            "INSERT OR IGNORE INTO users (username, email, password_hash, auth_provider, display_name, plan) VALUES (?, ?, ?, 'local', ?, 'free')",
            (username, email, pwd_hash, username)
        )
        await conn.commit()

    # Log in to get token
    login_payload = {
        "username": username,
        "password": password,
        "turnstile_token": "mock_token"
    }
    
    res = await client.post("/auth/login", json=login_payload)
    assert res.status_code == 200
    token = res.json()["token"]
    
    # Configure authorization header
    client.headers = {
        "Authorization": f"Bearer {token}"
    }
    
    yield client
