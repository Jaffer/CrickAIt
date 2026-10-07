from pydantic import BaseModel, Field
from typing import Optional

class UserProfileExtraction(BaseModel):
    favorite_players: Optional[list[str]] = Field(default=None)
    favorite_teams: Optional[list[str]] = Field(default=None)
    expertise_level: Optional[str] = Field(
        default="Standard",
        description="User's knowledge: 'Casual', 'Expert', or 'Tactician'."
    )
    preferred_format: Optional[list[str]] = Field(
        default=["T20", "ODI", "Test"],
        description="The formats the user cares about most."
    )
    rival_teams: Optional[list[str]] = Field(
        default=None,
        description="Teams the user explicitly dislikes for banter."
    )
    verbosity_level: Optional[str] = Field(
        default="Standard",
        description="Response length preference: 'Concise', 'Standard', or 'Detailed'."
    )
