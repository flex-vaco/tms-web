import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsService, type ReportFiltersDto } from '../services/reports.service';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useReports(filters: ReportFiltersDto | null) {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => reportsService.generate(filters!),
    enabled: !!filters,
  });
}

export function useExportReport() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ filters, format }: { filters: ReportFiltersDto; format: 'csv' | 'excel' | 'pdf' }) =>
      reportsService.exportReport(filters, format),
    onSuccess: () => toast('Export downloaded', 'success'),
    onError: (err) => toast(getErrorMessage(err, 'Export failed'), 'error'),
  });
}
