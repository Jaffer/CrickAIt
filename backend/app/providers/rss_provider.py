import re
import logging
from backend.app.core.security import get_http_client

logger = logging.getLogger("crickait-backend")

class RSSProvider:
    async def fetch_news_preview_rss(self) -> list:
        try:
            client = get_http_client()
            r = await client.get("https://www.cricbuzz.com/rss.xml", timeout=6.0)
            xml = r.text
            items = re.findall(r"<item>(.*?)</item>", xml, re.DOTALL)
            news_list = []
            for item in items[:5]:
                title = re.search(r"<title>(.*?)</title>", item)
                desc = re.search(r"<description>(.*?)</description>", item)
                link = re.search(r"<link>(.*?)</link>", item)
                
                title_text = title.group(1).replace("<![CDATA[", "").replace("]]>", "").strip() if title else ""
                desc_text = desc.group(1).replace("<![CDATA[", "").replace("]]>", "").strip() if desc else ""
                link_text = link.group(1).strip() if link else ""
                
                desc_text = re.sub(r"<[^>]*>", "", desc_text)
                
                news_list.append({
                    "title": title_text,
                    "description": desc_text,
                    "link": link_text
                })
            return news_list
        except Exception as e:
            logger.error("Error fetching news preview: %s", e)
            return []
