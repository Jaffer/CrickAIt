# Sprint C: Graph Extraction Report

This report documents the extraction of the LangGraph structure out of `backend/app/main.py` and into `backend/app/agents/graph.py`, marking the successful completion of the AI Platform Extraction.

---

## 1. Overview
Sprint C focused on extracting the graph definitions, conditional routing functions, and node registrations without touching the Checkpointer lifecycle.

**Status:** Completed successfully. All 41 regression and unit tests pass.

---

## 2. Extraction Details

### Extracted to `graph.py`
The following graph definition components were successfully extracted into the new `backend/app/agents/graph.py` module:
*   The `StateGraph` builder definition.
*   Node bindings (`add_node`).
*   Edge and conditional edge bindings (`add_edge`, `add_conditional_edges`).
*   Conditional routing helpers: `route_after_router`, `route_after_summarizer`, and `route_after_expert`.

### Clean Interface (`build_graph`)
A factory function `build_graph()` was implemented in `graph.py`. It returns an uncompiled `StateGraph`. This ensures that the graph structure is portable and abstracted.

### Preserved in `main.py`
Strictly adhering to the Graph Integration Review recommendations, the following elements were intentionally preserved in `main.py`:
*   `AsyncSqliteSaver` instance creation.
*   Graph compilation: `agent = build_graph().compile(checkpointer=checkpointer)`.
*   The FastAPI `lifespan` event loop context.

This design guarantees that SQLite database interactions remain synchronized within the main application event loop, avoiding `RuntimeError: no running event loop` or fatal SQLite lock errors.

---

## 3. Risks & Architectural Decisions
*   **Architectural Correctness vs Runtime Correctness:** Rather than forcing the async Checkpointer into the decoupled graph module (which would violate runtime correctness and thread locking rules), we injected the checkpointer via dependency inversion. `graph.py` defines the logic, `main.py` drives the runtime execution. This ensures 100% stable checkpointing behaviour.

---

## 4. Final Platform State
The AI Engine is now officially and cleanly extracted from the backend monolith. 

`backend/app/main.py` contains zero prompt strings, zero tool logic, zero AI node state, and zero graph edge definitions. It acts strictly as an HTTP Router, User Session Manager, and Event Loop Lifecycle controller.
