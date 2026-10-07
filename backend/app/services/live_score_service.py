import time
from typing import Optional, Dict, Any
from backend.app.core.base_service import BaseService
from backend.app.providers.cricapi_provider import CricAPIProvider
from backend.app.providers.cricbuzz_provider import CricbuzzProvider
from backend.app.providers.rss_provider import RSSProvider
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_groq import ChatGroq
from backend.app.config.settings import settings

class LiveScoreService(BaseService):
    def __init__(self):
        super().__init__("crickait-backend")
        self.cricapi = CricAPIProvider()
        self.cricbuzz = CricbuzzProvider()
        self.rss = RSSProvider()
        self.live_scores_cache = {"data": None, "time": 0}
        self.news_cache = {"data": None, "time": 0}

    async def get_live_scores(self) -> Dict[str, Any]:
        now = time.time()
        # Cache hit check (90 seconds)
        if self.live_scores_cache["data"] is not None and (now - self.live_scores_cache["time"] < 90):
            return {"matches": self.live_scores_cache["data"]}

        live_matches = []
        cricapi_failed = False
        
        # 1. Attempt CricAPI
        try:
            data = await self.cricapi.get_current_matches()
            
            if data.get("status") == "success":
                for match in data.get("data", []):
                    if match.get("matchEnded", False):
                        continue

                    scores = []
                    for s in match.get("score", []):
                        scores.append({
                            "inning": s.get("inning", "Score"),
                            "r": s.get("r", 0),
                            "w": s.get("w", 0),
                            "o": s.get("o", 0)
                        })
                    
                    live_matches.append({
                        "id": match.get("id"),
                        "name": match.get("name"),
                        "status": match.get("status"),
                        "teams": match.get("teams", []),
                        "teamInfo": match.get("teamInfo", []),
                        "score": scores
                    })
            else:
                self.logger.warning("CricAPI currentMatches returned non-success: %s", data)
                cricapi_failed = True
        except Exception as e:
            self.logger.error("Live matches CricAPI error: %s", e, exc_info=True)
            cricapi_failed = True

        # 2. If CricAPI failed or returned no live matches, fallback to scraping Cricbuzz
        if cricapi_failed or not live_matches:
            self.logger.info("CricAPI failed or empty. Falling back to Cricbuzz live scores scraper...")
            scraped_matches = await self.cricbuzz.fetch_live_scores_from_cricbuzz()
            if scraped_matches:
                live_matches = scraped_matches

        # 3. If everything fails but we have stale cache, use it
        if not live_matches and self.live_scores_cache["data"] is not None:
            return {"matches": self.live_scores_cache["data"]}

        # Update cache
        self.live_scores_cache["data"] = live_matches
        self.live_scores_cache["time"] = now

        return {"matches": live_matches}

    async def get_scorecard(self, match_id: str) -> Dict[str, Any]:
        try:
            data = await self.cricapi.get_match_scorecard(match_id)

            if data.get("status") != "success":
                # Log the reason so we can diagnose in Render logs
                reason = data.get("reason", data.get("message", "unknown"))
                self.logger.error("CricAPI scorecard failed for %s: status=%s reason=%s", match_id, data.get("status"), reason)
                
                # Fallback: try match_info endpoint which works on free tier
                data2 = await self.cricapi.get_match_info(match_id)
                
                if data2.get("status") == "success":
                    match_data = data2.get("data", {})
                    scores = []
                    for s in match_data.get("score", []):
                        scores.append({
                            "inning": s.get("inning", "Score"),
                            "r": s.get("r", 0),
                            "w": s.get("w", 0),
                            "o": s.get("o", 0)
                        })
                    return {
                        "teams": match_data.get("teams", []),
                        "teamInfo": match_data.get("teamInfo", []),
                        "status": match_data.get("status", ""),
                        "score": scores,
                        "tossWinner": match_data.get("tossWinner", ""),
                        "tossChoice": match_data.get("tossChoice", ""),
                        "scorecard": [],
                        "note": "Detailed scorecard unavailable on current plan. Showing match summary."
                    }
                
                return {"error": f"Scorecard unavailable: {reason}"}

            match_data = data.get("data", {})
            
            # Format strictly to what frontend expects
            formatted_scorecard = []
            for inning in match_data.get("scorecard", []):
                formatted_scorecard.append({
                    "inning": inning.get("inning", ""),
                    "batting": inning.get("batting", []),
                    "bowling": inning.get("bowling", [])
                })

            scores = []
            for s in match_data.get("score", []):
                scores.append({
                    "inning": s.get("inning", "Score"),
                    "r": s.get("r", 0),
                    "w": s.get("w", 0),
                    "o": s.get("o", 0)
                })

            team_info = match_data.get("teamInfo", [])
            if not team_info and len(match_data.get("teams", [])) >= 2:
                team_info = [
                    {"name": match_data["teams"][0], "shortname": match_data["teams"][0][:3], "img": ""},
                    {"name": match_data["teams"][1], "shortname": match_data["teams"][1][:3], "img": ""}
                ]

            return {
                "teams": match_data.get("teams", []),
                "teamInfo": team_info,
                "status": match_data.get("status", ""),
                "score": scores,
                "tossWinner": match_data.get("tossWinner", ""),
                "tossChoice": match_data.get("tossChoice", ""),
                "scorecard": formatted_scorecard
            }
        except Exception as e:
            self.logger.error("Scorecard API error: %s", e, exc_info=True)
            return {"error": "Failed to load scorecard"}

    async def get_news_preview(self) -> Dict[str, Any]:
        news_list = await self.rss.fetch_news_preview_rss()
        if not news_list:
            return {"news": [
                {"title": "IPL matches heating up as playoff race intensifies", "description": "Teams battle for the crucial top 4 spots in the table.", "link": "#"},
                {"title": "Fast bowlers dominate in latest red-ball fixtures", "description": "Pace friendly tracks result in early finishes across venues.", "link": "#"}
            ]}
        return {"news": news_list}

    async def get_top_news(self) -> Dict[str, Any]:
        now = time.time()
        if not self.news_cache["data"] or (now - self.news_cache["time"] > 600):
            try:
                # Initialize locally to avoid circular import with main.py
                web_search = TavilySearchResults(max_results=3)
                fast_router_llm = ChatGroq(
                    temperature=0.4,
                    model_name=settings.GROQ_ROUTER_MODEL,
                    api_key=settings.GROQ_API_KEY
                )

                raw = web_search.invoke("latest cricket headlines March 2026")
                prompt = (
                    "Write 5 distinct, informative one-sentence news updates about recent cricket events or matches. "
                    "Each sentence should tell a complete piece of news. "
                    "Separate each sentence with ' | '. "
                    "No intros, no fluff, just the 5 sentences separated by |."
                )
                news_text = (
                    await fast_router_llm.ainvoke(f"{prompt} Data: {raw}")
                ).content.strip()

                try:
                    data = await self.cricapi.get_current_matches()
                    completed_matches = []
                    if data.get("status") == "success":
                        for match in data.get("data", []):
                            if match.get("matchEnded", False):
                                completed_matches.append(f"{match.get('name')} ({match.get('status')})")
                    
                    if completed_matches:
                        match_str = " | ".join(completed_matches[:4])
                        news_text = f"🏏 RECENT RESULTS: {match_str} | 📰 LATEST NEWS: {news_text}"
                except Exception as e:
                    self.logger.error("Failed to fetch completed matches for news: %s", e)

                self.news_cache["data"] = news_text
                self.news_cache["time"] = now
            except Exception as e:
                self.logger.error("News fetch failed: %s", e, exc_info=True)
                self.news_cache["data"] = (
                    "IPL 2026: Updates soon | Champions Trophy Prep | "
                    "Live Scoreboard Active"
                )
                self.news_cache["time"] = now

        return {"news": self.news_cache["data"]}
