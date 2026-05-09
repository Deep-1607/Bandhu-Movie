const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;
const WS_URL = import.meta.env.VITE_WS_URL || BASE_URL.replace('http', 'ws') + '/ws';

export { BASE_URL, API_URL, WS_URL };
