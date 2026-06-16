import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';

export default function NewsTicker() {
  const [newsText, setNewsText] = useState('Loading latest news...');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await authenticatedFetch('/top-news');
        const data = await res.json();
        if (data.news) {
          const formatted = data.news.split('|').join('  •  ') + '  •  ' + data.news.split('|').join('  •  ');
          setNewsText(formatted);
        } else {
          setNewsText('No news available right now.');
        }
      } catch (e) {
        setNewsText('Live Feed Offline');
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="ticker-wrap" id="news-ticker-wrap">
      <div className="ticker-move" id="news-ticker-content">
        {newsText}
      </div>
    </div>
  );
}
