# Reference Module Specification & Standard Template

This document defines the permanent backend architecture standard for CrickAIt. Every future module (e.g. Chat, Notifications, Profile, Live Scores, AI, Providers) must follow this template, layout, naming convention, and review checklist to ensure consistency across the codebase.

---

## 1. Module Architecture Standard

### Purpose
To establish a predictable, testable, and loosely coupled backend codebase by preventing monolith growth, flat script patterns, circular imports, and database access leaking.

### Folder Layout
Every backend module must be structured as follows:
```
backend/app/<module_name>/
├── api/
│   └── <module_name>.py         # HTTP routers and request adapters
├── services/
│   └── <module_name>_service.py # Pure business workflows and orchestrations
├── repositories/
│   └── <module_name>_repo.py    # Database query layer (SQLite/PostgreSQL)
├── schemas/
│   └── <module_name>_schemas.py # Pydantic request/response validation shapes
└── README.md                    # Module documentation and usage guide
```

### Naming Conventions
*   **Directory Name:** Singly named, lowercase, alphanumeric characters only (e.g. `auth`, `chat`, `notifications`).
*   **Files Name:** Lowercase with underscores, matching layer responsibility (e.g. `chat_service.py`, `chat_repo.py`).
*   **Service Classes:** UpperCamelCase suffixed with `Service` (e.g. `ChatService`, `NotificationService`).
*   **Repository Classes:** UpperCamelCase suffixed with `Repository` (e.g. `UserRepository`, `ChatRepository`).
*   **Pydantic Models:** UpperCamelCase suffixed with `Request` or `Response` (e.g. `AskRequest`, `SessionResponse`).

---

## 2. Reusable Backend Module Template

Below is the canonical code skeleton for a new module named `item`.

### 1. Schemas Layer (`schemas/item_schemas.py`)
```python
from pydantic import BaseModel, Field
from typing import Optional

class ItemCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)

class ItemResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    owner_username: str
```

### 2. Repository Layer (`repositories/item_repo.py`)
```python
import aiosqlite
from typing import Optional, List, Dict, Any
from backend.app.config.settings import settings

class ItemRepository:
    def __init__(self, db_path: str = settings.DATABASE_PATH):
        self.db_path = db_path

    async def create_item(self, item_id: str, name: str, description: Optional[str], owner_username: str) -> None:
        async with aiosqlite.connect(self.db_path) as conn:
            await conn.execute(
                "INSERT INTO items (id, name, description, owner_username) VALUES (?, ?, ?, ?)",
                (item_id, name, description, owner_username)
            )
            await conn.commit()

    async def get_item_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as conn:
            conn.row_factory = aiosqlite.Row
            async with conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)) as c:
                row = await c.fetchone()
                return dict(row) if row else None
```

### 3. Service Layer (`services/item_service.py`)
```python
import uuid
from typing import Optional, Dict, Any
from fastapi import HTTPException
from backend.app.schemas.item_schemas import ItemCreateRequest
from backend.app.repositories.item_repo import ItemRepository

class ItemService:
    def __init__(self, item_repo: Optional[ItemRepository] = None):
        self.item_repo = item_repo or ItemRepository()

    async def create_new_item(self, request: ItemCreateRequest, username: str) -> Dict[str, Any]:
        if not username:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        item_id = uuid.uuid4().hex
        await self.item_repo.create_item(
            item_id=item_id,
            name=request.name,
            description=request.description,
            owner_username=username
        )
        return {"id": item_id, "status": "created"}
```

### 4. API Router Layer (`api/item.py`)
```python
from fastapi import APIRouter, Depends
from backend.app.schemas.item_schemas import ItemCreateRequest
from backend.app.services.item_service import ItemService
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/items", tags=["items"])
item_service = ItemService()

@router.post("")
async def create_item(request: ItemCreateRequest, username: str = Depends(get_current_user)):
    return await item_service.create_new_item(request, username)
```

---

## 3. Engineering & Testing Standards

### Coding Standards
*   **Layer Boundaries:** Never import `aiosqlite` or write SQL statements outside `repositories/`.
*   **Dependency Injection:** Support optional repository injection inside Service constructors to simplify testing.
*   **Data Translation:** Keep database model logic and JSON validation schemas decoupled.

### Testing Requirements
*   **Coverage:** Every new module must reach a minimum statement coverage of **35%**.
*   **Test Isolation:** Integration tests must run against isolated test databases and mock Redis configurations.
*   **Mock Implementation:** Mock external API calls (e.g. LLM routing, Wikipedia, Tavily searches) inside [conftest.py](file:///home/eb157/CrickAIt/backend/tests/conftest.py).

---

## 4. Module Development Checklist

Use this checklist when developing a new backend module:

### Phase 1: Planning & Specification
- [ ] Research and document requirements.
- [ ] Define the database schema modifications if needed.
- [ ] Define endpoint path design and output formats.

### Phase 2: Schemas & Data Layer
- [ ] Implement input validation schemas inside `schemas/<module_schemas>.py`.
- [ ] Implement standard data queries inside `repositories/<module_repo>.py`.
- [ ] Test the database queries in isolation.

### Phase 3: Core Business & API Routing
- [ ] Implement workflows and domain logic inside `services/<module_service>.py`.
- [ ] Mount endpoints inside `api/<module>.py`.
- [ ] Register the new router in the main application instance (`main.py`).

### Phase 4: Test & Verify
- [ ] Write unit tests for services using mocks.
- [ ] Run the complete test suite: `python3 -m pytest backend/`.
- [ ] Verify that all 36+ existing regression checks pass cleanly.
- [ ] Verify that overall coverage is maintained or improved.

---

## 5. Pull Request & Code Review Checklists

### Pull Request Checklist
*Contributors must check all items before submitting their code for review:*
- [ ] **No SQL in Routers:** Verify no SQL queries are written in routes or service files outside of repository files.
- [ ] **No Business Logic in Routers:** Verify HTTP handlers only act as adapters.
- [ ] **Imports Resolution:** Verify all imports use absolute package syntax.
- [ ] **No Circular Imports:** Check for circular dependencies.
- [ ] **Tests & Coverage:** Verify all backend tests pass, and coverage has not dropped.
- [ ] **Test DB Isolation:** Ensure tests do not overwrite production checkpoint databases.
- [ ] **Documentation:** Ensure the module README and Progress tracking files are updated.

### Code Review Checklist
*Reviewers must confirm the following conditions before approving the PR:*
1.  **Architecture Conformity:** Does the file structure match the specified layered layout?
2.  **No Leaked DB Models:** Are database rows cast to Python structures before returning?
3.  **Exception Cleanliness:** Are database exceptions caught and converted to clean HTTP exceptions?
4.  **No Dot Env Calls:** Are settings loaded only from the settings module?
5.  **State Isolation:** Does the class avoid storing client request context in global class properties?

---

## 6. Definition of Done (DoD)
A module is considered **Done** only when it meets the following criteria:
*   [x] Clean layered directory layout is used.
*   [x] Router is registered in `main.py` without circular imports.
*   [x] All tests run and pass successfully.
*   [x] Statement coverage of the new code is at least **35%**.
*   [x] Database calls do not leak outside of repositories.
*   [x] Progress log tracking sheets are updated.
