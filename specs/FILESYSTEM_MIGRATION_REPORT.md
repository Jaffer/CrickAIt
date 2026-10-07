# CrickAIt Filesystem Migration Report

This report summarizes the repository-wide filesystem reorganization performed on July 14, 2026. The objective of this migration was to organize the codebase into a clean, modular structure without modifying any application runtime logic, database engines (SQLite), or frontend state architectures.

---

## 1. Folders Created

The following directories were created to support the new structured layout:

### Backend Structure
*   `backend/` - Main container for python backend code.
*   `backend/app/` - FastAPI application container.
*   `backend/app/api/` - Future controller/routing package.
*   `backend/app/agents/` - Future LangGraph agent workflow package.
*   `backend/app/core/` - Core configuration and safety mechanisms.
*   `backend/app/middleware/` - Middleware (CORS, Rate limits) container.
*   `backend/app/models/` - DB models (Postgres migration mappings).
*   `backend/app/providers/` - External API wrappers and RAG builders.
*   `backend/app/repositories/` - Persistence repositories.
*   `backend/app/schemas/` - request/response validation schemas.
*   `backend/app/services/` - Business logic services.
*   `backend/app/prompts/` - Version-controlled AI prompts.
*   `backend/app/utils/` - Global helpers and utilities.
*   `backend/app/legacy/` - Streamlit and developer scratch files.
*   `backend/tests/` - Backend verification test suite.

### Frontend Structure
*   `frontend/src/public/` - Public assets.
*   `frontend/src/hooks/` - Custom react hooks.
*   `frontend/src/contexts/` - React contexts.
*   `frontend/src/styles/` - CSS sheets.
*   `frontend/src/layouts/` - Page layout templates.
*   `frontend/src/pages/` - Main views.
*   `frontend/src/types/` - Type declarations.
*   `frontend/src/utils/` - Frontend helpers.
*   `frontend/src/assets/` - Image and vector resources.

### Document & Data structures
*   `docs/architecture/` - Architecture context and guidelines.
*   `data/sqlite/` - SQLite databases.
*   `data/chat/` - Chat session archives.
*   `logs/` - Logs output location.

---

## 2. Files Moved

All active repository files were moved to their new organized destinations:

| Original Path | Migrated Path | Git Tracked |
| :--- | :--- | :--- |
| `main.py` | `backend/app/main.py` | Yes |
| `requirements.txt` | `backend/requirements.txt` | Yes |
| `retriever.py` | `backend/app/providers/retriever.py` | Yes |
| `vector_store_builder.py` | `backend/app/providers/vector_store_builder.py` | Yes |
| `data_loader.py` | `backend/app/providers/data_loader.py` | Yes |
| `document_embeddings.py` | `backend/app/providers/document_embeddings.py` | Yes |
| `vector_database.py` | `backend/app/providers/vector_database.py` | Yes |
| `demo for langgraph.py` | `backend/app/legacy/demo_for_langgraph.py` | Yes |
| `frontend.py` | `backend/app/legacy/frontend_streamlit.py` | Yes |
| `vector_db/` | `data/vector_db/` | Yes |
| `checkpoints.db` | `data/sqlite/checkpoints.db` | No (ignored) |
| `checkpoints.db-wal` | `data/sqlite/checkpoints.db-wal` | No (ignored) |
| `checkpoints.db-shm` | `data/sqlite/checkpoints.db-shm` | No (ignored) |
| `checkpoints.sqlite` | `data/sqlite/checkpoints.sqlite` | No (ignored) |
| `chat_sessions.json` | `data/chat/chat_sessions.json` | No (ignored) |
| `server.log` | `logs/server.log` | No (ignored) |
| `frontend/src/style.css` | `frontend/src/styles/style.css` | Yes |
| `docs/00_PROJECT_CONTEXT.md` | `docs/architecture/00_PROJECT_CONTEXT.md` | Yes |
| `docs/01_PRODUCT_REQUIREMENTS.md` | `docs/architecture/01_PRODUCT_REQUIREMENTS.md` | Yes |
| `docs/02_SYSTEM_ARCHITECTURE.md` | `docs/architecture/02_SYSTEM_ARCHITECTURE.md` | Yes |
| `docs/03_DATABASE_SCHEMA.md` | `docs/architecture/03_DATABASE_SCHEMA.md` | Yes |
| `docs/04_API_SPEC.md` | `docs/architecture/04_API_SPEC.md` | Yes |
| `docs/05_FRONTEND_GUIDELINES.md` | `docs/architecture/05_FRONTEND_GUIDELINES.md` | Yes |
| `docs/06_BACKEND_GUIDELINES.md` | `docs/architecture/06_BACKEND_GUIDELINES.md` | Yes |
| `docs/07_AI_ARCHITECTURE.md` | `docs/architecture/07_AI_ARCHITECTURE.md` | Yes |

---

## 3. Path & Import References Updated

The codebase was scanned and all paths, imports, and startup configs were updated to ensure clean executions:

1.  **SQLite Checkpoints Connection:**
    All database paths in [main.py](file:///home/eb157/CrickAIt/backend/app/main.py) were redirected from `"checkpoints.db"` to `"data/sqlite/checkpoints.db"`. This includes setup, read, write, connection pooling, and emergency lifespan backup checks.
2.  **Vector DB Mappings:**
    Paths inside [retriever.py](file:///home/eb157/CrickAIt/backend/app/providers/retriever.py) and [vector_store_builder.py](file:///home/eb157/CrickAIt/backend/app/providers/vector_store_builder.py) were updated from `"vector_db/"` to `"data/vector_db/"`.
3.  **Frontend Stylesheet Import:**
    The CSS path in [main.jsx](file:///home/eb157/CrickAIt/frontend/src/main.jsx) was updated from `import './style.css'` to `import './styles/style.css'`.
4.  **Process Boot Coordinator:**
    Startup file [start.sh](file:///home/eb157/CrickAIt/start.sh) was adjusted to invoke `uvicorn backend.app.main:app` and `streamlit run backend/app/legacy/frontend_streamlit.py`.

---

## 4. Verification Check Outcomes

*   **Python Import Resolution:** `PASS`. Verification script successfully imported `backend.app.main` with zero parsing or import dependency errors.
*   **Vite CSS Integration:** `PASS`. Running `npm run build` inside `frontend/` resolved all assets and successfully compiled production files with no CSS warnings.
*   **Lifespan Startup & Shutdown Test:** `PASS`. Running uvicorn against `backend.app.main:app` verified database sync checks, loaded settings, performed the emergency backup to the new `data/sqlite/` path, and terminated gracefully.

---

## 5. Potential Issues & Manual Actions

*   **Production envs (Render/Vercel):**
    If the Render backend service uses `main:app` as its execution target, it must be updated in Render dashboard to `backend.app.main:app`.
*   **Local SQLite Databases:**
    Existing database checks will now read and write to `data/sqlite/checkpoints.db`. The old checkpoints database is safely relocated and has been validated as readable.
