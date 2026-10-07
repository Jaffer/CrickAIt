import logging
from pydantic import BaseModel, Field
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.tools import tool

logger = logging.getLogger("crickait-backend")
wiki = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())

class HistoricalSearchInput(BaseModel):
    query: str = Field(..., description="The search query for historical cricket facts")

@tool(args_schema=HistoricalSearchInput)
def get_historical_context(query: str):
    """Search Wikipedia for historical cricket facts."""
    try:
        return wiki.invoke(f"{query} cricket")
    except Exception as e:
        logger.error("Wikipedia search failed: %s", e)
        return f"Wikipedia search failed: {e}"
