with open('backend/app/main.py', 'r') as f:
    content = f.read()

import re

# Find the start of # 1. MULTI-AGENT SETUP & MODELS
# and the start of # 3. EDGES & GRAPH
match_start = re.search(r'# 1\. MULTI-AGENT SETUP & MODELS', content)
match_end = re.search(r'# 3\. EDGES & GRAPH', content)

new_content = """# 1. MULTI-AGENT SETUP & MODELS

from backend.app.agents.state import AgentState
from backend.app.agents.llms import tools
from backend.app.agents.nodes.profile_extractor_node import profile_extractor_node
from backend.app.agents.nodes.router_node import router_node
from backend.app.agents.nodes.summarizer_node import summarizer_node
from backend.app.agents.nodes.expert_node import expert_node
from langgraph.prebuilt import ToolNode

tool_node = ToolNode(tools)

"""

content = content[:match_start.start()] + new_content + content[match_end.start():]

with open('backend/app/main.py', 'w') as f:
    f.write(content)

