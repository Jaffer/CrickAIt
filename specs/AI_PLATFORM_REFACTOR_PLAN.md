# AI Platform Refactor Plan

This document outlines the step-by-step execution plan for extracting the AI Engine from `backend/app/main.py` into the target `backend/app/agents/` structure defined in `AI_PLATFORM_ARCHITECTURE.md`.

To minimize risk, the extraction is divided into four distinct bounded sprints.

---

## Sprint A: Tools & Prompts Extraction

**Goal:** Remove string literals and raw API calls from the AI logic.

**Tasks:**
1.  Create `backend/app/agents/prompts/` directory.
2.  Extract `STRICT_SYSTEM_PROMPT` into `expert_system.txt`.
3.  Extract router, summarizer, and extractor prompt strings into their respective `.txt` files.
4.  Create `backend/app/agents/tools/` directory.
5.  Extract `get_historical_context`, `fetch_live_web`, and `fetch_player_and_live_matches` into `historical.py`, `live_web.py`, and `cricapi_tool.py`.
6.  Refactor `fetch_player_and_live_matches` to use `CricAPIProvider` instead of a raw HTTP client.
7.  Update `main.py` to import these tools and load prompts from files.
8.  **Verification:** Run `pytest` to ensure the monolithic graph still compiles and operates with externalized tools and prompts.

---

## Sprint B: Nodes & State Extraction

**Goal:** Decouple LangGraph business logic from the FastAPI routing file.

**Tasks:**
1.  Create `backend/app/agents/state.py` and move `AgentState` definition there.
2.  Create `backend/app/agents/nodes/` directory.
3.  Extract `profile_extractor_node` -> `nodes/profile_extractor.py`.
4.  Extract `router_node` -> `nodes/router.py`.
5.  Extract `expert_node` -> `nodes/expert.py`.
6.  Extract `summarizer_node` -> `nodes/summarizer.py`.
7.  Update `main.py` to import these nodes and the `AgentState`. Ensure LLM models (`ChatGroq`) are passed appropriately or initialized within a shared context to avoid circular imports.
8.  **Verification:** Run `pytest` to ensure graph edges correctly resolve the newly imported node functions.

---

## Sprint C: Graph Compilation & Checkpoint Extraction

**Goal:** Completely remove LangGraph compilation and SQLite management from `main.py`.

**Tasks:**
1.  Create `backend/app/agents/checkpoints/backup_service.py` and move the `backup_sqlite_to_redis()` logic there.
2.  Create `backend/app/agents/graph.py`.
3.  Move the `StateGraph` definitions, `add_node`, `add_edge`, and `add_conditional_edges` logic into a builder function (e.g., `build_graph()`) inside `graph.py`.
4.  Create `backend/app/services/ai_service.py` (inheriting from `BaseService`). Move the graph compilation (`workflow.compile(checkpointer=...)`) and invocation logic (`agent.ainvoke()`) into this service.
5.  Update `main.py`'s lifespan manager to initialize the `AIService` and start the `BackupService`.
6.  **Verification:** Run `pytest`. At this point, the LangGraph architecture is fully modularized.

---

## Sprint D: API Extraction & Streaming (Future)

**Goal:** Finalize the cleanup of `main.py` and implement real-time streaming.

**Tasks:**
1.  Create `backend/app/api/chat.py`.
2.  Move `/ask`, `/history`, `/clear`, `/rename`, `/auto-rename`, and `/session-names` endpoints into the new router.
3.  Register `chat_router` in `main.py`.
4.  *Optional Enhancement:* Refactor `AIService.ask()` to use `astream_events` and update the `/ask` endpoint to return a `StreamingResponse` (Server-Sent Events) to the frontend.
5.  **Verification:** Complete full end-to-end frontend testing to ensure the chat interface operates correctly, especially if streaming is enabled.

---

## Rules of Engagement

*   **No Behaviour Changes:** During Sprints A, B, and C, absolutely no AI behavior, prompt content, or API responses may change. This is strictly structural refactoring.
*   **One Sprint at a Time:** A sprint must be completed, tested, and verified before the next begins. Do not merge tasks from Sprint B into Sprint A.
*   **Test-Driven Execution:** Run `python3 -m pytest backend/ -v` after every single file creation. A broken graph compilation will fail immediately in the test suite.
