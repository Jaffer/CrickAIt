import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage
from backend.app.api.live_scores import live_score_service

@pytest.mark.asyncio
async def test_live_scores_preview_success(client):
    # Setup mock HTTP response for CricAPI
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "success",
        "data": [
            {
                "id": "match_1",
                "name": "India vs Pakistan",
                "status": "India won by 6 wickets",
                "matchEnded": False,
                "teams": ["India", "Pakistan"],
                "teamInfo": [
                    {"name": "India", "shortname": "IND", "img": ""},
                    {"name": "Pakistan", "shortname": "PAK", "img": ""}
                ],
                "score": [
                    {"inning": "Pakistan Inning", "r": 150, "w": 10, "o": 20.0},
                    {"inning": "India Inning", "r": 152, "w": 4, "o": 18.2}
                ]
            }
        ]
    }

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response

    # Inject mock HTTP client
    with patch("backend.app.providers.cricapi_provider.get_http_client", return_value=mock_client):
        # Invalidate cache to force API call
        live_score_service.live_scores_cache["data"] = None
        live_score_service.live_scores_cache["time"] = 0

        res = await client.get("/live-scores-preview")
        assert res.status_code == 200
        data = res.json()
        assert "matches" in data
        assert len(data["matches"]) == 1
        assert data["matches"][0]["id"] == "match_1"
        assert data["matches"][0]["name"] == "India vs Pakistan"

@pytest.mark.asyncio
async def test_live_scores_scraper_fallback(client):
    # Mock CricAPI return failure to trigger Cricbuzz scraper fallback
    mock_cricapi_res = MagicMock()
    mock_cricapi_res.status_code = 200
    mock_cricapi_res.json.return_value = {"status": "failure"}

    # Mock Cricbuzz HTML scrape response
    mock_cricbuzz_res = MagicMock()
    mock_cricbuzz_res.status_code = 200
    mock_cricbuzz_res.text = """
    <div class="cb-lv-main">
        <div class="cb-mtch-lst">
            <a href="/live-cricket-scores/87622/ind-vs-aus">IND vs AUS</a>
            <h3 class="cb-lv-scr-mtch-hdr">India vs Australia</h3>
            <div class="cb-lv-scrs-state">Live</div>
            <div class="cb-lv-scrs-col">
                <div class="cb-hmscg-bat-txt">
                    <div class="cb-hmscg-tm-nm">IND</div>
                    <div class="cb-ovr-flo">180/3 (20)</div>
                </div>
            </div>
        </div>
    </div>
    """

    mock_client_cricapi = AsyncMock()
    mock_client_cricapi.get.return_value = mock_cricapi_res
    
    mock_client_cricbuzz = AsyncMock()
    mock_client_cricbuzz.get.return_value = mock_cricbuzz_res

    with patch("backend.app.providers.cricapi_provider.get_http_client", return_value=mock_client_cricapi), \
         patch("backend.app.providers.cricbuzz_provider.get_http_client", return_value=mock_client_cricbuzz):
        # Invalidate cache to force API call
        live_score_service.live_scores_cache["data"] = None
        live_score_service.live_scores_cache["time"] = 0

        res = await client.get("/live-scores-preview")
        assert res.status_code == 200
        data = res.json()
        assert len(data["matches"]) > 0
        assert "India vs Australia" in data["matches"][0]["name"]

@pytest.mark.asyncio
async def test_scorecard_authenticated_cricapi(authenticated_client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "success",
        "data": {
            "teams": ["India", "Australia"],
            "teamInfo": [
                {"name": "India", "shortname": "IND", "img": ""},
                {"name": "Australia", "shortname": "AUS", "img": ""}
            ],
            "status": "Match in progress",
            "score": [{"inning": "IND Inning", "r": 200, "w": 2, "o": 20.0}],
            "tossWinner": "India",
            "tossChoice": "bat",
            "scorecard": [
                {
                    "inning": "IND Inning",
                    "batting": [{"batsman": "Virat Kohli", "r": 100}],
                    "bowling": [{"bowler": "Starc", "o": 4.0}]
                }
            ]
        }
    }

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response

    with patch("backend.app.providers.cricapi_provider.get_http_client", return_value=mock_client):
        res = await authenticated_client.get("/scorecard/match_123")
        assert res.status_code == 200
        data = res.json()
        assert data["tossWinner"] == "India"
        assert len(data["scorecard"]) == 1
        assert data["scorecard"][0]["inning"] == "IND Inning"

@pytest.mark.asyncio
async def test_news_preview_cricbuzz_rss(client):
    mock_rss_res = MagicMock()
    mock_rss_res.status_code = 200
    mock_rss_res.text = """<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
        <channel>
            <item>
                <title>India clinches T20 Series against Australia</title>
                <description>A comprehensive victory in Brisbane marks a solid performance by Indian squad.</description>
                <link>https://www.cricbuzz.com/cricket-news/123/india-vs-aus</link>
            </item>
        </channel>
    </rss>
    """

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_rss_res

    with patch("backend.app.providers.rss_provider.get_http_client", return_value=mock_client):
        res = await client.get("/news-preview")
        assert res.status_code == 200
        data = res.json()
        assert "news" in data
        assert len(data["news"]) == 1
        assert data["news"][0]["title"] == "India clinches T20 Series against Australia"

@pytest.mark.asyncio
async def test_top_news_api(client, mock_llm_responses):
    # Mock CricAPI matches response
    mock_matches_res = MagicMock()
    mock_matches_res.status_code = 200
    mock_matches_res.json.return_value = {
        "status": "success",
        "data": [{"name": "IND vs AUS", "matchEnded": True, "status": "IND won"}]
    }

    mock_client = MagicMock()
    mock_client.get = AsyncMock(return_value=mock_matches_res)

    mock_llm_res = AIMessage(content="🏏 IND vs AUS: India wins series | 📰 ENG vs NZ: England wins by 5 runs")

    with patch("backend.app.services.live_score_service.TavilySearchResults") as MockTavily, \
         patch("backend.app.services.live_score_service.ChatGroq") as MockChatGroq, \
         patch("backend.app.providers.cricapi_provider.get_http_client", return_value=mock_client):
        
        MockTavily.return_value.invoke.return_value = "Latest news headlines: India wins, Australia defeats England."
        MockChatGroq.return_value.ainvoke = AsyncMock(return_value=mock_llm_res)

        # Invalidate news cache
        live_score_service.news_cache["data"] = None
        live_score_service.news_cache["time"] = 0

        res = await client.get("/top-news")
        assert res.status_code == 200
        data = res.json()
        assert "news" in data
        assert "RECENT RESULTS" in data["news"]
        assert "LATEST NEWS" in data["news"]
