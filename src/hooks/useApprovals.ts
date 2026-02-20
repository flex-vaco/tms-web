import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsService } from '../services/approvals.service';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useApprovals(page = 1) {
  return useQuery({
    queryKey: ['approvals', page],
    queryFn: () => approvalsService.list(page),
  });
}

export function useApprovalStats() {
  return useQuery({
    queryKey: ['approvals', 'stats'],
    queryFn: approvalsService.getStats,
  });
}

export function useApproveTimesheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => approvalsService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast('Timesheet approved', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to approve timesheet'), 'error'),
  });
}

export function useRejectTimesheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      approvalsService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast('Timesheet rejected', 'info');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to reject timesheet'), 'error'),
  });
}
