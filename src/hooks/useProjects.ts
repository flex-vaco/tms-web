import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService, type CreateProjectDto } from '../services/projects.service';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsService.list,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (dto: CreateProjectDto) => projectsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('Project created', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to create project'), 'error'),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateProjectDto> & { status?: string } }) =>
      projectsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('Project updated', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to update project'), 'error'),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => projectsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('Project deleted', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to delete project'), 'error'),
  });
}
