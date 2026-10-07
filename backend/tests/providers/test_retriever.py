import pytest
from backend.app.providers.retriever import search

def test_retriever_search():
    # Execute a search using the actual local FAISS index
    results = search("India vs Pakistan", k=2)
    assert isinstance(results, list)
    assert len(results) <= 2
