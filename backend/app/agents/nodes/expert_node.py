import logging
from langchain_core.messages import SystemMessage, HumanMessage
from backend.app.agents.state import AgentState
from backend.app.agents.prompts.loader import load_prompt
from backend.app.agents.llms import (
    expert_llm_with_tools,
    fast_router_llm_with_tools,
    fast_router_llm
)

logger = logging.getLogger("crickait-backend")
STRICT_SYSTEM_PROMPT = load_prompt("expert_system.txt")

async def expert_node(state: AgentState):
    profile = state.get("user_profile", {})
    current_retries = state.get("retry_count", 0)
    preferred_lang = state.get("preferred_lang", "English (UK)")

    custom_prompt = STRICT_SYSTEM_PROMPT + f"\nUSER PROFILE: {profile}"
    custom_prompt += f"\n\nCRITICAL: The user's preferred language is {preferred_lang}. You MUST respond entirely in {preferred_lang}."
    
    if current_retries >= 1:
        custom_prompt += "\n\n" + load_prompt("expert_retry.txt")

    messages = [SystemMessage(content=custom_prompt)] + state["messages"]
    
    try:
        answer = await expert_llm_with_tools.ainvoke(messages)
    except Exception as e:
        logger.error("Expert LLM invocation failed: %s", e)
        # Fallback to fast_router_llm WITH tools to prevent a 500 crash on tool history
        answer = await fast_router_llm_with_tools.ainvoke(messages)

    if current_retries >= 1 and hasattr(answer, "tool_calls") and answer.tool_calls:
        logger.warning("Rescue operation: 70B failed, falling back to 8B model")
        recent_history = "\n".join(
            [f"{m.type.upper()}: {m.content}" for m in state["messages"][-5:]]
        )
        user_question = next(
            (m.content for m in reversed(state["messages"]) if m.type == "human"),
            "Format the data."
        )
        rescue_template = load_prompt("expert_rescue.txt")
        rescue_prompt = rescue_template.format(user_question=user_question, recent_history=recent_history)
        
        rescue_answer = await fast_router_llm.ainvoke(rescue_prompt)
        answer = HumanMessage(content=rescue_answer.content)

    retry_update = 1 if hasattr(answer, "tool_calls") and answer.tool_calls else 0
    return {"messages": [answer], "retry_count": retry_update}
