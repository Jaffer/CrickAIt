import logging
from pydantic import BaseModel, Field
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import tool

logger = logging.getLogger("crickait-backend")
web_search = TavilySearchResults(max_results=3)

class LiveWebSearchInput(BaseModel):
    query: str = Field(..., description="The search query for live cricket news and scores")

@tool(args_schema=LiveWebSearchInput)
def fetch_live_web(query: str):
    """MANDATORY for live 2026 cricket data, scores, and news.

    DO NOT call this twice.
    """
    logger.info("Web search triggered: %s", query)
    try:
        raw_data = web_search.invoke(query)
        return raw_data[:2000]
    except Exception as e:
        return f"Search failed: {e}"
