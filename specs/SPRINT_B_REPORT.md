# Sprint B: Nodes and State Extraction Report

This report documents the extraction of the LangGraph Nodes and `AgentState` schema from `backend/app/main.py` to their dedicated files in `backend/app/agents/`, completing Phase 2 of the AI Platform Refactor.

---

## 1. Overview
Sprint B focused strictly on separating the execution logic (Nodes) and the memory schema (AgentState) from the graph compilation logic.

**Status:** Completed. All 38 regression tests and 3 new node/state unit tests pass successfully.

---

## 2. Files Extracted & Created

### State (`backend/app/agents/state.py`)
*   The `AgentState` class inheriting from `MessagesState` was cleanly extracted.
*   **Checkpoint Compatibility:** Zero fields were added, removed, or renamed. The typing (`Annotated`, `operator.add`, `operator.ior`) was strictly preserved, guaranteeing that all existing binary SQLite checkpoints will deserialize without throwing a `KeyError` or schema mismatch.

### Shared LLMs (`backend/app/agents/llms.py`)
*   To prevent circular dependencies between `main.py` (which compiles the graph) and the individual nodes (which require LLMs), all LLM instantiations (`fast_router_llm`, `expert_llm`, `expert_llm_with_tools`, `structured_extractor`) were moved into a shared `llms.py` module.

### Nodes Directory (`backend/app/agents/nodes/`)
All four AI processing nodes were successfully decoupled:
*   `profile_extractor_node.py`
*   `router_node.py`
*   `summarizer_node.py`
*   `expert_node.py`

Each node now imports its required system prompts from `loader.py` and its required LLMs from `llms.py`.

---

## 3. Risks Mitigated
*   **Circular Imports:** By establishing `llms.py` as a foundational leaf node for model initialization, the nodes can import the models without referencing `main.py`.
*   **Graph Breakage:** The graph compilation itself (`workflow = StateGraph(AgentState)`, `workflow.add_node(...)`, `workflow.add_edge(...)`) was intentionally left inside `main.py`. This ensured no routing bugs were introduced.

---

## 4. Next Steps
With Prompts, Tools, Nodes, and State cleanly extracted, `main.py` is now heavily streamlined. It only contains the Graph Compilation and FastAPI routes.
**Sprint C (Graph & Checkpoints)** is the next target, which will extract the `workflow` definitions and the SQLite Checkpointer logic out of `main.py`.
