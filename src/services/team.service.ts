import { api } from './api';
import type { User, ApiSuccess } from '../types';

export const teamService = {
  async getMyReports(): Promise<User[]> {
    const { data } = await api.get<ApiSuccess<User[]>>('/team/my-reports');
    return data.data;
  },

  async getMyManagers(): Promise<User[]> {
    const { data } = await api.get<ApiSuccess<User[]>>('/team/my-managers');
    return data.data;
  },
};
