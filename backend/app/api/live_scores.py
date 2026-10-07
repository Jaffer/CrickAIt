from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
import json
from langchain_core.messages import HumanMessage
from backend.app.core.security import get_current_user, get_current_user_optional
from backend.app.services.live_score_service import LiveScoreService
from backend.app.agents.graph import build_graph

router = APIRouter(tags=["live-scores"])
live_score_service = LiveScoreService()

@router.get("/live-scores-preview")
async def get_scores_preview():
    return await live_score_service.get_live_scores()

@router.get("/scores")
async def get_scores(username: Optional[str] = Depends(get_current_user_optional)):
    return await live_score_service.get_live_scores()

@router.get("/scorecard/{match_id}")
async def get_scorecard(match_id: str, username: Optional[str] = Depends(get_current_user_optional)):
    """Fetches detailed scorecard for a specific match from Cricbuzz/CricAPI."""
    return await live_score_service.get_scorecard(match_id)

@router.get("/news-preview")
async def get_news_preview():
    return await live_score_service.get_news_preview()

@router.get("/top-news")
async def get_top_news(t: Optional[float] = None):
    return await live_score_service.get_top_news()

@router.get("/scorecard/{match_id}/intelligence")
async def get_scorecard_intelligence(match_id: str, username: Optional[str] = Depends(get_current_user_optional)):
    """Fetches AI intelligence based on the scorecard."""
    scorecard = await live_score_service.get_scorecard(match_id)
    if not scorecard or scorecard.get("error"):
        raise HTTPException(status_code=404, detail="Scorecard unavailable")
        
    # Compile graph statelessly for this request
    app = build_graph().compile()
    
    # Send specialized query containing the scorecard
    message_content = f"__EXTRACT_INTELLIGENCE__\nScorecard Data:\n{json.dumps(scorecard)}"
    inputs = {"messages": [HumanMessage(content=message_content)]}
    
    # Run graph
    output = await app.ainvoke(inputs)
    
    if "intelligence_data" in output:
        return output["intelligence_data"]
    else:
        raise HTTPException(status_code=500, detail="Intelligence extraction failed")
