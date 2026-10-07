from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Score(BaseModel):
    inning: str
    r: int
    w: int
    o: Any

class TeamInfo(BaseModel):
    name: str
    shortname: str
    img: str

class Match(BaseModel):
    id: str
    name: str
    status: str
    teams: List[str]
    teamInfo: List[TeamInfo]
    score: List[Score]

class LiveScoresResponse(BaseModel):
    matches: List[Match]

class NewsItem(BaseModel):
    title: str
    description: str
    link: str

class NewsPreviewResponse(BaseModel):
    news: List[NewsItem]
