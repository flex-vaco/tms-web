import { useState } from 'react';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useReports, useExportReport } from '../hooks/useReports';
import { useQuery } from '@tanstack/react-query';
import { teamService } from '../services/team.service';
import { usersService } from '../services/users.service';
import { useAuth } from '../context/AuthContext';
import { formatHours } from '../utils/formatHours';
import { formatISO, formatDateRange } from '../utils/dateHelpers';
import type { ReportFiltersDto } from '../services/reports.service';
import type { TimesheetStatus } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { subDays, startOfMonth, endOfMonth, format } from 'date-fns';

const STATUS_VARIANT: Record<string, 'draft' | 'submitted' | 'approved' | 'rejected'> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const PRESETS = [
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

function getPresetDates(preset: string): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case 'this_week': {
      const mon = new Date(today);
      mon.setDate(today.getDate() - today.getDay() + 1);
      return { from: format(mon, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    }
    case 'last_week': {
      const mon = new Date(today);
      mon.setDate(today.getDate() - today.getDay() - 6);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: format(mon, 'yyyy-MM-dd'), to: format(sun, 'yyyy-MM-dd') };
    }
    case 'this_month':
      return {
        from: format(startOfMonth(today), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'last_month': {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    }
    default:
      return {
        from: format(subDays(today, 30), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
  }
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [preset, setPreset] = useState('this_month');
  const [dateFrom, setDateFrom] = useState(() => getPresetDates('this_month').from);
  const [dateTo, setDateTo] = useState(() => getPresetDates('this_month').to);
  const [status, setStatus] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [activeFilters, setActiveFilters] = useState<ReportFiltersDto | null>({
    dateFrom: getPresetDates('this_month').from,
    dateTo: getPresetDates('this_month').to,
  });

  // Admins see all users; Managers see only their direct reports
  const { data: employeeOptions = [] } = useQuery({
    queryKey: ['reports', 'employee-options', isAdmin],
    queryFn: () => isAdmin ? usersService.list() : teamService.getMyReports(),
  });

  const { data: report, isLoading } = useReports(activeFilters);
  const exportReport = useExportReport();

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      const dates = getPresetDates(value);
      setDateFrom(dates.from);
      setDateTo(dates.to);
    }
  };

  const handleGenerate = () => {
    setActiveFilters({
      dateFrom,
      dateTo,
      status: status as TimesheetStatus || undefined,
      userId: employeeFilter ? parseInt(employeeFilter) : undefined,
    });
  };

  const handleReset = () => {
    const dates = getPresetDates('this_month');
    setPreset('this_month');
    setDateFrom(dates.from);
    setDateTo(dates.to);
    setStatus('');
    setEmployeeFilter('');
    setActiveFilters({ dateFrom: dates.from, dateTo: dates.to });
  };

  const handleExport = (fmt: 'csv' | 'excel' | 'pdf') => {
    if (!activeFilters) return;
    exportReport.mutate({ filters: activeFilters, format: fmt });
  };

  // Build chart data from timesheets
  const chartData = (report?.timesheets ?? []).reduce<Record<string, { week: string; billable: number; nonBillable: number }>>(
    (acc, ts) => {
      const week = formatDateRange(new Date(ts.weekStartDate), new Date(ts.weekEndDate));
      if (!acc[week]) acc[week] = { week, billable: 0, nonBillable: 0 };
      acc[week].billable += ts.billableHours;
      acc[week].nonBillable += ts.totalHours - ts.billableHours;
      return acc;
    },
    {}
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Analyze timesheet data across your team</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-40">
              <Select
                label="Period"
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                options={PRESETS}
              />
            </div>
            <div className="w-36">
              <Input
                label="From"
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPreset('custom'); }}
              />
            </div>
            <div className="w-36">
              <Input
                label="To"
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPreset('custom'); }}
              />
            </div>
            <div className="w-40">
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SUBMITTED', label: 'Submitted' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
              />
            </div>
            <div className="w-44">
              <Select
                label="Employee"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Team Members' },
                  ...employeeOptions.map((m) => ({ value: String(m.id), label: m.name })),
                ]}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} isLoading={isLoading}>Generate</Button>
              <Button variant="ghost" onClick={handleReset}>Reset</Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard variant="primary" title="Total Hours" value={formatHours(report?.totalHours ?? 0)} icon="⏱" />
          <StatCard variant="success" title="Billable Hours" value={formatHours(report?.billableHours ?? 0)} icon="💰" />
          <StatCard
            variant="secondary"
            title="Utilization"
            value={`${report?.utilizationPct ?? 0}%`}
            icon="📈"
          />
          <StatCard
            variant="neutral"
            title="Revenue"
            value={`$${(report?.revenue ?? 0).toLocaleString()}`}
            icon="💵"
          />
        </div>

        {/* Chart */}
        {Object.keys(chartData).length > 0 && (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Hours Breakdown</h2>
              <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')} isLoading={exportReport.isPending}>
                Export PDF
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={Object.values(chartData)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${formatHours(value)}h`]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="billable" name="Billable" fill="#52A675" radius={[3, 3, 0, 0]} />
                <Bar dataKey="nonBillable" name="Non-Billable" fill="#E8A44C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Timesheets Table */}
        {(report?.timesheets?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Timesheet Details</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleExport('csv')} isLoading={exportReport.isPending}>CSV</Button>
                <Button variant="ghost" size="sm" onClick={() => handleExport('excel')} isLoading={exportReport.isPending}>Excel</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Week</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Billable</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Bill%</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report!.timesheets.map((ts) => (
                    <tr key={ts.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{ts.user?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {formatDateRange(new Date(ts.weekStartDate), new Date(ts.weekEndDate))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-800">{formatHours(ts.totalHours)}</td>
                      <td className="px-4 py-3 text-right font-mono text-brand-success">{formatHours(ts.billableHours)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">
                        {ts.totalHours > 0 ? Math.round((ts.billableHours / ts.totalHours) * 100) : 0}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_VARIANT[ts.status]}>
                          {ts.status.charAt(0) + ts.status.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {report && (report.timesheets?.length ?? 0) === 0 && (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-500 text-sm">No data for the selected filters</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
