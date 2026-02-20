import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { timesheetsService } from '../services/timesheets.service';
import { notificationsService } from '../services/notifications.service';
import { getWeekStart, getWeekEnd, formatDateRange, formatISO } from '../utils/dateHelpers';
import { useCreateTimesheet } from '../hooks/useTimesheets';
import type { TimesheetStatus } from '../types';
import { formatHours } from '../utils/formatHours';

const statusVariant: Record<TimesheetStatus, 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending'> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createTimesheet = useCreateTimesheet();

  const { data: timesheetsData } = useQuery({
    queryKey: ['timesheets', 1],
    queryFn: () => timesheetsService.list(1, 5),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.list,
  });

  const timesheets = timesheetsData?.data ?? [];

  // Stats computation
  const now = new Date();
  const weekStart = getWeekStart(now);
  const thisWeekSheet = timesheets.find(
    (t) => new Date(t.weekStartDate).toDateString() === weekStart.toDateString()
  );

  const thisMonth = timesheets.filter((t) => {
    const d = new Date(t.weekStartDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthHours = thisMonth.reduce((sum, t) => sum + t.totalHours, 0);
  const monthBillable = thisMonth.reduce((sum, t) => sum + t.billableHours, 0);
  const billablePct = monthHours > 0 ? Math.round((monthBillable / monthHours) * 100) : 0;
  const pendingCount = timesheets.filter((t) => t.status === 'SUBMITTED').length;

  const handleNewTimesheet = async () => {
    const start = getWeekStart(now);
    const end = getWeekEnd(now);
    try {
      const ts = await createTimesheet.mutateAsync({
        weekStartDate: formatISO(start),
        weekEndDate: formatISO(end),
      });
      navigate(`/timesheet?id=${ts.id}`);
    } catch {
      navigate('/timesheet');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="primary"
            title="This Week"
            value={formatHours(thisWeekSheet?.totalHours ?? 0)}
            subtitle="hours logged"
            icon="⏱"
          />
          <StatCard
            variant="secondary"
            title="This Month"
            value={formatHours(monthHours)}
            subtitle="total hours"
            icon="📅"
          />
          <StatCard
            variant="success"
            title="Billable"
            value={`${billablePct}%`}
            subtitle="of month hours"
            icon="💰"
          />
          <StatCard
            variant="neutral"
            title="Pending Approvals"
            value={pendingCount}
            subtitle="timesheets"
            icon="⏳"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-card p-5 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionButton
                icon="➕"
                label="New Timesheet"
                onClick={handleNewTimesheet}
                loading={createTimesheet.isPending}
              />
              <QuickActionButton
                icon="📋"
                label="Copy Last Week"
                onClick={() => navigate('/timesheet?copy=true')}
              />
              <QuickActionButton
                icon="📊"
                label="Export Report"
                onClick={() => navigate('/reports')}
                disabled={!['MANAGER', 'ADMIN'].includes(user?.role ?? '')}
              />
              <QuickActionButton
                icon="⚙"
                label="Settings"
                onClick={() => navigate('/admin')}
                disabled={user?.role !== 'ADMIN'}
              />
            </div>
          </div>

          {/* Recent Timesheets */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-card p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Recent Timesheets</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/timesheet')}>View all</Button>
            </div>
            {timesheets.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p className="text-2xl mb-2">📋</p>
                No timesheets yet. <button onClick={handleNewTimesheet} className="text-brand-primary hover:underline">Create one</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {timesheets.map((ts) => (
                  <div
                    key={ts.id}
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                    onClick={() => navigate(`/timesheet?id=${ts.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {formatDateRange(new Date(ts.weekStartDate), new Date(ts.weekEndDate))}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {formatHours(ts.totalHours)} hrs · {ts.totalHours > 0 ? Math.round((ts.billableHours / ts.totalHours) * 100) : 0}% billable
                      </p>
                    </div>
                    <Badge variant={statusVariant[ts.status]}>{ts.status.charAt(0) + ts.status.slice(1).toLowerCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        {notifications.filter((n) => !n.read).length > 0 && (
          <div className="bg-white rounded-xl shadow-card p-5 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Notifications</h2>
            <div className="space-y-2">
              {notifications.filter((n) => !n.read).slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    n.type === 'approved' ? 'bg-brand-success' :
                    n.type === 'rejected' ? 'bg-brand-danger' :
                    'bg-brand-secondary'
                  }`} />
                  <div>
                    <p className="text-gray-700">{n.message}</p>
                    <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function QuickActionButton({
  icon, label, onClick, loading, disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-brand-primary hover:bg-brand-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-center"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </button>
  );
}
