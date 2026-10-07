import re
import json
import bs4
import logging
from typing import Optional
from backend.app.core.security import get_http_client

logger = logging.getLogger("crickait-backend")

class CricbuzzProvider:
    
    async def fetch_live_scores_from_cricbuzz(self) -> list:
        try:
            url = "https://www.cricbuzz.com/cricket-match/live-scores"
            client = get_http_client()
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, timeout=10.0)
            if r.status_code != 200:
                logger.warning("Cricbuzz live-scores status code: %s", r.status_code)
                return []
                
            soup = bs4.BeautifulSoup(r.text, 'html.parser')
            
            # Find all series containers
            series_containers = soup.find_all("div", class_=re.compile(r"cb-lv-main"))
            if not series_containers:
                # Fallback to general search if class name changed slightly
                series_containers = soup.find_all("div", class_=re.compile(r"cb-plyr-tbody"))
                
            matches = []
            for s in series_containers:
                match_divs = s.find_all("div", class_=re.compile(r"cb-mtch-lst"))
                for m in match_divs:
                    try:
                        a_tag = m.find("a")
                        if not a_tag or not a_tag.get("href"):
                            continue
                        
                        href = a_tag["href"]
                        # Extract match ID
                        # e.g., /live-cricket-scores/87622/ind-vs-aus
                        parts = href.strip("/").split("/")
                        match_id = None
                        for term in ["live-cricket-scores", "cricket-scores", "live-cricket-scorecard", "live-cricket-match"]:
                            if term in parts:
                                idx = parts.index(term)
                                if idx + 1 < len(parts):
                                    match_id = parts[idx + 1]
                                    break
                        
                        if not match_id:
                            # Fallback: find any number in parts
                            for p in parts:
                                if p.isdigit():
                                    match_id = p
                                    break
                                    
                        if not match_id:
                            continue
                            
                        # Check duplicate
                        if any(x["id"] == match_id for x in matches):
                            continue
                            
                        # Extract match name
                        name_tag = m.find("h3", class_=re.compile(r"cb-lv-scr-mtch-hdr"))
                        name = name_tag.text.strip() if name_tag else ""
                        if not name and a_tag:
                            name = a_tag.text.strip()
                        
                        # Clean match name (e.g. remove extra spaces)
                        name = " ".join(name.split())
                        
                        # Extract status
                        status = "Live"
                        status_tag = m.find("div", class_=re.compile(r"cb-text-live|cb-text-complete|cb-text-preview|cb-lv-scrs-state"))
                        if status_tag:
                            status = status_tag.text.strip()
                        
                        # Skip matches that are explicitly complete or won
                        if "won" in status.lower() or "draw" in status.lower() or "complete" in status.lower():
                            continue
                            
                        # Extract scores
                        score = []
                        teams = []
                        
                        score_div = m.find("div", class_=re.compile(r"cb-lv-scrs-col|cb-scr-wll-chvrn"))
                        if score_div:
                            bat_div = score_div.find("div", class_=re.compile(r"cb-hmscg-bat-txt"))
                            bwl_div = score_div.find("div", class_=re.compile(r"cb-hmscg-bwl-txt"))
                            
                            # Fallback to search inside score_div
                            if not bat_div and not bwl_div:
                                divs = score_div.find_all("div", class_=re.compile(r"cb-hmscg"))
                                if len(divs) >= 1:
                                    bat_div = divs[0]
                                if len(divs) >= 2:
                                    bwl_div = divs[1]
                                    
                            for div in [bat_div, bwl_div]:
                                if not div:
                                    continue
                                team_name_tag = div.find("div", class_=re.compile(r"cb-hmscg-tm-nm"))
                                if not team_name_tag:
                                    continue
                                team_name = team_name_tag.text.strip()
                                teams.append(team_name)
                                
                                score_text_tags = div.find_all("div", class_=re.compile(r"cb-ovr-flo"))
                                score_text = score_text_tags[-1].text.strip() if score_text_tags else ""
                                
                                # Also check if the text is empty or says something like "yet to bat"
                                if score_text and "yet to bat" not in score_text.lower():
                                    r_match = re.search(r'(\d+)(?:/(\d+))?', score_text)
                                    o_match = re.search(r'\(([\d\.]+)\)', score_text)
                                    
                                    runs = int(r_match.group(1)) if r_match else 0
                                    wickets = int(r_match.group(2)) if r_match and r_match.group(2) else (10 if (r_match and "/" in score_text) else 0)
                                    overs = o_match.group(1) if o_match else "-"
                                    
                                    score.append({
                                        "inning": team_name,
                                        "r": runs,
                                        "w": wickets,
                                        "o": overs
                                    })
                                else:
                                    score.append({
                                        "inning": team_name,
                                        "r": 0,
                                        "w": 0,
                                        "o": "-"
                                    })
                                    
                        if not teams and " vs " in name:
                            teams = [t.strip() for t in name.split(" vs ")]
                            
                        matches.append({
                            "id": match_id,
                            "name": name,
                            "status": status,
                            "teams": teams,
                            "teamInfo": [{"name": t, "shortname": t[:3].upper(), "img": f"https://static.cricbuzz.com/a/img/v1/72x72/i1/c170661/default.jpg"} for t in teams],
                            "score": score
                        })
                    except Exception as inner_e:
                        logger.error("Error parsing single match: %s", inner_e, exc_info=True)
                        continue
            return matches
        except Exception as e:
            logger.error("Error scraping live scores from Cricbuzz: %s", e, exc_info=True)
            return []

    async def v2_fetch_scorecard_data_async(self, match_id: str) -> Optional[dict]:
        url = f"https://www.cricbuzz.com/live-cricket-scorecard/{match_id}"
        client = get_http_client()
        r = await client.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10.0
        )
        if r.status_code != 200:
            return None
        soup = bs4.BeautifulSoup(r.text, 'html.parser')
        script_tag = soup.find('script', string=re.compile(r'scorecardApiData'))
        if not script_tag:
            return None

        json_str = script_tag.string
        brace_start = json_str.find('{')
        if brace_start == -1:
            return None

        depth = 0
        end = -1
        for i in range(brace_start, len(json_str)):
            c = json_str[i]
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end == -1:
            return None
        return json.loads(json_str[brace_start:end + 1])
