const BASE_URL = '/api';

function getToken() { return localStorage.getItem('horizons_token'); }
export function setToken(token) { localStorage.setItem('horizons_token', token); }
export function removeToken() { localStorage.removeItem('horizons_token'); }

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config = { method, headers };
  if (body && method !== 'GET') config.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${path}`, config);
  if (response.status === 401) { removeToken(); window.location.href = '/login'; throw new Error('Sessão expirada'); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro na requisição');
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  upload: async (path, formData) => {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro no upload');
    return data;
  },
};

export default api;
