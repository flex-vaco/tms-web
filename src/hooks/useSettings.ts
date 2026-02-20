import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import type { OrgSettings } from '../types';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (dto: Partial<OrgSettings>) => settingsService.update(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast('Settings saved', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to save settings'), 'error'),
  });
}
