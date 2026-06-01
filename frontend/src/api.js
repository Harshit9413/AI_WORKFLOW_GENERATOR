export const BASE_URL = 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('wf_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('wf_token')
    window.location.href = '/login'
    return
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (email, password) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request('/auth/me'),

  generateDiagram: (prompt) =>
    request('/generate-diagram', { method: 'POST', body: JSON.stringify({ prompt }) }),

  generateStream: async (prompt, onStep) => {
    const token = getToken()
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    const res = await fetch(`${BASE_URL}/generate-diagram/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt }),
    })
    if (res.status === 401) {
      localStorage.removeItem('wf_token')
      window.location.href = '/login'
      return
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Request failed: ${res.status}`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        let data
        try {
          data = JSON.parse(line.slice(6))
        } catch {
          continue
        }
        if (data.type === 'step') {
          onStep(data.label)
        } else if (data.type === 'done') {
          return data
        } else if (data.type === 'chat') {
          return data
        } else if (data.type === 'error') {
          throw new Error(data.message)
        }
      }
    }
    throw new Error('Stream ended without a result')
  },

  saveWorkflow: (data) =>
    request('/workflows/save', { method: 'POST', body: JSON.stringify(data) }),

  listWorkflows: () => request('/workflows'),

  getWorkflow: (id) => request(`/workflows/${id}`),

  deleteWorkflow: (id) => request(`/workflows/${id}`, { method: 'DELETE' }),

  renameWorkflow: (id, title) =>
    request(`/workflows/${id}/rename`, { method: 'PATCH', body: JSON.stringify({ title }) }),

  duplicateWorkflow: (id) =>
    request(`/workflows/${id}/duplicate`, { method: 'POST' }),

  getShare: (token) => request(`/share/${token}`),

  chatEnhance: (message, nodes, edges, history) =>
    request('/chat/enhance', {
      method: 'POST',
      body: JSON.stringify({ message, nodes, edges, history }),
    }),
}

export function setToken(token) {
  localStorage.setItem('wf_token', token)
}

export function clearToken() {
  localStorage.removeItem('wf_token')
}

export function isLoggedIn() {
  return !!getToken()
}
