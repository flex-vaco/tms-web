import { api } from './api';
import type { Notification, ApiSuccess, ApiPaginated } from '../types';

export const notificationsService = {
  async list(): Promise<Notification[]> {
    const { data } = await api.get<ApiPaginated<Notification>>('/notifications');
    return data.data;
  },

  async markRead(id: number): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },
};
