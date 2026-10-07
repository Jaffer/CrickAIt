import pytest
import operator
from typing import Annotated
from backend.app.agents.state import AgentState
from backend.app.agents.nodes.router_node import router_node
from backend.app.agents.nodes.profile_extractor_node import profile_extractor_node
from backend.app.agents.nodes.expert_node import expert_node
from backend.app.agents.nodes.summarizer_node import summarizer_node
from backend.app.agents.llms import fast_router_llm, expert_llm, tools

def test_agent_state_schema():
    """Ensure AgentState backwards compatibility is fully preserved."""
    assert "route_decision" in AgentState.__annotations__
    assert "summary" in AgentState.__annotations__
    assert "retry_count" in AgentState.__annotations__
    assert "user_profile" in AgentState.__annotations__
    assert "preferred_lang" in AgentState.__annotations__
    
    # Check annotations to ensure correct Reducer behaviour
    assert AgentState.__annotations__["retry_count"] == Annotated[int, operator.add]
    assert AgentState.__annotations__["user_profile"] == Annotated[dict, operator.ior]

def test_nodes_import_correctly():
    """Ensure nodes are callable and exist in their correct modules."""
    assert callable(router_node)
    assert callable(profile_extractor_node)
    assert callable(expert_node)
    assert callable(summarizer_node)

def test_llms_and_tools_bound():
    """Ensure LLMs and tools are properly exported from the shared llms module."""
    assert fast_router_llm is not None
    assert expert_llm is not None
    assert len(tools) == 3
