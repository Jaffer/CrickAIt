import pytest
from backend.app.agents.graph import build_graph

def test_build_graph_returns_state_graph():
    """Ensure build_graph() returns an uncompiled StateGraph."""
    graph = build_graph()
    
    # Check it's an instance of StateGraph
    from langgraph.graph import StateGraph
    assert isinstance(graph, StateGraph)
    
    # Check that nodes are registered correctly
    assert "router_node" in graph.nodes
    assert "expert_node" in graph.nodes
    assert "profile_extractor_node" in graph.nodes
    assert "summarizer_node" in graph.nodes
    assert "tools" in graph.nodes

def test_graph_compiles_correctly():
    """Ensure the uncompiled StateGraph can be successfully compiled."""
    graph = build_graph()
    compiled_agent = graph.compile()
    assert compiled_agent is not None
