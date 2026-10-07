import json
import logging
from backend.app.core.security import redis_client
from backend.app.agents.state import AgentState
from backend.app.agents.prompts.loader import load_prompt
from backend.app.agents.llms import structured_extractor

logger = logging.getLogger("crickait-backend")

async def profile_extractor_node(state: AgentState, config = None):
    """Runs silently to sync the Global Redis Profile with Local Chat State."""
    last_msg = state["messages"][-1]
    
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
