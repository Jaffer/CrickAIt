with open('backend/app/main.py', 'r') as f:
    content = f.read()

import re

match_start = re.search(r'# 1\. MULTI-AGENT SETUP & MODELS', content)

schemas_content = """from backend.app.schemas.profile_schemas import UserProfileExtraction
from pydantic import BaseModel

class RenameRequest(BaseModel):
    new_name: str

class AutoRenameRequest(BaseModel):
    user_prompt: str

"""

content = content[:match_start.end()] + "\n\n" + schemas_content + content[match_start.end():]

with open('backend/app/main.py', 'w') as f:
    f.write(content)
