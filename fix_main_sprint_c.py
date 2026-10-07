with open('backend/app/main.py', 'r') as f:
    content = f.read()

import re

# 1. Replace the imports and graph definition with build_graph import
start_marker = "from backend.app.agents.state import AgentState"
end_marker = "# 4. AUTH & USER HELPERS"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_imports = "from backend.app.agents.llms import fast_router_llm\nfrom backend.app.agents.graph import build_graph\n\n"
    content = content[:start_idx] + new_imports + content[end_idx:]

# 2. Update compile call
content = content.replace(
    "agent = workflow.compile(checkpointer=checkpointer)",
    "agent = build_graph().compile(checkpointer=checkpointer)"
)

with open('backend/app/main.py', 'w') as f:
    f.write(content)
