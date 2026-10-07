# Sprint A: AI Prompts and Tools Extraction Report

This report documents the extraction of hardcoded prompts and AI tools from `backend/app/main.py` into the newly established `agents/` directory structure, marking the completion of Phase 1 of the AI Platform Refactor.

---

## 1. Overview
Sprint A was strictly an extraction sprint. The goal was to isolate all string literals (prompts) and tool configurations from the LangGraph node logic, without altering the underlying behavior, state schema, or checkpoint database.

**Status:** Completed. All 36 regression tests and 2 new prompt/tool unit tests pass successfully.

---

## 2. Files Extracted & Created

### Prompts Directory (`backend/app/agents/prompts/`)
All large f-strings and hardcoded system prompts were moved to pure `.txt` files.
*   `expert_system.txt`: Extracted the `STRICT_SYSTEM_PROMPT` defining the AI's domain lock and personalization rules.
*   `extractor_prompt.txt`: Extracted the profile extraction instruction.
*   `router_decision.txt`: Extracted the classification prompt (EXPERT vs SIMPLE).
*   `router_prompt.txt`: Extracted the system instruction for the fast routing model.
*   `summarizer_prompt.txt`: Extracted the history compression prompt.
*   `expert_retry.txt`: Extracted the conditional retry instruction.
*   `expert_rescue.txt`: Extracted the fallback extraction instruction for the 8B model.

**Utility Created:**
*   `loader.py`: A simple `load_prompt()` function utilizing `@lru_cache` to parse the text files securely without continuous disk I/O.

### Tools Directory (`backend/app/agents/tools/`)
The `@tool` wrapped functions were decoupled from the main app.
*   `historical.py`: Encapsulates `WikipediaQueryRun` and `get_historical_context`.
*   `live_web.py`: Encapsulates `TavilySearchResults` and `fetch_live_web`.
*   `cricapi_tool.py`: Encapsulates `fetch_player_and_live_matches`.

---

## 3. Provider Integration
During the tool extraction, `fetch_player_and_live_matches` was refactored to consume the `search_players` method of the `CricAPIProvider`, replacing a direct `httpx` client call. This ensures all external API calls are safely handled by the Platform Foundation layer.

---

## 4. Risks Mitigated
*   **Prompt Formatting Errors:** Replacing f-strings with `.format()` required exact mapping of variables (`{message}`, `{memory_str}`, `{preferred_lang}`). This was carefully manually verified and tested.
*   **State Leakage:** `AgentState` was completely untouched during this sprint. No checkpoint schema modifications occurred, avoiding any risk to the SQLite DB.

---

## 5. Next Steps
With the prompts and tools successfully isolated, `main.py` is significantly cleaner. The nodes themselves now only contain business routing logic.
**Sprint B (Nodes & State Extraction)** is the next target, which will move `AgentState` to `state.py` and the node functions (e.g. `router_node`) into the `nodes/` directory.
