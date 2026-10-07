# CrickAIt Backend Testing Suite

This directory contains the regression test suite for the CrickAIt FastAPI backend. It is configured to run isolated unit and integration tests using `pytest`, `pytest-asyncio`, and `pytest-cov` to generate code coverage metrics.

---

## 1. How to Run the Tests

To run the entire test suite from the `backend/` directory:

```bash
cd backend
python3 -m pytest
```

To run with coverage reports and details:

```bash
python3 -m pytest -v --cov=app --cov-report=html
```

The coverage report HTML will be generated under the `backend/htmlcov/` directory.

---

## 2. Configuration Settings

Testing configuration is managed inside [pytest.ini](file:///home/eb157/CrickAIt/backend/pytest.ini) under the `backend/` root directory. It contains:
*   `asyncio_mode = auto` to automatically manage asynchronous test loops.
*   Deprecation and user warnings suppression settings.
*   Coverage configuration rules.

---

## 3. Mocks & Fixtures

All external network operations and persistent configurations are mocked inside [conftest.py](file:///home/eb157/CrickAIt/backend/tests/conftest.py):

*   **Database Redirection:** Calls to `aiosqlite.connect("data/sqlite/checkpoints.db")` and `AsyncSqliteSaver.from_conn_string` are intercepted at runtime and redirected to an isolated test database `data/sqlite/test_checkpoints.db` which is created and cleaned up automatically before and after the test session.
*   **Redis Client Mock:** `SmartRedisClient` is set to `use_mock = True`, executing all caching and rate-limiting operations in-memory without contacting a local Redis container.
*   **LLM Providers Mocks:** Global instances of `fast_router_llm`, `expert_llm`, and `structured_extractor` are replaced with `AsyncMock` objects to return customized, predictable message states during chat routing tests.
*   **HTTP Client Pool Mocks:** Intercepts HTTP network calls to CricAPI and Cricbuzz scraping endpoints to return simulated matches, scorecard JSON objects, and RSS news feeds.
