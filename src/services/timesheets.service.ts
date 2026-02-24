import { api } from './api';
import type {
  Timesheet,
  TimeEntry,
  ApiSuccess,
  ApiPaginated,
} from '../types';

export const timesheetsService = {
  async list(page = 1, limit = 10): Promise<ApiPaginated<Timesheet>> {
    const { data } = await api.get<ApiPaginated<Timesheet>>('/timesheets', {
      params: { page, limit },
    });
    return data;
  },

  async getById(id: number): Promise<Timesheet> {
    const { data } = await api.get<ApiSuccess<Timesheet>>(`/timesheets/${id}`);
    return data.data;
  },

  async create(dto: { weekStartDate: string; weekEndDate: string }): Promise<Timesheet> {
    const { data } = await api.post<ApiSuccess<Timesheet>>('/timesheets', dto);
    return data.data;
  },

  async update(id: number, dto: Partial<{ weekStartDate: string; weekEndDate: string }>): Promise<Timesheet> {
    const { data } = await api.put<ApiSuccess<Timesheet>>(`/timesheets/${id}`, dto);
    return data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/timesheets/${id}`);
  },

  async submit(id: number): Promise<Timesheet> {
    const { data } = await api.post<ApiSuccess<Timesheet>>(`/timesheets/${id}/submit`);
    return data.data;
  },

  async copyPreviousWeek(weekStartDate: string, force = false): Promise<Timesheet> {
    const { data } = await api.post<ApiSuccess<Timesheet>>('/timesheets/copy-previous-week', {
      targetWeekStart: weekStartDate,
      force,
    });
    return data.data;
  },

  // Time entries
  async getEntries(timesheetId: number): Promise<TimeEntry[]> {
    const { data } = await api.get<ApiSuccess<TimeEntry[]>>(`/timesheets/${timesheetId}/entries`);
    return data.data;
  },

  async addEntry(timesheetId: number, dto: Partial<TimeEntry>): Promise<TimeEntry> {
    const { data } = await api.post<ApiSuccess<TimeEntry>>(
      `/timesheets/${timesheetId}/entries`,
      dto
    );
    return data.data;
  },

  async updateEntry(
    timesheetId: number,
    entryId: number,
    dto: Partial<TimeEntry>
  ): Promise<TimeEntry> {
    const { data } = await api.put<ApiSuccess<TimeEntry>>(
      `/timesheets/${timesheetId}/entries/${entryId}`,
      dto
    );
    return data.data;
  },

  async deleteEntry(timesheetId: number, entryId: number): Promise<void> {
    await api.delete(`/timesheets/${timesheetId}/entries/${entryId}`);
  },
};
