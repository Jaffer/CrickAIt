import operator
from typing import Annotated
from langgraph.graph import MessagesState

class AgentState(MessagesState):
    route_decision: str
    summary: str
    retry_count: Annotated[int, operator.add]
    user_profile: Annotated[dict, operator.ior]
    preferred_lang: str
    intelligence_data: dict
