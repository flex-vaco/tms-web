import { useState } from 'react';
import { parseISO } from 'date-fns';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useApprovals, useApprovalStats, useApproveTimesheet, useRejectTimesheet } from '../hooks/useApprovals';
import { formatDateRange, getDayLabels } from '../utils/dateHelpers';
import { formatHours } from '../utils/formatHours';
import type { Timesheet } from '../types';

const DETAIL_KEYS = [
  { hours: 'monHours', timeOff: 'monTimeOff', desc: 'monDesc' },
  { hours: 'tueHours', timeOff: 'tueTimeOff', desc: 'tueDesc' },
  { hours: 'wedHours', timeOff: 'wedTimeOff', desc: 'wedDesc' },
  { hours: 'thuHours', timeOff: 'thuTimeOff', desc: 'thuDesc' },
  { hours: 'friHours', timeOff: 'friTimeOff', desc: 'friDesc' },
  { hours: 'satHours', timeOff: 'satTimeOff', desc: 'satDesc' },
  { hours: 'sunHours', timeOff: 'sunTimeOff', desc: 'sunDesc' },
] as const;

export default function ApprovalsPage() {
  const [page] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<Timesheet | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailTarget, setDetailTarget] = useState<Timesheet | null>(null);

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

  const handleApproveFromDetail = () => {
    if (!detailTarget) return;
    approveTs.mutate(detailTarget.id);
    setDetailTarget(null);
  };

  const handleRejectFromDetail = () => {
    const ts = detailTarget;
    setDetailTarget(null);
    setRejectTarget(ts);
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
                onDetails={() => setDetailTarget(ts)}
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

      {/* Detail Modal */}
      {detailTarget && (
        <TimesheetDetailModal
          timesheet={detailTarget}
          onClose={() => setDetailTarget(null)}
          onApprove={handleApproveFromDetail}
          onReject={handleRejectFromDetail}
          isApproving={approveTs.isPending}
        />
      )}
    </Layout>
  );
}

function TimesheetApprovalCard({
  timesheet,
  onApprove,
  onReject,
  onDetails,
  isApproving,
}: {
  timesheet: Timesheet;
  onApprove: () => void;
  onReject: () => void;
  onDetails: () => void;
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDetails}>View Details</Button>
          <Badge variant="submitted">Submitted</Badge>
        </div>
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

function TimesheetDetailModal({
  timesheet,
  onClose,
  onApprove,
  onReject,
  isApproving,
}: {
  timesheet: Timesheet;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
}) {
  const entries = timesheet.timeEntries ?? [];
  const dayLabels = getDayLabels(parseISO(timesheet.weekStartDate));
  const billablePct =
    timesheet.totalHours > 0
      ? Math.round((timesheet.billableHours / timesheet.totalHours) * 100)
      : 0;

  const dayTotals = DETAIL_KEYS.map(({ hours }) =>
    entries.reduce((sum, e) => sum + ((e[hours] as number) || 0), 0)
  );

  // Collect per-day task notes from all entries
  const entryNotes: { project: string; day: string; desc: string }[] = [];
  entries.forEach((entry) => {
    DETAIL_KEYS.forEach(({ desc }, i) => {
      const d = (entry[desc] as string | undefined)?.trim();
      if (d) {
        entryNotes.push({
          project: entry.project?.name ?? 'Unknown',
          day: `${dayLabels[i].label} ${dayLabels[i].date}`,
          desc: d,
        });
      }
    });
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${timesheet.user?.name ?? 'Unknown'} — ${formatDateRange(new Date(timesheet.weekStartDate), new Date(timesheet.weekEndDate))}`}
      size="xl"
    >
      <div className="space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Hours</p>
            <p className="text-xl font-bold font-mono text-gray-800">{formatHours(timesheet.totalHours)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Billable</p>
            <p className="text-xl font-bold font-mono text-brand-success">{formatHours(timesheet.billableHours)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Non-Billable</p>
            <p className="text-xl font-bold font-mono text-gray-600">{formatHours(timesheet.totalHours - timesheet.billableHours)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Billable %</p>
            <p className="text-xl font-bold font-mono text-brand-primary">{billablePct}%</p>
          </div>
        </div>

        {/* Hours breakdown table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Project</th>
                <th className="text-center px-2 py-2 text-xs font-semibold text-gray-500 uppercase w-10">Bill.</th>
                {dayLabels.map(({ label, date }) => (
                  <th key={label} className="text-center px-1 py-2 text-xs font-semibold text-gray-500 w-16">
                    <div className="uppercase">{label}</div>
                    <div className="font-normal normal-case text-gray-400">{date}</div>
                  </th>
                ))}
                <th className="text-center px-2 py-2 text-xs font-semibold text-gray-500 uppercase w-16">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-sm text-gray-400">
                    No entries recorded
                  </td>
                </tr>
              ) : entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-800 text-sm">{entry.project?.name ?? 'Unknown'}</p>
                    <p className="text-xs font-mono text-gray-400">{entry.project?.code}</p>
                  </td>
                  <td className="text-center px-2 py-2.5">
                    {entry.billable
                      ? <span className="text-brand-success font-semibold">✓</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  {DETAIL_KEYS.map(({ hours, timeOff }, i) => {
                    const h = (entry[hours] as number) || 0;
                    const tof = (entry[timeOff] as number | undefined) ?? 0;
                    return (
                      <td key={i} className="text-center px-1 py-2.5">
                        {h === 0 && tof === 0 ? (
                          <span className="text-gray-200 text-xs">—</span>
                        ) : (
                          <div className="leading-tight">
                            {h > 0 && <div className="font-mono text-xs text-gray-700">{h}</div>}
                            {tof > 0 && <div className="font-mono text-xs text-brand-secondary font-medium">{tof}L</div>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-2 py-2.5 font-mono text-sm font-semibold text-gray-700">
                    {entry.totalHours}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Daily Total
                </td>
                {dayTotals.map((total, i) => (
                  <td key={i} className="text-center px-1 py-2 font-mono text-xs font-semibold text-gray-700">
                    {total > 0 ? total : <span className="text-gray-200">—</span>}
                  </td>
                ))}
                <td className="text-center px-2 py-2 font-mono text-sm font-semibold text-brand-primary">
                  {timesheet.totalHours}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Task notes — per-day descriptions */}
        {entryNotes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Task Notes</h4>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-44 overflow-y-auto">
              {entryNotes.map((note, i) => (
                <div key={i} className="px-3 py-2 flex gap-3 items-start text-xs">
                  <span className="font-mono text-gray-400 whitespace-nowrap pt-px w-16 shrink-0">{note.day}</span>
                  <span className="font-medium text-gray-500 whitespace-nowrap shrink-0">{note.project}</span>
                  <span className="text-gray-700">{note.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          <Button variant="danger" size="sm" onClick={onReject}>✕ Reject</Button>
          <Button variant="success" size="sm" onClick={onApprove} isLoading={isApproving}>✓ Approve</Button>
        </div>
      </div>
    </Modal>
  );
}
