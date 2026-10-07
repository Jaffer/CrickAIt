import json
from langchain_core.messages import SystemMessage
from backend.app.agents.state import AgentState
from backend.app.agents.llms import fast_router_llm
from backend.app.schemas.intelligence_schemas import MatchIntelligence

async def intelligence_node(state: AgentState):
    """
    Extracts structured Match Intelligence JSON from the last message (which should contain scorecard data).
    """
    # The last message from the user/system contains the scorecard JSON
    scorecard_data = state["messages"][-1].content
    
    system_prompt = (
        "You are the CrickAIt AI Match Intelligence Center.\n"
        "Analyze the provided live scorecard data and extract structured tactical insights.\n"
        "Your response must exactly match the required JSON schema.\n"
    )
    
    # Use with_structured_output to force the LLM to return the MatchIntelligence schema
    structured_llm = fast_router_llm.with_structured_output(MatchIntelligence)
    
    result = await structured_llm.ainvoke(
        [SystemMessage(content=system_prompt)] + state["messages"]
    )
    
    # result is a Pydantic object
    intelligence_dict = result.dict()
    
    return {"intelligence_data": intelligence_dict, "route_decision": "__end__"}
