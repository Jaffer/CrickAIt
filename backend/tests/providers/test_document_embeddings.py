import pytest
import os
import builtins
from unittest.mock import patch, mock_open

def test_document_embeddings_import():
    mock_json = '{"info": {"teams": ["IND", "PAK"], "venue": "Lahore", "dates": ["2026-07-14"]}}'
    real_open = builtins.open
    real_listdir = os.listdir
    
    def custom_open(file, mode='r', *args, **kwargs):
        if "cricsheet_raw" in str(file) or "all_json" in str(file):
            m = mock_open(read_data=mock_json)
            return m(file, mode, *args, **kwargs)
        return real_open(file, mode, *args, **kwargs)

    def custom_listdir(path):
        if "cricsheet_raw" in str(path) or "all_json" in str(path):
            return ["test.json"]
        return real_listdir(path)

    with patch("os.listdir", custom_listdir), \
         patch("builtins.open", custom_open):
        from backend.app.providers import document_embeddings
        assert len(document_embeddings.documents) > 0
        assert document_embeddings.embeddings.shape[0] > 0
