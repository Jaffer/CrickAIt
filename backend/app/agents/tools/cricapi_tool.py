import logging
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from backend.app.providers.cricapi_provider import CricAPIProvider

logger = logging.getLogger("crickait-backend")
cricapi_provider = CricAPIProvider()

class PlayerSearchInput(BaseModel):
    query: str = Field(..., description="The search query to find a player's country")

@tool(args_schema=PlayerSearchInput)
async def fetch_player_and_live_matches(query: str):
    """Use ONLY to find a player's country.

    THIS DOES NOT RETURN STATS. If the user asks for stats, DO NOT USE THIS.
    """
    try:
        data = await cricapi_provider.search_players(query)
        players = data.get("data", [])
        return ", ".join(
            f"{p['name']} ({p['country']})" for p in players[:5]
        ) or "No players found."
    except Exception:
        return (
            "API_ERROR: Data not found in database. "
            "TRY LIVE WEB SEARCH INSTEAD."
        )
