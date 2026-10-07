import re

with open('backend/app/main.py', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver", "from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver\nfrom backend.app.core.database import DatabaseProvider")
content = content.replace("import aiosqlite\n", "")
content = content.replace("from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver", "")

# 2. Remove backup_sqlite_to_redis completely
start_backup = content.find("async def backup_sqlite_to_redis():")
end_backup = content.find("@asynccontextmanager", start_backup)
content = content[:start_backup] + content[end_backup:]

# 3. Rewrite lifespan
start_lifespan = content.find("@asynccontextmanager")
end_lifespan = content.find("from backend.app.api.auth import router as auth_router", start_lifespan)
if end_lifespan == -1: # just in case
    end_lifespan = content.find("app.include_router(auth_router)", start_lifespan) - 60

lifespan_new = """@asynccontextmanager
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
content = content[:start_lifespan] + lifespan_new + content[end_lifespan:]

# 4. Rewrite routes
# list_sessions
content = content.replace('''        async with aiosqlite.connect("data/sqlite/checkpoints.db") as conn:
            pattern = f"{username}:%"
            async with conn.execute("SELECT DISTINCT thread_id FROM checkpoints WHERE thread_id LIKE ?", (pattern,)) as cursor:
                rows = await cursor.fetchall()
                sessions = [row[0].split(":", 1)[1] for row in rows if ":" in row[0]]
                return {"sessions": sessions}''',
'''        async with DatabaseProvider.get_db() as conn:
            pattern = f"{username}:%"
            rows = await conn.fetch("SELECT DISTINCT thread_id FROM checkpoints WHERE thread_id LIKE $1", pattern)
            sessions = [row[0].split(":", 1)[1] for row in rows if ":" in row[0]]
            return {"sessions": sessions}''')

# ask endpoint
content = content.replace('''        async with aiosqlite.connect("data/sqlite/checkpoints.db") as conn:
            async with conn.execute("SELECT plan FROM users WHERE username = ?", (username,)) as c:
                row = await c.fetchone()
                plan = row[0] if row else 'free'
                
        # Guest accounts have 'guest_' prefix and circumvent the SQL user table''',
'''        async with DatabaseProvider.get_db() as conn:
            row = await conn.fetchrow("SELECT plan FROM users WHERE username = $1", username)
            plan = row[0] if row else 'free'
                
        # Guest accounts have 'guest_' prefix and circumvent the SQL user table''')

# clear_history endpoint
content = content.replace('''        async with aiosqlite.connect("data/sqlite/checkpoints.db") as conn:
            await conn.execute("DELETE FROM checkpoints WHERE thread_id = ?", (scoped_sid,))
            await conn.execute("DELETE FROM writes WHERE thread_id = ?", (scoped_sid,))
            await conn.commit()''',
'''        async with DatabaseProvider.get_db() as conn:
            await conn.execute("DELETE FROM checkpoints WHERE thread_id = $1", scoped_sid)
            await conn.execute("DELETE FROM writes WHERE thread_id = $1", scoped_sid)''')

# admin_get_users
content = content.replace('''        async with aiosqlite.connect("data/sqlite/checkpoints.db") as conn:
            async with conn.execute("SELECT username, email, auth_provider, plan, created_at FROM users") as cursor:
                rows = await cursor.fetchall()
                users = []
                for r in rows:
                    users.append({
                        "username": r[0],
                        "email": r[1],
                        "auth_provider": r[2],
                        "plan": r[3],
                        "created_at": r[4]
                    })
                return {"users": users}''',
'''        async with DatabaseProvider.get_db() as conn:
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
            return {"users": users}''')

# admin_upgrade_user
content = content.replace('''        async with aiosqlite.connect("data/sqlite/checkpoints.db") as conn:
            await conn.execute("UPDATE users SET plan = ? WHERE username = ?", (req.plan, req.username))
            await conn.commit()
            return {"status": "success", "message": f"User {req.username} upgraded to {req.plan}"}''',
'''        async with DatabaseProvider.get_db() as conn:
            await conn.execute("UPDATE users SET plan = $1 WHERE username = $2", req.plan, req.username)
            return {"status": "success", "message": f"User {req.username} upgraded to {req.plan}"}''')


with open('backend/app/main.py', 'w') as f:
    f.write(content)
