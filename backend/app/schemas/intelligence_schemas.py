from pydantic import BaseModel, Field
from typing import List

class KeyBattle(BaseModel):
    batter: str = Field(description="Name of the batter")
    bowler: str = Field(description="Name of the bowler")
    context: str = Field(description="Why this battle is important right now (e.g., 'Targeting the off stump')")

class MatchIntelligence(BaseModel):
    match_story: str = Field(description="A 2-3 sentence narrative summarizing the current state and momentum of the match.")
    win_probability: int = Field(description="Integer between 0 and 100 representing the win probability of the team currently batting.")
    key_battles: List[KeyBattle] = Field(description="List of 1 to 3 key player battles happening or about to happen.")
    tactical_insight: str = Field(description="A single sharp tactical observation (e.g., 'Bowlers are bowling 80% short pitch deliveries').")
