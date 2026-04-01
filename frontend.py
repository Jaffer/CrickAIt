import streamlit as st
import requests, uuid, json, os, time

API_URL = "http://127.0.0.1:8000"

st.set_page_config(page_title="CrickAIt", page_icon="🏏", layout="wide")

# ==========================================
# 1. PREMIUM CSS & STYLING
# ==========================================
st.markdown("""
    <style>
        /* HEADER & SIDEBAR TOGGLE */
        header { background-color: transparent !important; }
        #MainMenu, footer, .stDeployButton { visibility: hidden; display: none; }

        /* INFINITE TICKER */
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-wrap { position: fixed; top: 0; left: 0; width: 100%; height: 40px; background: #0e1117; z-index: 999; border-bottom: 1px solid #333; overflow: hidden; display: flex; align-items: center; }
        .ticker-move { display: inline-block; white-space: nowrap; animation: scroll 20s linear infinite; font-weight: bold; font-family: monospace; padding-left: 60px; }
        
        /* CHAT AREA */
        [data-testid="stChatMessageContainer"] { max-width: 1000px; margin: auto; padding-top: 45px; }
        .stChatInputContainer { max-width: 1000px !important; margin: auto !important; }
        section[data-testid="stSidebar"] { background-color: #171717 !important; border-right: 1px solid #333; }

        /* BEAUTIFUL MARKDOWN TABLES */
        table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; margin: 15px 0; }
        th { background-color: #262730; color: #00ff88; text-align: left; padding: 12px; border-bottom: 2px solid #333; }
        td { background-color: #1e1e24; color: #ddd; padding: 10px 12px; border-bottom: 1px solid #333; }
        
        /* PROFILE TAGS */
        .profile-tag { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin: 2px; text-align: center; }
        .tag-player { background: rgba(0, 153, 255, 0.1); color: #0099ff; border: 1px solid #0099ff; }
        .tag-team { background: rgba(255, 75, 75, 0.1); color: #ff4b4b; border: 1px solid #ff4b4b; }

        /* TINY DELETE BUTTONS FOR TAGS */
        div[data-testid="column"] button { padding: 0px !important; min-height: 24px !important; background: transparent !important; border: 1px solid #444 !important; color: #888 !important; font-size: 10px !important; }
        div[data-testid="column"] button:hover { border-color: #ff4b4b !important; color: #ff4b4b !important; }
        
        /* QUICK ACTION CHIPS (Ready for when you uncomment them) */
        .stButton > button[kind="secondary"] { border-radius: 20px !important; font-size: 0.8rem !important; height: auto !important; min-height: 40px; white-space: normal !important; border: 1px solid #333 !important; }
    </style>
""", unsafe_allow_html=True)

# ==========================================
# 2. DATA HELPERS
# ==========================================
@st.cache_data(ttl=30, show_spinner=False)
def get_news():
    try: return requests.get(f"{API_URL}/top-news", timeout=12).json().get("news")
    except: return "Cricket AI Live Feed Offline"

def get_global_profile():
    try: return requests.get(f"{API_URL}/profile", timeout=2).json()
    except: return {}

# Initialize Session State
if "current_id" not in st.session_state:
    st.session_state.current_id = None

# ==========================================
# 3. INFINITE TICKER
# ==========================================
raw_news = get_news()
st.markdown(f"""<div class="ticker-wrap"><div class="ticker-move" style="color:#0099ff;">LATEST: {raw_news} ••• {raw_news}</div></div>""", unsafe_allow_html=True)

# ==========================================
# 4. SIDEBAR (PROFILE & CHAT HISTORY)
# ==========================================
with st.sidebar:
    st.markdown("<h3 style='text-align: center;'>🏏 CrickAIt</h3>", unsafe_allow_html=True)
    if st.button("➕ New Chat", use_container_width=True):
        st.session_state.current_id = str(uuid.uuid4())
        st.rerun()

    # --- RESTORED GLOBAL PROFILE MEMORY VIEWER ---
    profile = get_global_profile()
    if profile.get("favorite_players") or profile.get("favorite_teams"):
        with st.expander("🧠 Global Profile", expanded=True):
            def render_tags(key, label, items, tag_class):
                if items:
                    st.caption(label)
                    for item in items:
                        c1, c2 = st.columns([0.8, 0.2])
                        c1.markdown(f"<div class='profile-tag {tag_class}' style='width:100%'>{item}</div>", unsafe_allow_html=True)
                        if c2.button("✖", key=f"del_{key}_{item}"):
                            requests.delete(f"{API_URL}/profile/item", params={"category": key, "item": item})
                            st.rerun()
                            
            render_tags("favorite_players", "PLAYERS", profile.get("favorite_players"), "tag-player")
            render_tags("favorite_teams", "TEAMS", profile.get("favorite_teams"), "tag-team")

    st.divider()
    st.caption("CHAT HISTORY")
    
    # --- NEW SETTINGS MENU INTEGRATION ---
    try:
        sessions_response = requests.get(f"{API_URL}/sessions").json()
        sessions = sessions_response.get("sessions", [])
        custom_names = requests.get(f"{API_URL}/session-names").json()
        
        # Set a default ID if none is selected but sessions exist
        if not st.session_state.current_id and sessions:
            st.session_state.current_id = sessions[-1]
            
        for sid in reversed(sessions):
            display_name = custom_names.get(sid, f"Chat {sid[:4]}")
            
            c1, c2 = st.columns([0.80, 0.20])
            is_active = (st.session_state.current_id == sid)
            
            with c1:
                if st.button(display_name, key=f"load_{sid}", type="primary" if is_active else "secondary", use_container_width=True):
                    st.session_state.current_id = sid
                    st.rerun()
            with c2:
                with st.popover("⚙️"):
                    st.markdown("**Settings**")
                    
                    # Rename
                    new_name = st.text_input("Rename", value=display_name, key=f"rename_input_{sid}")
                    if st.button("💾 Save Name", key=f"save_name_{sid}"):
                        requests.post(f"{API_URL}/rename/{sid}", json={"new_name": new_name})
                        st.rerun()
                        
                    # Export/Download
                    try:
                        chat_data = requests.get(f"{API_URL}/history/{sid}").json().get("messages", [])
                        export_text = "\n\n".join([f"{m['role'].upper()}:\n{m['content']}" for m in chat_data])
                        st.download_button(
                            label="📥 Download (.txt)",
                            data=export_text,
                            file_name=f"{display_name}.txt",
                            mime="text/plain",
                            key=f"export_{sid}"
                        )
                    except: pass
                        
                    # Delete
                    if st.button("❌ Delete", key=f"del_{sid}"):
                        requests.delete(f"{API_URL}/clear/{sid}")
                        if st.session_state.current_id == sid:
                            st.session_state.current_id = None
                        st.rerun()
    except Exception as e:
        st.error("Backend offline.")


    st.divider()
    st.markdown("#### 🔴 Live Matches")
    try:
        # Fetch live scores from your FastAPI backend
        scores_res = requests.get(f"{API_URL}/live-scores", timeout=3).json()
        matches = scores_res.get("matches", [])
        
        if matches:
            for m in matches:
                # Beautiful dark-themed card for each match
                st.markdown(f"""
                <div style='background: #1e1e24; padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #333;'>
                    <div style='font-size: 0.85rem; font-weight: bold; color: #ddd;'>{m['name']}</div>
                    <div style='font-size: 0.75rem; color: #00ff88; margin-top: 4px;'>{m['status']}</div>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.caption("No live matches at the moment.")
    except Exception as e:
        st.caption("Scoreboard API offline or unreachable.")

# ==========================================
# 5. MAIN CHAT AREA
# ==========================================
if not st.session_state.current_id: 
    st.info("👈 Select or start a new chat from the sidebar.")
    st.stop()

# Load History
try:
    history = requests.get(f"{API_URL}/history/{st.session_state.current_id}").json().get("messages", [])
    for m in history:
        with st.chat_message(m["role"], avatar="👾" if m["role"]=="assistant" else "👤"):
            st.markdown(m["content"])
except: st.error("Backend offline.")

# ==========================================
# QUICK ACTION CHIPS (Currently hidden per your request)
# ==========================================
# st.write("") 
# chip_cols = st.columns([1.2, 1.1, 1.1, 1.1])
# actions = ["🏆 IPL Table", "🏏 My Stats", "📰 Top News", "🔴 Live Scores"]
# prompts = ["Show me the current IPL points table", "Give me stats for my favorite player", "What is the latest cricket news?", "Show me live match scores"]
#
# for i, action in enumerate(actions):
#     if chip_cols[i].button(action, use_container_width=True):
#         st.session_state.pending_prompt = prompts[i]
# ==========================================

# Input Handling
input_prompt = st.chat_input("Ask about cricket...")
final_prompt = input_prompt or st.session_state.get("pending_prompt")

if final_prompt:
    if "pending_prompt" in st.session_state: del st.session_state.pending_prompt
    
    with st.chat_message("user", avatar="👤"): st.markdown(final_prompt)
    with st.chat_message("assistant", avatar="👾"):
        with st.status("🧠 CrickAIt Brain Active...", expanded=True) as status:
            st.write("🔍 Analyzing query intent...")
            res = requests.post(f"{API_URL}/ask", params={"user_prompt": final_prompt, "session_id": st.session_state.current_id})
            data = res.json()
            route = data.get("route", "SIMPLE")
            st.write(f"🚀 Routing to {route} engine...")
            status.update(label=f"✅ Analysis Complete ({route} Mode)", state="complete", expanded=False)
        
        st.markdown(data.get("response"))
    st.rerun()