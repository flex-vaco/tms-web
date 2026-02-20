import { api } from './api';
import type { Holiday, ApiSuccess, ApiPaginated } from '../types';

export interface CreateHolidayDto {
  name: string;
  date: string;
  recurring: boolean;
}

export const holidaysService = {
  async list(year?: number): Promise<Holiday[]> {
    const { data } = await api.get<ApiPaginated<Holiday>>('/holidays', {
      params: year ? { year } : {},
    });
    return data.data;
  },

  async create(dto: CreateHolidayDto): Promise<Holiday> {
    const { data } = await api.post<ApiSuccess<Holiday>>('/holidays', dto);
    return data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/holidays/${id}`);
  },
};
