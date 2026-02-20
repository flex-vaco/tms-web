import { api } from './api';
import type { ReportData, ApiSuccess } from '../types';

export interface ReportFiltersDto {
  dateFrom: string;
  dateTo: string;
  userId?: number;
  status?: string;
  projectId?: number;
}

export const reportsService = {
  async generate(filters: ReportFiltersDto): Promise<ReportData> {
    const { data } = await api.get<ApiSuccess<ReportData>>('/reports', { params: filters });
    return data.data;
  },

  async exportReport(filters: ReportFiltersDto, format: 'csv' | 'excel' | 'pdf'): Promise<void> {
    const response = await api.get('/reports/export', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `highspring-report.${format === 'excel' ? 'xlsx' : format}`;
    link.click();
    URL.revokeObjectURL(url);
  },

  async exportMonthlyTimesheet(userId: number, year: number, month: number): Promise<void> {
    const response = await api.get('/reports/export-monthly', {
      params: { userId, year, month },
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const filenameMatch = disposition?.match(/filename=(.+)/);
    const filename = filenameMatch ? filenameMatch[1] : `timesheet-${year}-${month}.xlsx`;

    const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};
