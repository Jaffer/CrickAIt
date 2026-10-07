from backend.app.core.security import get_http_client
from backend.app.config.settings import settings
import logging

logger = logging.getLogger("crickait-backend")

class CricAPIProvider:
    def __init__(self):
        self.api_key = settings.CRICKET_API_KEY
        self.base_url = "https://api.cricapi.com/v1"

    async def get_current_matches(self, offset: int = 0) -> dict:
        url = f"{self.base_url}/currentMatches?apikey={self.api_key}&offset={offset}"
        client = get_http_client()
        r = await client.get(url, timeout=8.0)
        return r.json()

    async def get_match_scorecard(self, match_id: str) -> dict:
        url = f"{self.base_url}/match_scorecard?apikey={self.api_key}&id={match_id}"
        client = get_http_client()
        r = await client.get(url, timeout=12.0)
        return r.json()

    async def get_match_info(self, match_id: str) -> dict:
        url = f"{self.base_url}/match_info?apikey={self.api_key}&id={match_id}"
        client = get_http_client()
        r = await client.get(url, timeout=10.0)
        return r.json()

    async def search_players(self, query: str) -> dict:
        url = f"{self.base_url}/players?apikey={self.api_key}&search={query}"
        client = get_http_client()
        r = await client.get(url, timeout=5.0)
        return r.json()
