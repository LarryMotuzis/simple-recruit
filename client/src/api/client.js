const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Access token is held in memory only (not localStorage) to reduce XSS exposure.
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include', // send/receive the refresh cookie
    body: body ? JSON.stringify(body) : undefined,
  });

  // Transparently try one refresh on a 401, then retry the original request.
  if (res.status === 401 && auth && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, { method, body, auth });
  }

  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

async function tryRefresh() {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (payload) =>
    request('/auth/register', { method: 'POST', body: payload, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST', auth: false }),
  refresh: () => request('/auth/refresh', { method: 'POST', auth: false }),

  listProspects: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/prospects${qs ? `?${qs}` : ''}`);
  },
  getProspect: (id) => request(`/prospects/${id}`),
  createProspect: (payload) => request('/prospects', { method: 'POST', body: payload }),
  updateProspect: (id, payload) => request(`/prospects/${id}`, { method: 'PATCH', body: payload }),
  removeProspect: (id) => request(`/prospects/${id}/archive`, { method: 'POST' }),
  changeStage: (id, stage, stageOrder) =>
    request(`/prospects/${id}/stage`, { method: 'PATCH', body: { stage, stageOrder } }),

  listPortal: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/portal${qs ? `?${qs}` : ''}`);
  },
  syncPortal: () => request('/portal/sync', { method: 'POST' }),
  importCsv: (level, rows) => request('/portal/import-csv', { method: 'POST', body: { level, rows } }),
  clearCsvEntries: (level) => request(`/portal/csv-entries?level=${level}`, { method: 'DELETE' }),
  importPortalEntry: (id) => request(`/portal/${id}/import`, { method: 'POST' }),

  listEvaluations: (prospectId) => request(`/prospects/${prospectId}/evaluations`),
  createEvaluation: (prospectId, payload) =>
    request(`/prospects/${prospectId}/evaluations`, { method: 'POST', body: payload }),

  getTeamSettings: () => request('/team-settings'),
  updateTeamSettings: (payload) => request('/team-settings', { method: 'PATCH', body: payload }),

  getRoster: () => request('/roster'),
  addToRoster: (payload) => request('/roster', { method: 'POST', body: payload }),
  updateRosterPlayer: (id, payload) => request(`/roster/${id}`, { method: 'PATCH', body: payload }),
  removeFromRoster: (id) => request(`/roster/${id}`, { method: 'DELETE' }),
  setDepthChart: (rosterId, position, depthOrder) =>
    request('/roster/depth-chart', { method: 'PUT', body: { rosterId, position, depthOrder } }),
  swapDepthChart: (a, b) =>
    request('/roster/depth-chart/swap', { method: 'POST', body: { a, b } }),

  getAudit: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/audit${qs ? `?${qs}` : ''}`);
  },

  listUsers: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: payload }),
  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
};
