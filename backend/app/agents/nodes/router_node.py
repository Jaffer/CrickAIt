import json
from langchain_core.messages import SystemMessage
from backend.app.agents.state import AgentState
from backend.app.agents.prompts.loader import load_prompt
from backend.app.agents.llms import fast_router_llm

async def router_node(state: AgentState):
    last_msg = state["messages"][-1].content
    decision_template = load_prompt("router_decision.txt")
    prompt = decision_template.format(query=last_msg)
    
    decision = await fast_router_llm.ainvoke(prompt)
    profile = state.get("user_profile", {})
    if last_msg.startswith("__EXTRACT_INTELLIGENCE__"):
        return {"route_decision": "INTELLIGENCE"}

    if "EXPERT" in decision.content.upper():
        return {"route_decision": "EXPERT"}
    else:
        memory_str = json.dumps(profile)
        preferred_lang = state.get("preferred_lang", "English (UK)")
        
        system_template = load_prompt("router_prompt.txt")
        system_instruction = system_template.format(memory_str=memory_str, preferred_lang=preferred_lang)
        
        fast_answer = await fast_router_llm.ainvoke(
            [SystemMessage(content=system_instruction)] + state["messages"]
        )
        return {"messages": [fast_answer], "route_decision": "SIMPLE"}
