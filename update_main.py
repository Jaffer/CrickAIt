with open('backend/app/main.py', 'r') as f:
    lines = f.readlines()

new_content = """    last_msg = state["messages"][-1]
    
    # Extract username from namespaced thread_id: "username:session_id"
    thread_id = config.get("configurable", {}).get("thread_id", "") if config else ""
    username = thread_id.split(":", 1)[0] if ":" in thread_id else "global"
    redis_key = f"global_user_profile:{username}"

    global_data_str = await redis_client.get(redis_key)
    global_profile = json.loads(global_data_str) if global_data_str else {}

    for key in ["favorite_players", "favorite_teams"]:
        if key not in global_profile:
            global_profile[key] = []

    if last_msg.type != "human":
        return {"user_profile": global_profile}

    msg_lower = last_msg.content.lower()
    trigger_phrases = [
        "favorite", "favourite", "my team", "my player",
        "i support", "huge fan", "diehard fan", "i love", "biggest fan"
    ]
    if not any(phrase in msg_lower for phrase in trigger_phrases):
        return {"user_profile": global_profile}

    prompt_template = load_prompt("extractor_prompt.txt")
    prompt = prompt_template.format(message=last_msg.content)

    try:
        extracted_data = await structured_extractor.ainvoke(prompt)
        data_changed = False

        c_players = [p.lower() for p in global_profile["favorite_players"]]
        c_teams = [t.lower() for t in global_profile["favorite_teams"]]

        if extracted_data.favorite_players:
            for new_player in extracted_data.favorite_players:
                clean_name = new_player.strip()
                if (clean_name.lower() not in c_players
                        and clean_name.lower() not in c_teams):
                    global_profile["favorite_players"].append(clean_name)
                    c_players.append(clean_name.lower())
                    data_changed = True

        if extracted_data.favorite_teams:
            for new_team in extracted_data.favorite_teams:
                clean_name = new_team.strip()
                if (clean_name.lower() not in c_teams
                        and clean_name.lower() not in c_players):
                    global_profile["favorite_teams"].append(clean_name)
                    c_teams.append(clean_name.lower())
                    data_changed = True

        if data_changed:
            await redis_client.set(
                redis_key,
                json.dumps(global_profile)
            )

        return {"user_profile": global_profile}
    except Exception as e:
        logger.error("Extractor error: %s", e, exc_info=True)
        return {"user_profile": global_profile}


async def router_node(state: AgentState):
    last_msg = state["messages"][-1].content
    decision_template = load_prompt("router_decision.txt")
    prompt = decision_template.format(query=last_msg)
    
    decision = await fast_router_llm.ainvoke(prompt)
    profile = state.get("user_profile", {})

    if "EXPERT" in decision.content.upper():
        return {"route_decision": "EXPERT"}
    else:
        memory_str = json.dumps(profile)
        preferred_lang = state.get("preferred_lang", "English (UK)")
        
        system_template = load_prompt("router_prompt.txt")
        system_instruction = system_template.format(memory_str=memory_str, preferred_lang=preferred_lang)
        
        fast_answer = await fast_router_llm.ainvoke(
            [SystemMessage(content=system_instruction)] + state["messages"]
        )
        return {"messages": [fast_answer], "route_decision": "SIMPLE"}


async def summarizer_node(state: AgentState):
    summary = state.get("summary", "")
    messages = state["messages"]
    
    prompt_template = load_prompt("summarizer_prompt.txt")
    prompt = prompt_template.format(summary=summary, messages=messages[:-2])
    
    new_summary = await fast_router_llm.ainvoke(prompt)
    delete_messages = [RemoveMessage(id=m.id) for m in messages[:-2]]
    return {"summary": new_summary.content, "messages": delete_messages}


async def expert_node(state: AgentState):
    profile = state.get("user_profile", {})
    current_retries = state.get("retry_count", 0)
    preferred_lang = state.get("preferred_lang", "English (UK)")

    custom_prompt = STRICT_SYSTEM_PROMPT + f"\\nUSER PROFILE: {profile}"
    custom_prompt += f"\\n\\nCRITICAL: The user's preferred language is {preferred_lang}. You MUST respond entirely in {preferred_lang}."
    
    if current_retries >= 1:
        custom_prompt += "\\n\\n" + load_prompt("expert_retry.txt")

    messages = [SystemMessage(content=custom_prompt)] + state["messages"]
    
    try:
        answer = await expert_llm_with_tools.ainvoke(messages)
    except Exception as e:
        logger.error("Expert LLM invocation failed: %s", e)
        # Fallback to fast_router_llm WITH tools to prevent a 500 crash on tool history
        answer = await fast_router_llm_with_tools.ainvoke(messages)

    if current_retries >= 1 and hasattr(answer, "tool_calls") and answer.tool_calls:
        logger.warning("Rescue operation: 70B failed, falling back to 8B model")
        recent_history = "\\n".join(
            [f"{m.type.upper()}: {m.content}" for m in state["messages"][-5:]]
        )
        user_question = next(
            (m.content for m in reversed(state["messages"]) if m.type == "human"),
            "Format the data."
        )
        rescue_template = load_prompt("expert_rescue.txt")
        rescue_prompt = rescue_template.format(user_question=user_question, recent_history=recent_history)
        
        rescue_answer = await fast_router_llm.ainvoke(rescue_prompt)
        answer = HumanMessage(content=rescue_answer.content)

    retry_update = 1 if hasattr(answer, "tool_calls") and answer.tool_calls else 0
    return {\"messages\": [answer], \"retry_count\": retry_update}
"""

new_lines = lines[:287] + [new_content + "\n"] + lines[380:]

with open('backend/app/main.py', 'w') as f:
    f.writelines(new_lines)
