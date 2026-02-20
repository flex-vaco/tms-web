import { api } from './api';
import type { Timesheet, ApprovalStats, ApiSuccess, ApiPaginated } from '../types';

export const approvalsService = {
  async list(page = 1, limit = 10): Promise<ApiPaginated<Timesheet>> {
    const { data } = await api.get<ApiPaginated<Timesheet>>('/approvals', {
      params: { page, limit },
    });
    return data;
  },

  async getStats(): Promise<ApprovalStats> {
    const { data } = await api.get<ApiSuccess<ApprovalStats>>('/approvals/stats');
    return data.data;
  },

  async approve(id: number): Promise<Timesheet> {
    const { data } = await api.post<ApiSuccess<Timesheet>>(`/approvals/${id}/approve`);
    return data.data;
  },

  async reject(id: number, reason: string): Promise<Timesheet> {
    const { data } = await api.post<ApiSuccess<Timesheet>>(`/approvals/${id}/reject`, { reason });
    return data.data;
  },
};
