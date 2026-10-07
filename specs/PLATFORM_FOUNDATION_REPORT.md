# Platform Foundation Report

This report documents the shared infrastructure components introduced during the **Platform Foundation Sprint**, which precedes the extraction of the Chat, Live Scores, and LangGraph agent modules.

---

## 1. Shared Components Introduced

### `backend/app/core/database.py` — `DatabaseProvider`

A centralized, async-safe database connection manager.

```python
class DatabaseProvider:
    def __init__(self, db_path: str = settings.DATABASE_PATH): ...
    
    @asynccontextmanager
    async def get_db(self) -> AsyncGenerator[aiosqlite.Connection, None]: ...
```

**Responsibilities:**
*   Wraps `aiosqlite.connect(...)` with the correct database path from settings.
*   Applies `conn.row_factory = aiosqlite.Row` automatically for every connection.
*   Exposes a reusable `async with self.db_provider.get_db() as conn:` interface across all repositories.

---

### `backend/app/core/redis_keys.py` — `RedisKeys`

A centralized Redis key formatting registry. No Redis key string should be manually interpolated outside this class.

| Method | Returns |
| :--- | :--- |
| `RedisKeys.session(token)` | `session:{token}` |
| `RedisKeys.global_user_profile(username)` | `global_user_profile:{username}` |
| `RedisKeys.usage(username, date_str)` | `usage:{username}:{date_str}` |
| `RedisKeys.sqlite_backup()` | `sqlite_backup` |
| `RedisKeys.user_account(username)` | `user:account:{username}` |
| `RedisKeys.user_email(email)` | `user:email:{email}` |
| `RedisKeys.chat_names(username)` | `chat_names:{username}` |
| `RedisKeys.chat_history(username, session_id)` | `chat:{username}:{session_id}` |

---

### `backend/app/core/base_service.py` — `BaseService`

A shared base class for all service layers providing common logging, validation, and structured error handling.

```python
class BaseService:
    def __init__(self, service_name: str): ...
    def handle_error(self, operation, error, status_code=500, detail="..."): ...
    def validate_condition(self, condition, status_code=400, detail="..."): ...
```

**Responsibilities:**
*   Initializes a named `self.logger` for every service (no more module-level `logger = logging.getLogger(...)` duplication).
*   `handle_error()` logs exceptions and raises `HTTPException`, transparently re-raising `HTTPException` instances without wrapping.
*   `validate_condition()` replaces repetitive `if not x: raise HTTPException(...)` guard blocks.

---

## 2. Duplicated Code Removed

| Pattern | Files Previously Affected | Resolution |
| :--- | :--- | :--- |
| `async with aiosqlite.connect(self.db_path) as conn: conn.row_factory = ...` | `user_repository.py`, `notification_repository.py`, `profile_repository.py` | Replaced with `DatabaseProvider.get_db()` |
| `logger = logging.getLogger("crickait-backend")` | `auth_service.py`, `notification_service.py`, `profile_service.py` | Replaced with `BaseService.__init__` (sets `self.logger`) |
| `f"session:{token}"`, `f"global_user_profile:{username}"`, etc. | `auth_service.py`, `profile_service.py`, `core/security.py`, `api/auth.py` | Replaced with `RedisKeys.*()` calls |
| `raise HTTPException(status_code=500, detail="...")` in except blocks | All three services | Replaced with `self.handle_error(...)` |
| `if not condition: raise HTTPException(status_code=400, ...)` | `auth_service.py`, `notification_service.py`, `profile_service.py` | Replaced with `self.validate_condition(...)` |

---

## 3. Modules Updated

| Module | Changes Made |
| :--- | :--- |
| `repositories/user_repository.py` | Uses `DatabaseProvider`; removed `aiosqlite` import |
| `repositories/notification_repository.py` | Uses `DatabaseProvider`; removed `aiosqlite` import |
| `repositories/profile_repository.py` | Uses `DatabaseProvider`; removed `aiosqlite` import |
| `services/auth_service.py` | Inherits `BaseService`; uses `RedisKeys` throughout |
| `services/notification_service.py` | Inherits `BaseService`; uses `validate_condition` and `handle_error` |
| `services/profile_service.py` | Inherits `BaseService`; uses `RedisKeys` throughout |
| `core/security.py` | Uses `RedisKeys.session()` in `get_current_user` |
| `api/auth.py` | Uses `RedisKeys.session()` in `logout` handler |

---

## 4. Architecture Improvements

*   **Single Source of Truth for Database Path:** Previously, every repository was given `db_path` individually. Now `DatabaseProvider` encapsulates it.
*   **Single Source of Truth for Redis Keys:** All key format strings are in `redis_keys.py`. Renaming a key requires changing only one location.
*   **Uniform Exception Handling:** `BaseService.handle_error()` guarantees that all unhandled service exceptions are logged and surfaced as `500 Internal Server Error` responses in a consistent format.
*   **Uniform Validation Pattern:** `BaseService.validate_condition()` eliminates the repetitive guard pattern across all service methods.

---

## 5. Verification

*   Executed: `python3 -m pytest backend/ -v`
*   Result: **36 / 36 tests passed**
*   No regressions introduced.

---

## 6. Remaining Raw Redis Keys (Deferred)

The following raw Redis key interpolations remain inside `backend/app/main.py` (lines 308, 710). These are inside **LangGraph agent nodes** which are explicitly out of scope for this sprint:

| Location | Key Pattern | Deferred Reason |
| :--- | :--- | :--- |
| `main.py:308` | `f"global_user_profile:{username}"` | Inside LangGraph profile extractor node |
| `main.py:710` | `f"usage:{username}:{today}"` | Inside LangGraph rate-limit guard |

These will be migrated to `RedisKeys` when the **Chat / LangGraph extraction sprint** begins.

---

## 7. Future Platform Work

*   **`BaseRepository`:** A common base class for repositories providing connection lifecycle management should be introduced once the repository count grows beyond 5.
*   **`BaseResponse`:** A standard response envelope schema (`{"status": ..., "data": ...}`) can be introduced in `schemas/` before the frontend API contract is frozen.
*   **Structured Logging:** `self.logger` currently emits plain strings; structured JSON logging via a library like `structlog` should be considered before production deployment.
