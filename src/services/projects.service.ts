import { api } from './api';
import type { Project, ApiSuccess, ApiPaginated } from '../types';

export interface CreateProjectDto {
  code: string;
  name: string;
  client: string;
  budgetHours: number;
  managerIds?: number[];
}

export const projectsService = {
  async list(): Promise<Project[]> {
    const { data } = await api.get<ApiPaginated<Project>>('/projects');
    return data.data;
  },

  async create(dto: CreateProjectDto): Promise<Project> {
    const { data } = await api.post<ApiSuccess<Project>>('/projects', dto);
    return data.data;
  },

  async update(id: number, dto: Partial<CreateProjectDto> & { status?: string }): Promise<Project> {
    const { data } = await api.put<ApiSuccess<Project>>(`/projects/${id}`, dto);
    return data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
