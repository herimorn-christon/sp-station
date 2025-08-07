const API_BASE_URL = '/api';

interface RequestConfig extends RequestInit {
  token?: string;
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { token, ...requestConfig } = config;
  const headers = new Headers(config.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (config.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestConfig,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'An error occurred');
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string) => 
    request<T>(endpoint, { method: 'GET', token }),
  
  post: async <T>(endpoint: string, data: any, token?: string): Promise<T> => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // If data is FormData, don't set Content-Type (browser will do it)
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
  
  put: <T>(endpoint: string, data: any, token?: string) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
  
  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'DELETE', token }),
};