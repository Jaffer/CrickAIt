# Graph Integration Review

**Date:** July 15, 2026
**Reviewer:** Principal AI Systems Architect
**Subject:** Readiness Assessment for LangGraph Extraction (Sprint C)

## Executive Summary
This review assesses whether the AI graph compilation (`workflow.add_node`, `workflow.add_edge`, `workflow.compile`) can be safely extracted from `backend/app/main.py` into `backend/app/agents/graph.py`. 

**Conclusion:** YES, the graph structure can be safely extracted, but **compilation with the checkpointer MUST remain tethered to the FastAPI lifespan.** Extracting the async `AsyncSqliteSaver` into a synchronous `graph.py` module level will cause SQLite database locking and event loop errors.

---

## 1. Node Interfaces
*   **Inputs/Outputs:** All nodes (`router_node`, `expert_node`, etc.) now strictly adhere to the `(state: AgentState)` signature and return delta dictionaries.
*   **State Mutations:** Nodes no longer perform side-effects outside of their bounded scope (except `profile_extractor` which correctly syncs with Redis). 
*   **Consistency:** The decoupling is complete. Nodes do not rely on variables scoped to `main.py`.

## 2. AgentState
*   **Field Ownership:** Owned exclusively by `backend/app/agents/state.py`.
*   **Reducers:** `operator.add` and `operator.ior` are preserved.
*   **Serialization:** Standard JSON serialization via LangGraph's checkpointer.
*   **Checkpoint Compatibility:** Fully compatible. No fields were altered.

## 3. LLM Layer
*   **Initialization:** Successfully centralized in `backend/app/agents/llms.py`.
*   **Reuse:** The shared instances prevent memory bloat and duplicate Groq clients.
*   **Tool Binding:** Tools are bound at initialization, keeping nodes clean.

## 4. Prompt Layer
*   **Loading:** Handled via `loader.py`.
*   **Caching:** `@lru_cache` ensures text files are not read from disk repeatedly.
*   **Versioning:** Prompts are now plain text, easily tracked in Git.

## 5. Tool Layer
*   **Responsibilities:** Isolated to `backend/app/agents/tools/`.
*   **Provider Usage:** The `CricAPIProvider` handles actual API execution, ensuring standard HTTP client reuse.

---

## 6. Dependency Graph
Currently, the dependencies flow downwards perfectly:
`main.py` -> `Nodes` -> `llms.py` -> `Tools` -> `Providers`

If we extract `graph.py`, the flow will be:
`main.py` -> `graph.py` -> `Nodes` -> `llms.py` -> `Tools`

**Hidden Coupling / Circular Dependencies:** None exist. The dependency tree is cleanly layered.

---

## 7. Graph Compilation Readiness
*   **Can `graph.py` be introduced safely?** Yes. The `StateGraph` definition (`workflow = StateGraph(AgentState)`, `workflow.add_node...`) should be moved to `backend/app/agents/graph.py` which will export the uncompiled `workflow` object.
*   **What remains inside `main.py`?** The compilation step (`agent = workflow.compile(checkpointer=checkpointer)`) MUST remain inside the `lifespan` context manager in `main.py` to ensure the `AsyncSqliteSaver` utilizes the FastAPI event loop correctly.

---

## 8. Checkpoint Safety
*   **Would graph extraction change checkpoint behavior?** If graph edges are not altered, checkpoint behaviour remains identical.
*   **Mitigation:** The `AgentState` is unaltered. SQLite deserialization will continue to map exactly to the nodes.

---

## 9. Risks
*   **Critical:** Moving `AsyncSqliteSaver` out of `lifespan` will cause `RuntimeError: no running event loop` or SQLite `database is locked` errors due to multiple async contexts attempting to access the `checkpoints.db` file.
*   **High:** Forgetting to update `main.py`'s API routes (`/ask`) to use the new graph module import.
*   **Medium:** Deprecation warnings from LangChain (e.g., `TavilySearchResults`).

---

## 10. Recommendations
1.  **Extract `workflow` definition to `graph.py`:** Move all `workflow.add_node` and `workflow.add_edge` calls to `graph.py`.
2.  **Export the uncompiled workflow:** `graph.py` should expose the `workflow` object.
3.  **Compile in `main.py`:** Keep `agent = workflow.compile(...)` inside `main.py`'s lifespan.
4.  **Do not change the Checkpointer:** Leave the SQLite checkpoint and auto-backup logic exactly where it is in `main.py` to preserve the Platform Foundation database rules.

---

## 11. Readiness Score
*   **Architecture:** 10/10
*   **Maintainability:** 9/10
*   **Graph Design:** 10/10
*   **Checkpoint Safety:** 10/10 (if recommendations are followed)
*   **Extensibility:** 10/10
*   **Overall:** **9.8 / 10 - Ready for Sprint C Extraction.**
