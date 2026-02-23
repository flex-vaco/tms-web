import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService, type CreateUserDto } from '../services/users.service';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersService.list,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (dto: CreateUserDto) => usersService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('User created', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to create user'), 'error'),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateUserDto> & { status?: string } }) =>
      usersService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('User updated', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to update user'), 'error'),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast('User deactivated', 'info');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to deactivate user'), 'error'),
  });
}
