import axios from 'axios';
import { api, setAccessToken } from './api';
import type { AuthUser } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

// Separate axios instance for auth endpoints — no 401 interceptor.
// Prevents refresh/login calls from triggering the auto-refresh loop.
const authApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  organisationName: string;
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export const authService = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    const { data } = await authApi.post<{ success: true; data: AuthResponse }>('/auth/login', dto);
    setAccessToken(data.data.accessToken);
    return data.data;
  },

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { data } = await authApi.post<{ success: true; data: AuthResponse }>('/auth/register', dto);
    setAccessToken(data.data.accessToken);
    return data.data;
  },

  async refresh(): Promise<AuthResponse> {
    const { data } = await authApi.post<{ success: true; data: AuthResponse }>('/auth/refresh');
    setAccessToken(data.data.accessToken);
    return data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    setAccessToken(null);
  },
};
