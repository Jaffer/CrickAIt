from langchain_core.messages import RemoveMessage
from backend.app.agents.state import AgentState
from backend.app.agents.prompts.loader import load_prompt
from backend.app.agents.llms import fast_router_llm

async def summarizer_node(state: AgentState):
    summary = state.get("summary", "")
    messages = state["messages"]
    
    prompt_template = load_prompt("summarizer_prompt.txt")
    prompt = prompt_template.format(summary=summary, messages=messages[:-2])
    
    new_summary = await fast_router_llm.ainvoke(prompt)
    delete_messages = [RemoveMessage(id=m.id) for m in messages[:-2]]
    return {"summary": new_summary.content, "messages": delete_messages}
