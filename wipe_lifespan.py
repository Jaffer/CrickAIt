with open('backend/app/main.py', 'r') as f:
    content = f.read()

start_idx = content.find("@asynccontextmanager")
end_idx = content.find("from backend.app.api.auth import router as auth_router", start_idx)

if end_idx == -1:
    end_idx = content.find("@app.post(\"/rename/{session_id}\")", start_idx)

new_lifespan = """@asynccontextmanager
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
            await conn.execute(\"\"\"
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
            \"\"\")
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
            await conn.execute(\"\"\"
            CREATE TABLE IF NOT EXISTS notifications (
                id          TEXT PRIMARY KEY,
                username    TEXT,
                title       TEXT NOT NULL,
                message     TEXT NOT NULL,
                type        TEXT DEFAULT 'info',
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at  TIMESTAMP
            )
            \"\"\")
            await conn.execute(\"\"\"
            CREATE TABLE IF NOT EXISTS notification_reads (
                username    TEXT NOT NULL,
                notif_id    TEXT NOT NULL,
                PRIMARY KEY (username, notif_id)
            )
            \"\"\")
    except Exception as e:
        logger.error("Failed to initialize notifications tables: %s", e)

    # Create password_resets table
    try:
        async with DatabaseProvider.get_db() as conn:
            await conn.execute(\"\"\"
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            \"\"\")
    except Exception as e:
        logger.error("Failed to initialize password_resets table: %s", e)

    checkpointer = AsyncPostgresSaver(DatabaseProvider._pool)
    await checkpointer.setup()
    agent = build_graph().compile(checkpointer=checkpointer)
    
    yield
    
    # Teardown
    await DatabaseProvider.close()

"""

content = content[:start_idx] + new_lifespan + content[end_idx:]

with open('backend/app/main.py', 'w') as f:
    f.write(content)

