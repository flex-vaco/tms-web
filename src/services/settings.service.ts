import { api } from './api';
import type { OrgSettings, ApiSuccess } from '../types';

export const settingsService = {
  async get(): Promise<OrgSettings> {
    const { data } = await api.get<ApiSuccess<OrgSettings>>('/settings');
    return data.data;
  },

  async update(dto: Partial<OrgSettings>): Promise<OrgSettings> {
    const { data } = await api.put<ApiSuccess<OrgSettings>>('/settings', dto);
    return data.data;
  },
};
