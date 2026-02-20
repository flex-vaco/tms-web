import { useState } from 'react';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useApprovals, useApprovalStats, useApproveTimesheet, useRejectTimesheet } from '../hooks/useApprovals';
import { formatDateRange, formatHours as _formatHours } from '../utils/dateHelpers';
import { formatHours } from '../utils/formatHours';
import type { Timesheet } from '../types';

export default function ApprovalsPage() {
  const [page] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<Timesheet | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: approvalsData, isLoading } = useApprovals(page);
  const { data: stats } = useApprovalStats();
  const approveTs = useApproveTimesheet();
  const rejectTs = useRejectTimesheet();

  const timesheets = approvalsData?.data ?? [];

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    await rejectTs.mutateAsync({ id: rejectTarget.id, reason: rejectReason });
    setRejectTarget(null);
    setRejectReason('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve team timesheets</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard variant="primary" title="Pending" value={stats?.pendingCount ?? 0} subtitle="awaiting review" icon="⏳" />
          <StatCard variant="success" title="Approved This Week" value={stats?.approvedThisWeek ?? 0} subtitle="timesheets" icon="✓" />
          <StatCard variant="secondary" title="Team Hours" value={formatHours(stats?.teamHours ?? 0)} subtitle="this week" icon="⏱" />
          <StatCard variant="neutral" title="Team Members" value={stats?.teamMembers ?? 0} subtitle="active" icon="👥" />
        </div>

        {/* Pending Banner */}
        {(stats?.pendingCount ?? 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-lg">⚠</span>
            <p className="text-sm text-amber-800">
              <strong>{stats?.pendingCount}</strong> timesheet{stats!.pendingCount !== 1 ? 's' : ''} pending your review
            </p>
          </div>
        )}

        {/* Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : timesheets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-600 font-medium">All caught up!</p>
            <p className="text-gray-400 text-sm mt-1">No timesheets pending approval</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {timesheets.map((ts) => (
              <TimesheetApprovalCard
                key={ts.id}
                timesheet={ts}
                onApprove={() => approveTs.mutate(ts.id)}
                onReject={() => setRejectTarget(ts)}
                isApproving={approveTs.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
        title="Reject Timesheet"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting{' '}
            <strong>{rejectTarget?.user?.name}'s</strong> timesheet.
          </p>
          <Input
            label="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Missing project descriptions"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              isLoading={rejectTs.isPending}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

function TimesheetApprovalCard({
  timesheet,
  onApprove,
  onReject,
  isApproving,
}: {
  timesheet: Timesheet;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
}) {
  const billablePct =
    timesheet.totalHours > 0
      ? Math.round((timesheet.billableHours / timesheet.totalHours) * 100)
      : 0;

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={timesheet.user?.name ?? 'User'} size="md" />
          <div>
            <p className="font-semibold text-gray-800">{timesheet.user?.name ?? 'Unknown'}</p>
            <p className="text-xs text-gray-400">{timesheet.user?.department ?? 'No department'}</p>
          </div>
        </div>
        <Badge variant="submitted">Submitted</Badge>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {formatDateRange(new Date(timesheet.weekStartDate), new Date(timesheet.weekEndDate))}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total Hours</p>
          <p className="text-lg font-bold font-mono text-gray-800">{formatHours(timesheet.totalHours)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Billable</p>
          <p className="text-lg font-bold font-mono text-brand-success">{formatHours(timesheet.billableHours)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Non-Billable</p>
          <p className="text-lg font-bold font-mono text-gray-600">
            {formatHours(timesheet.totalHours - timesheet.billableHours)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Billable %</p>
          <p className="text-lg font-bold font-mono text-brand-primary">{billablePct}%</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="success"
          size="sm"
          className="flex-1"
          onClick={onApprove}
          isLoading={isApproving}
        >
          ✓ Approve
        </Button>
        <Button variant="danger" size="sm" className="flex-1" onClick={onReject}>
          ✕ Reject
        </Button>
      </div>
    </div>
  );
}
