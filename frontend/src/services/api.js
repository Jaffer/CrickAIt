const PROD_BACKEND_URL = 'https://crickait-backend.onrender.com';

export let API_URL = window.location.origin;
if (window.location.protocol === 'file:' || window.location.origin === 'null') {
    API_URL = '';
} else if (window.location.port !== '8000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    API_URL = 'http://localhost:8000';
} else if (window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost') {
    API_URL = PROD_BACKEND_URL;
}

export const getAuthToken = () => localStorage.getItem('crickait_token');

export const authenticatedFetch = async (url, options = {}) => {
    const token = getAuthToken();
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }

    const res = await fetch(`${API_URL}${url}`, options);

    if (res.status === 401) {
        localStorage.removeItem('crickait_token');
        localStorage.removeItem('crickait_username');
        localStorage.removeItem('crickait_display_name');
        window.dispatchEvent(new Event('auth-expired'));
    }

    return res;
};

export const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
