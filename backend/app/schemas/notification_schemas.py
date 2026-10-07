from pydantic import BaseModel
from typing import Optional

class NotifyRequest(BaseModel):
    title: str
    message: str
    type: str = "info"          # info | update | alert | promo
    expires_days: Optional[int] = 7  # None = never expires

class MarkReadRequest(BaseModel):
    ids: list[str]
