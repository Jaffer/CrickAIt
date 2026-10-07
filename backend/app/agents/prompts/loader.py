import os
from functools import lru_cache

@lru_cache(maxsize=None)
def load_prompt(filename: str) -> str:
    """Loads a prompt string from a text file in the prompts directory."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, filename)
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()
