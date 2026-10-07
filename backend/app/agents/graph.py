from typing import Literal
from langgraph.graph import StateGraph, START
from langgraph.prebuilt import ToolNode

from backend.app.agents.state import AgentState
from backend.app.agents.llms import tools
from backend.app.agents.nodes.profile_extractor_node import profile_extractor_node
from backend.app.agents.nodes.router_node import router_node
from backend.app.agents.nodes.summarizer_node import summarizer_node
from backend.app.agents.nodes.expert_node import expert_node
from backend.app.agents.nodes.intelligence_node import intelligence_node

def route_after_router(
    state: AgentState
) -> Literal["expert_node", "summarizer_node", "intelligence_node", "__end__"]:
    if state.get("route_decision") == "INTELLIGENCE":
        return "intelligence_node"
    if len(state["messages"]) > 20:
        return "summarizer_node"
    if state.get("route_decision") == "EXPERT":
        return "expert_node"
    return "__end__"

def route_after_summarizer(
    state: AgentState
) -> Literal["expert_node", "__end__"]:
    if state.get("route_decision") == "EXPERT":
        return "expert_node"
    return "__end__"

def route_after_expert(state: AgentState) -> Literal["tools", "__end__"]:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "__end__"

def build_graph() -> StateGraph:
    tool_node = ToolNode(tools)

    workflow = StateGraph(AgentState)
    workflow.add_node("profile_extractor_node", profile_extractor_node)
    workflow.add_node("router_node", router_node)
    workflow.add_node("expert_node", expert_node)
    workflow.add_node("tools", tool_node)
    workflow.add_node("summarizer_node", summarizer_node)
    workflow.add_node("intelligence_node", intelligence_node)

    workflow.add_edge(START, "profile_extractor_node")
    workflow.add_edge("profile_extractor_node", "router_node")
    workflow.add_conditional_edges("router_node", route_after_router)
    workflow.add_conditional_edges("summarizer_node", route_after_summarizer)
    workflow.add_conditional_edges("expert_node", route_after_expert)
    workflow.add_edge("tools", "expert_node")

    return workflow
