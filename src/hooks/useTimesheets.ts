import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { timesheetsService } from '../services/timesheets.service';
import type { TimeEntry } from '../types';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useTimesheets(page = 1) {
  return useQuery({
    queryKey: ['timesheets', page],
    queryFn: () => timesheetsService.list(page),
  });
}

export function useTimesheet(id: number | undefined) {
  return useQuery({
    queryKey: ['timesheets', id],
    queryFn: () => timesheetsService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateTimesheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: timesheetsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast('Timesheet created', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to create timesheet'), 'error'),
  });
}

export function useSubmitTimesheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => timesheetsService.submit(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets', data.id] });
      toast('Timesheet submitted for approval', 'success');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to submit timesheet'), 'error'),
  });
}

export function useCopyPreviousWeek() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ weekStartDate, force }: { weekStartDate: string; force?: boolean }) =>
      timesheetsService.copyPreviousWeek(weekStartDate, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast('Previous week copied', 'success');
    },
    // 409 is handled by the page (shows confirm dialog) — only toast other errors
    onError: (err) => {
      if (!axios.isAxiosError(err) || err.response?.status !== 409) {
        toast(getErrorMessage(err, 'No previous week to copy'), 'error');
      }
    },
  });
}

export function useAddTimeEntry(timesheetId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (dto: Partial<TimeEntry>) => timesheetsService.addEntry(timesheetId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets', timesheetId] });
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to add entry'), 'error'),
  });
}

export function useUpdateTimeEntry(timesheetId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ entryId, dto }: { entryId: number; dto: Partial<TimeEntry> }) =>
      timesheetsService.updateEntry(timesheetId, entryId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets', timesheetId] });
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to update entry'), 'error'),
  });
}

export function useDeleteTimeEntry(timesheetId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (entryId: number) => timesheetsService.deleteEntry(timesheetId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets', timesheetId] });
      toast('Entry removed', 'info');
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to delete entry'), 'error'),
  });
}
