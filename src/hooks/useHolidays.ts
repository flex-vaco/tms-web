import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidaysService, type CreateHolidayDto } from '../services/holidays.service';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ['holidays', year],
    queryFn: () => holidaysService.list(year),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (dto: CreateHolidayDto) => holidaysService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast('Holiday added', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to add holiday'), 'error'),
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => holidaysService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast('Holiday removed', 'info');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to delete holiday'), 'error'),
  });
}
