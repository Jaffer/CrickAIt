from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END

# 1. THE STATE: This is the "backpack" the AI carries.
# It tells the graph exactly what data to keep track of.
class MyState(TypedDict):
    user_input: str
    response: str

# 2. THE NODES: These are the "workers" (functions).
def node_greet(state: MyState):
    print("--- Greeting the User ---")
    return {"response": f"Hello {state['user_input']}! Let me find a fact for you..."}

def node_cricket_fact(state: MyState):
    print("--- Adding a Cricket Fact ---")
    fact = "Did you know? Sachin Tendulkar was the first player to be given out by a Third Umpire!"
    return {"response": state["response"] + "\n" + fact}

# 3. THE GRAPH: This is where we wire them together.
workflow = StateGraph(MyState)

# Add our workers to the board
workflow.add_node("greeter", node_greet)
workflow.add_node("fact_finder", node_cricket_fact)

# Draw the lines (Edges)
workflow.add_edge(START, "greeter")      # Start here
workflow.add_edge("greeter", "fact_finder") # Then go here
workflow.add_edge("fact_finder", END)       # Then stop

# 4. RUN IT: Compile and execute
app = workflow.compile()
result = app.invoke({"user_input": "Fan"})
print(result["response"])