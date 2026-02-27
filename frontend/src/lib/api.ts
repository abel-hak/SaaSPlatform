import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refresh });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export type PlanName = 'free' | 'pro' | 'enterprise';

export interface MeResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: PlanName;
  };
}

export interface UsageMetrics {
  period: string;
  ai_queries_used: number;
  ai_queries_limit: number | null;
  documents_uploaded: number;
  documents_limit: number | null;
  seats_used: number;
  seats_limit: number | null;
  warnings: string[];
}

export interface UsageResponse {
  usage: UsageMetrics;
}

