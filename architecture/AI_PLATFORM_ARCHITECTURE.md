# AI Platform Architecture

## 1. Executive Summary
The AI Platform is the core engine of CrickAIt, orchestrating a multi-agent system powered by LangGraph. This architecture document defines the target state of the AI Engine, transitioning it from a monolithic script (`main.py`) into a highly cohesive, decoupled, and scalable directory structure. This design standardizes state management, prompt storage, tool execution, and checkpointer patterns, preparing the platform for streaming capabilities and a future migration to PostgreSQL.

---

## 2. Current AI Architecture
Currently, the AI logic resides entirely within `backend/app/main.py`.

**Flow:**
```
[User Query] --> FastAPI (/ask) --> AgentGraph.ainvoke()
                                       |
                                       v
                             [Profile Extractor Node]
                                       |
                                       v
                                 [Router Node]
                                /             \
                      [Summarizer Node]   [Expert Node] <--> [Tools (Tavily, Wiki, CricAPI)]
```

*   **State:** LangGraph `MessagesState` with custom fields stored via `AsyncSqliteSaver`.
*   **LLMs:** Groq (`llama-3.1-8b-instant`, `llama-3.1-70b-versatile`).
*   **Tools:** Hardcoded Python functions wrapped with `@tool`.

---

## 3. Identified Problems

1.  **God Classes & Coupling:** `main.py` handles API routing, prompt definitions, global LLM instantiations, LangGraph node logic, and SQLite backup cron jobs.
2.  **Hardcoded Prompts:** Prompts (e.g., `STRICT_SYSTEM_PROMPT`) are hardcoded directly into the node functions, making them impossible to version, A/B test, or update dynamically.
3.  **Tool Coupling:** The AI tools (e.g., `fetch_player_and_live_matches`) make raw HTTP calls to external APIs instead of delegating to the established Platform Foundation `Providers`.
4.  **Fragile Checkpointing:** LangGraph state is saved to SQLite, but an infinite `while True` loop is running in the background to back up the `.db` file to Redis as a binary blob. This is highly fragile and non-scalable.
5.  **Streaming Limitations:** The `/ask` endpoint uses `agent.ainvoke`, which blocks until the final message is generated. This causes high perceived latency for the user.
6.  **State Leakage:** `AgentState` is defined globally and LLMs are accessed via global variables inside node functions rather than being injected or initialized cleanly.

---

## 4. Target Folder Structure

```text
backend/app/
├── agents/
│   ├── graph.py                   # StateGraph compilation and edge definitions
│   ├── state.py                   # AgentState typed dicts
│   ├── nodes/
│   │   ├── router.py              # LLM routing logic
│   │   ├── expert.py              # 70B expert answering logic
│   │   ├── summarizer.py          # History compression
│   │   └── profile_extractor.py   # Global profile sync
│   ├── tools/
│   │   ├── historical.py          # Wikipedia integrations
│   │   ├── live_web.py            # Tavily integrations
│   │   └── cricapi_tool.py        # CricAPI provider delegations
│   ├── prompts/
│   │   ├── system.txt             # Strict domain-lock prompt
│   │   ├── router.txt             # Routing decision prompt
│   │   ├── extractor.txt          # Profile extraction prompt
│   │   └── summarizer.txt         # History compression prompt
│   └── checkpoints/
│       ├── sqlite_manager.py      # Current AsyncSqliteSaver wrapper
│       └── backup_service.py      # Separated background backup logic
├── services/
│   └── chat_service.py            # Invocation, streaming, session logic
└── api/
    └── chat.py                    # FastAPI routes (/ask, /history)
```

---

## 5. Node Responsibilities

*   **Profile Extractor:** Silently observes user input to extract and persist long-term preferences (Favorite Teams/Players) to Redis.
*   **Router:** A fast (8B) model that determines if a query is a "SIMPLE" conversational query or an "EXPERT" analytical query requiring tools.
*   **Summarizer:** Compresses message history if the token window exceeds limits (>20 messages).
*   **Expert:** A high-capability (70B) model bound to external tools, operating strictly under the `STRICT_SYSTEM_PROMPT` domain lock.

---

## 6. State Management

*   **Graph State (`AgentState`):** Managed by LangGraph's checkpointer. Holds short-term conversation context (`messages`, `route_decision`, `summary`, `retry_count`, `preferred_lang`).
*   **User Profile State:** Managed via Redis (`RedisKeys.global_user_profile`). Syncs into Graph State dynamically during the Extractor node execution.
*   **Checkpoint Persistence:** Currently `AsyncSqliteSaver`. Will be abstracted behind a `CheckpointManager` interface to allow seamless swapping to PostgreSQL in the future.

---

## 7. Tool Architecture

Tools must follow the Platform Foundation standard:
*   **Providers Layer:** External systems (`CricAPIProvider`, `Tavily`, `Wikipedia`) handle raw HTTP/SDK boundaries.
*   **Tools Layer (`agents/tools/`):** LangChain `@tool` wrappers that format the LLM inputs and delegate the actual data fetching to the `Providers`. Tools must never instantiate HTTP clients directly.

---

## 8. Prompt Architecture

Prompts will be removed from Python code and placed in `agents/prompts/*.txt` files.
*   **Loading:** Prompts will be loaded at runtime via a `PromptLoader` utility, caching the string in memory.
*   **Testing:** Storing prompts as text files allows for easier integration with evaluation frameworks (e.g., LangSmith) without modifying source code.

---

## 9. Memory Architecture

*   **Short-term (Conversation):** Handled by LangGraph's `MessagesState` and SQLite checkpoints.
*   **Long-term (Profile):** Handled by `structured_extractor` pushing to Redis.
*   **Compression:** Managed by `summarizer_node` appending a `SystemMessage` summary and deleting older messages.

---

## 10. Checkpoint Architecture

*   **Current State:** `AsyncSqliteSaver` pointing to `data/sqlite/checkpoints.db`.
*   **Backup Mechanism:** The fragile binary backup loop will be extracted into a dedicated `BackupService` managed via FastAPI's `@asynccontextmanager lifespan`.
*   **Future Target:** The architecture must allow swapping to `AsyncPostgresSaver` by merely changing a single environment variable and connection string, with zero changes to the graph compilation logic.

---

## 11. Streaming Architecture

To improve perceived latency, the architecture must support streaming.
*   **Transport:** Server-Sent Events (SSE) via FastAPI's `StreamingResponse`.
*   **LangGraph Method:** Replace `agent.ainvoke()` with `agent.astream_events()`.
*   **Yielding:** The `ChatService` will filter stream events for `on_chat_model_stream` to yield tokens to the frontend in real-time, while accumulating the final state to save to the checkpointer.

---

## 12. Observability

*   **Tracing:** LangSmith integration must be preserved. The modular structure will ensure that nodes appear as distinct steps in the trace.
*   **Logging:** All nodes must use the `BaseService` logger pattern (`self.logger`).

---

## 13. Testing Strategy

*   **Unit Tests:** Each node (e.g., `test_router_node.py`) must be testable in isolation by passing a mock `AgentState` dict.
*   **Mock LLMs:** Utilize `langchain_core.messages.AIMessage` to mock LLM outputs for deterministic testing.
*   **Graph Tests:** Compile the graph with a mock `MemorySaver` checkpointer instead of SQLite to test the routing edges (`test_graph_routing.py`).

---

## 14. Risks

1.  **Circular Imports:** Graph compilation requires nodes, and nodes may require global tools. Strict hierarchical imports must be enforced.
2.  **State Schema Drift:** Modifying the `AgentState` typing might corrupt existing SQLite checkpoints. A versioning or clear-cache strategy is required upon deployment.
3.  **Streaming Complexity:** Implementing `astream_events` requires careful handling of tool-call tokens vs. text-response tokens to prevent frontend rendering bugs.

---

## 15. Recommendations

1.  **Highest ROI:** Move prompts to text files and extract the nodes to separate files immediately. This removes 70% of the clutter in `main.py`.
2.  **Standardize Tools:** Refactor tools to use the new `CricAPIProvider` to remove redundant HTTPX logic.
3.  **Delay Streaming:** Focus on extraction first. Implement SSE streaming only after the modular graph is proven stable in regression testing.
