import pytest

def test_vector_database_import():
    from backend.app.providers import vector_database
    assert vector_database.index.ntotal == 3
