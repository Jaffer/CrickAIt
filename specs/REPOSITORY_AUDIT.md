# CrickAIt Repository Audit Report

**Author:** Principal Software Architect  
**Target System:** CrickAIt (Cricket AI Chatbot & Analytics Platform)  
**Date:** July 14, 2026  
**Status:** Confidential - Engineering Team Only  

---

## 1. Executive Summary

This audit evaluates the CrickAIt repository to assess its readiness for transitioning from a prototype to a production-grade SaaS product serving millions of users. While the product concept and tech stack selections (FastAPI, LangGraph, React, Redis) are sound, the current implementation exhibits significant architectural limitations, scalability bottlenecks, security vulnerabilities, and code quality concerns.

### Scorecard (out of 10)

*   **Overall Architecture Quality:** `4/10` – Monolithic backend architecture with poor separation of concerns. Violates the layered architecture principles outlined in the system design guidelines.
*   **Overall Code Quality:** `3/10` – High presence of duplicate logic, massive single files (e.g., 2,490-line `main.py`, 70KB `AuthOverlay.jsx`), and inline SQL queries.
*   **Technical Debt:** `3/10` – High technical debt across database design, API design, and AI routing.
*   **Maintainability:** `3/10` – Hard to maintain due to the lack of modularity, absent abstraction layers, and massive monolithic files.
*   **Scalability:** `2/10` – Major scalability blockers, particularly the SQLite-to-Redis file backup synchronization mechanism, which prevents horizontal scaling.
*   **Security:** `4/10` – Vulnerable to session hijacking (plain UUID tokens), missing CSRF protections, loose CORS configs, and silent Turnstile security bypasses.
*   **Testing:** `0/10` – Complete absence of unit, integration, or end-to-end tests across the entire repository.
*   **Performance:** `4/10` – High risk of performance degradation due to blocking database transactions, large bundle sizes, and un-optimized database file transfers.

---

## 2. Folder Structure Review

### Identified Issues
1.  **Monolithic Root Folder:** The root directory is cluttered with database files (`checkpoints.db`, `checkpoints.db-wal`, `checkpoints.db-shm`) and multiple disjoint, dead scripts (`data_loader.py`, `document_embeddings.py`, `vector_database.py`, `vector_store_builder.py`, `retriever.py`).
2.  **Lack of Backend Structure:** The backend has no `src/` or `app/` folder. All logic, endpoints, models, nodes, and configurations are packed inside a single `main.py` in the root.
3.  **Monolithic Frontend Components:** Large frontend component files and styles are grouped under `frontend/src/components` without division by feature (e.g., Auth, Chat, Admin, Settings).
4.  **Misplaced Data:** Raw CricSheet JSON files (`data/cricsheet_raw/`) reside inside the application structure, increasing repository size and backup times.

### Recommendations
*   **Reorganize the Repository:** Establish a clear separation between `backend/` and `frontend/` folders.
*   **Implement Layered Directories in Backend:**
    ```text
    backend/
    ├── app/
    │   ├── api/          # Routers and controllers
    │   ├── core/         # Config, security, exceptions
    │   ├── services/     # Business logic
    │   ├── repositories/ # SQL and DB access
    │   ├── agents/       # LangGraph agents and prompts
    │   └── providers/    # CricAPI, Cricbuzz scraper, Tavily adapters
    └── requirements.txt
    ```
*   **Reorganize Frontend by Feature:** Move common UI elements (Modals, Alerts, Overlays) into a `components/common/` folder, and group specialized widgets by feature (e.g., `features/chat/`, `features/matches/`).
*   **Expose Checkpoints DB Path:** Do not store the SQLite file in the root. Move it to a data volume or configure it to run in a dedicated data folder.

---

## 3. Backend Review

### FastAPI & Routing
*   **Critical Missing Route Decorator:** In `main.py` (line 1974), the function `async def get_scores` is defined but **lacks an `@app.get` decorator**. This completely breaks the `/live-scores` endpoint called by the React frontend (`LiveMatches.jsx:16`), returning a 404 for all authenticated score queries.
*   **Lack of Routing Separation:** All routes are registered directly on the `app` instance in `main.py`. This prevents modular router definitions via `fastapi.APIRouter`.

### Dependency Injection
*   **Absent Abstractions:** FastAPI's dependency injection (`Depends`) is solely used to verify the authenticated user (`get_current_user`). DB connections, Redis clients, HTTP client pools, and LangGroq models are loaded as global module-level variables. This makes unit testing and mocking nearly impossible.

### Business Logic & Utilities
*   **Scraping logic in API routes:** Synchronous/blocking HTML parsing via BeautifulSoup (`fetch_live_scores_from_cricbuzz`) is done inline inside the score preview and score endpoints. Under heavy concurrent load, parsing large pages synchronously will block the single-threaded asyncio event loop.
*   **Hardcoded Configuration:** Credentials, SMTP parameters, and model specs are loaded via `os.getenv` directly at the module level. There is no configuration class or validation (e.g., using `pydantic-settings`).

### Error Handling & Logging
*   **Orphaned Errors:** Backend routes catch general exceptions and dump traceback text into a single Redis key (`debug_last_error`). This is not a production-grade monitoring strategy and will overwrite previous tracebacks under concurrent errors.
*   **Lack of Centralized Error Handlers:** FastAPI exception handlers are not registered, causing endpoints to return generic 500 HTML/text responses on failure instead of structured error JSON formats.

### Streaming & Rate Limiting
*   **Blocking Chat Response:** The `/ask` endpoint operates synchronously relative to the client. It waits for the LangGraph agent to fully resolve the text before returning a standard JSON response. This violates the system architecture guideline requiring Server-Sent Events (SSE) or WebSockets for real-time text streaming.
*   **Inline Rate Limiting:** Daily limit checks and increments are coded inline inside the `/ask` controller, cluttering business logic instead of being isolated in a dedicated FastAPI middleware.

---

## 4. Frontend Review

### React Structure & State Management
*   **Prop Drilling:** Local state parameters (e.g., `userProfile`, `activeModal`, `customAlert`, `onLogout`) are drilled manually down multiple components (e.g., from `App` to `AppLayout` to `Sidebar` to `UserProfilePopover`). There is no global state manager (like Zustand or Redux) or React Context to share session states cleanly.
*   **Lack of Routing:** The application uses no routing library (like `react-router-dom`). Page navigation is simulated via conditional rendering based on state values (e.g., `activeNav === 'assistant'`). This renders URL bookmarking, history traversal, and deep linking impossible.

### Components & CSS
*   **God Components:** Component files are excessively large. For example, `AuthOverlay.jsx` is 70KB and mixes landing page assets, auth state forms, logic handlers, and inline layouts.
*   **Monolithic CSS:** A single 61KB `style.css` file holds all application styles, custom colors, animations, and custom typography variables. This prevents page-based code splitting and will result in high rendering layout thrashing.

### Performance & Accessibility
*   **No Virtualization:** Chat history and lists of sessions render all items directly in the DOM. Under long conversation threads, this will lead to high DOM memory footprint and sluggish scrolling.
*   **Poor Contrast & Semantics:** Many interactive components are generic `div` elements with custom click listeners, lacking appropriate ARIA attributes, semantic landmarks, and keyboard focus states.

---

## 5. AI Review

### LangGraph Agent & Prompts
*   **Fragile Router Node Parsing:** The `router_node` prompts the LLM to output "EXPERT" or "SIMPLE" and then parses the raw string response using `decision.content.upper()`. If the model adds conversational text (e.g., "This requires EXPERT resources"), the routing logic will fail. A structured Pydantic schema or JSON mode should be enforced.
*   **Date Hardcoding:** Today's date is hardcoded in the system prompt (`TODAY'S DATE: March 31, 2026.`). This will cause the system to become outdated as time passes. Dates should be injected dynamically at graph call time.
*   **Extractor Trigger Limits:** The `profile_extractor_node` only processes extraction if specific trigger words like "favorite" or "diehard fan" are found in the user query. This is highly fragile.

### Fallback Logic & Scale
*   **SQLite DB File Synchronization (Critical Scalability Blocker):** LangGraph checkpoints are saved using `AsyncSqliteSaver` in a local SQLite file (`checkpoints.db`). To support cloud hosting, the backend runs an asynchronous loop (`backup_sqlite_to_redis`) that reads the **entire SQLite binary file** and overwrites it to a single Redis key (`sqlite_backup`) every 60 seconds. On startup, it restores the file from Redis.
    *   *Horizontal Scaling Failure:* If scaled to multiple container instances, instance A and instance B will concurrently overwrite the single Redis key with their respective local database states, wiping out each other's session histories.
    *   *Performance issues:* Syncing entire database binary files over network connections every 60 seconds will cause severe database lock latency and network overhead as data grows.
*   **No Local RAG:** Despite having multiple RAG scripts (`vector_store_builder.py`, `retriever.py`), they are completely disconnected from the LangGraph agent in `main.py`. The agent relies entirely on Tavily searches and Wikipedia queries, wasting compute and missing specialized local CricSheet datasets.

---

## 6. Database Review

### SQLite Bottlenecks
*   SQLite lacks native connection pooling, row-level locks, and concurrent write performance. Under high concurrency, SQLite will lock the database write thread, causing the backend to throw `sqlite3.OperationalError: database is locked`.

### Missing Tables & Normalization
*   **Missing Core Tables:** The schema definitions in `docs/03_DATABASE_SCHEMA.md` specify tables for Matches, Innings, Score Events, Players, and Teams. However, the active database only contains tables for `users`, `notifications`, `notification_reads`, and `password_resets`. All live cricket information is fetched on the fly and discarded, limiting historical querying capabilities.
*   **Hardcoded SQL Queries:** All backend SQL is written as raw strings directly inside the API endpoints. There is no ORM (like SQLAlchemy or SQLModel) or Query Builder.

### Future PostgreSQL Migration
*   Since raw queries are written in SQLite-specific dialect (e.g., `INSERT OR IGNORE`), moving to PostgreSQL requires rewriting all database queries. Migration files or Alembic setup are absent.

---

## 7. Redis Review

### Fallback Safety Risk
*   `SmartRedisClient` silently falls back to an in-memory dictionary if the Redis connection fails. While helpful for offline local development, in a production cluster this fallback will result in:
    *   Bypassing API rate limits.
    *   Inconsistent user sessions across container nodes.
    *   Loss of global profile details.

### Caching & Key Management
*   **Hardcoded Caches:** News and live scores caches (`news_cache`, `live_scores_cache`) are stored in global variables inside the Python process rather than in Redis, meaning data is not shared across backend workers.
*   **Lack of TTL Structure:** Some backup keys (`sqlite_backup`, `user:account:*`) are stored in Redis without a Time-To-Live (TTL) expiration, risking memory exhaustion as user registration grows.

---

## 8. API Review

### Consistency & Naming
*   **Non-Compliant Endpoints:** The API Spec (`docs/04_API_SPEC.md`) states all endpoints must reside under `/api/v1`. The actual backend registers routes directly on root (e.g., `/ask`, `/sessions`, `/top-news`).
*   **Response Discrepancies:** The backend does not wrap API payloads inside a standard envelope (e.g., `{ "success": true, "data": ... }`). Error schemas are unstructured, and response parameters vary between JSON and plain string formats.

---

## 9. Security Review

### Session Validation & CORS
*   **UUID Session Identifiers:** Session tokens are simple UUID strings (`uuid.uuid4().hex`) generated and stored in Redis. These tokens do not carry cryptographic signatures, metadata, or expiration times, making them vulnerable to session hijacking and replay attacks.
*   **Loose CORS Regex:** CORS configurations allow any origin matching the regex `https://.*\.vercel\.app`. This allows any malicious Vercel deployment to query client resources.

### Turnstile & Secrets
*   **Silent Captcha Bypass:** If `TURNSTILE_SECRET_KEY` is not present in the environment variables, the backend logs a warning and bypasses security validation. This leaves registration endpoints vulnerable to bot spamming.
*   **Raw Password Reset OTPs:** OTP recovery tokens are sent as plain text and stored without hashing in the database, meaning database exposure compromises reset validity.

---

## 10. Performance Review

### Blocking Network Calls
*   RSS parsing inside `/news-preview` uses standard synchronous regex matching and synchronous network calls, blocking the event loop on slow upstream feeds.
*   The SQLite binary backup routine holds write locks on the database file, blocking user API writes during file transfers to Redis.

### Frontend Asset Sizes
*   The absence of code splitting, dynamic imports, and lazy loading for Modals means the entire bundle (including large markdown parsers and CSS overrides) must be parsed by the client on the initial landing page.

---

## 11. Code Smells

### God Objects & Duplication
*   **God File (`main.py`):** Holds backend configuration, database setup, route definitions, LangGraph nodes, BeautifulSoup scrapers, and SMTP email services.
*   **Scraper Code Duplication:** Cricbuzz parsing functions are duplicated across score aggregation tasks.
*   **Hardcoded Magic Values:** Groq model parameters and cutoff parameters are inline string definitions rather than configuration settings.

---

## 12. Documentation Review

*   There is no root `README.md` or system setup guide in the repository.
*   Code lacks developer inline documentation, docstrings, or type hint annotations on critical helper functions.
*   No developer workspace instructions exist for running tests or installing database drivers.

---

## 13. Testing Review

*   **Test Coverage: 0%**
*   No `pytest` setup or directory exists in the codebase.
*   No test configurations, environment variable mocks, or component testing structures are present in the frontend or backend.

---

## 14. Technical Debt

| Rank | Item | Severity | Impact |
|:---|:---|:---|:---|
| **1** | SQLite DB File to Redis Backup Synchronization | **Critical** | Prevents horizontal scaling; causes data corruption and loss. |
| **2** | Missing Route Decorator on `get_scores` | **Critical** | Completely breaks the `/live-scores` UI widget. |
| **3** | God Monolith `main.py` | **High** | Severe maintainability bottleneck; prevents code reviews and clean scaling. |
| **4** | Lacks React Routing (State-based Navigation) | **High** | Prevents bookmarking, deep-linking, and URL-based navigation. |
| **5** | Plain UUID Session Tokens (JWT Lack) | **High** | Security risk; open to session hijacking. |
| **6** | Lacks Database ORM and Abstractions | **High** | Blocks migration to PostgreSQL; queries are dialect-dependent. |
| **7** | Hardcoded Models and Today's Date | **Medium** | Model output degrades over time; increases API maintenance complexity. |
| **8** | Loose CORS Configurations | **Medium** | Potential cross-site request vulnerabilities. |

---

## 15. Refactoring Roadmap

### Phase 1: Core Bugs & Security (Immediate)
1.  **Expose Scores Endpoint:** Add the missing `@app.get("/live-scores")` decorator to `get_scores()` in `main.py` to fix the frontend widget.
2.  **Expose API Prefix:** Add a global routing prefix `/api/v1` to all routes using `fastapi.APIRouter`.
3.  **Upgrade Sessions to JWT:** Replace UUID tokens with cryptographic, signed JWT tokens storing expiration times.

### Phase 2: Decoupling & Modular Monolith (Short-Term)
1.  **Deconstruct `main.py`:** Move route files to `app/api/`, service logic to `app/services/`, and database queries to `app/repositories/`.
2.  **Implement ORM and Postgres:** Introduce SQLAlchemy/SQLModel and setup Alembic migrations to replace direct `aiosqlite` SQL strings.
3.  **Refactor Checkpoints Saver:** Replace the SQLite file synchronization hack with a Postgres database checkpoint saver (`PostgresSaver`) to enable horizontal scaling.

### Phase 3: AI Engine & Caching (Medium-Term)
1.  **Dynamic Date Injection:** Pass today's date programmatically into LangGraph state inputs instead of hardcoding it.
2.  **Implement Redis Caching Layer:** Move process-local news and matches caches to Redis to sync across multiple worker processes.
3.  **Integrate Local RAG:** Properly link the FAISS vector database scripts to the expert node to search local databases.

### Phase 4: Frontend Restructuring (Medium-Term)
1.  **Introduce React Router:** Implement `react-router-dom` for URL-based page navigation.
2.  **Incorporate Global State Manager:** Use Zustand to handle session state, user profiles, and modally triggered layouts.
3.  **Split Component Monoliths:** Break down `AuthOverlay.jsx` and `style.css` into modular components and modular CSS modules.

---

## 16. Future Risks

If the codebase continues to grow without architectural refactoring:
1.  **Data Loss & Desync:** Under multiple container nodes, users will experience frequent logouts and missing message history due to the Redis file-backup race condition.
2.  **Database Thread Locks:** Increased active users will cause database locks on SQLite, leading to API request drops and 500 errors.
3.  **Scale Blocking:** Inability to scale horizontally will limit maximum user capacity, preventing SaaS model validation.
4.  **Security Failures:** Bot account registration spam due to Turnstile bypasses and insecure passwords storage.

---

## 17. Positive Findings

*   **Technology Stack Choice:** The choice of FastAPI, React, and LangGraph is excellent for high-performance AI agents.
*   **Fallback mechanisms:** The `SmartRedisClient` fallback helper allows developers to run the application offline when local Redis docker setups are missing.
*   **Security Precautions:** Turnstile and email OTP recovery flows are well thought out, needing only code-level hardening.
*   **Modular Agent Design:** The agent state flow is logically sound and separates router responsibilities from content extraction.

---

## 18. Final Score

*   **Architecture:** `3/10`
*   **Maintainability:** `3/10`
*   **Scalability:** `2/10`
*   **Developer Experience:** `3/10`
*   **Security:** `4/10`
*   **Performance:** `4/10`
*   **AI Design:** `5/10`
*   **Overall Score:** `3.4/10`

---

## 19. Prioritized Engineering Tasks (Sorted by ROI)

### 1. Fix Missing Score route Decorator (ROI: High)
*   **Task:** Add `@app.get("/live-scores")` above `get_scores()` inside `main.py`.
*   **Impact:** Instantly restores live matches functionality on the React UI.

### 2. Implement Postgres Checkpoints Saver (ROI: High)
*   **Task:** Replace `AsyncSqliteSaver` and the `backup_sqlite_to_redis` asyncio loop with `PostgresSaver`.
*   **Impact:** Removes the critical database sync bottleneck, enabling horizontal scaling on Render.

### 3. Deconstruct `main.py` into Modules (ROI: High)
*   **Task:** Move routers, services, repository queries, and LangGraph nodes into separated subfolders.
*   **Impact:** Drastically improves maintainability and developer onboarding velocity.

### 4. Introduce Database ORM and Alembic Migrations (ROI: Medium)
*   **Task:** Implement SQLModel and run migrations for database schemas.
*   **Impact:** Simplifies SQL querying, prevents SQL injections, and allows seamless Postgres transitions.

### 5. Setup Unit & Integration Tests (ROI: Medium)
*   **Task:** Write basic unit tests for FastAPI controllers and LangGraph routing decisions using `pytest`.
*   **Impact:** Prevents regressions and code bugs under new feature developments.

### 6. Introduce React Router & Context (ROI: Medium)
*   **Task:** Set up routing and Zustand state stores in the React application.
*   **Impact:** Fixes page state sharing issues and allows direct URL bookmarks.
