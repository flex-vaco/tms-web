import { api } from './api';
import type { User, ApiSuccess, ApiPaginated } from '../types';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  managerIds?: number[];
}

export const usersService = {
  async list(): Promise<User[]> {
    const { data } = await api.get<ApiPaginated<User>>('/users');
    return data.data;
  },

  async create(dto: CreateUserDto): Promise<User> {
    const { data } = await api.post<ApiSuccess<User>>('/users', dto);
    return data.data;
  },

  async update(id: number, dto: Partial<CreateUserDto> & { status?: string }): Promise<User> {
    const { data } = await api.put<ApiSuccess<User>>(`/users/${id}`, dto);
    return data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
