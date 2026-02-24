import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import {
  useCreateTimesheet,
  useSubmitTimesheet,
  useCopyPreviousWeek,
  useAddTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from '../hooks/useTimesheets';
import { useProjects } from '../hooks/useProjects';
import { useHolidays } from '../hooks/useHolidays';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timesheetsService } from '../services/timesheets.service';
import { reportsService } from '../services/reports.service';
import { teamService } from '../services/team.service';
import { usersService } from '../services/users.service';
import {
  getWeekStart,
  getWeekEnd,
  nextWeek,
  prevWeek,
  formatDateRange,
  formatISO,
  getDayLabels,
} from '../utils/dateHelpers';
import { formatHours, parseHours } from '../utils/formatHours';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import type { TimeEntry, TimesheetStatus, Holiday } from '../types';

const STATUS_VARIANT: Record<TimesheetStatus, 'draft' | 'submitted' | 'approved' | 'rejected'> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const DAY_KEYS = ['monHours', 'tueHours', 'wedHours', 'thuHours', 'friHours', 'satHours', 'sunHours'] as const;

/** Returns an array of 7 booleans indicating if each day (Mon-Sun) is a holiday */
function getHolidayFlags(weekStart: Date, holidays: Holiday[]): { isHoliday: boolean; name?: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const match = holidays.find((h) => {
      const hDate = typeof h.date === 'string' ? parseISO(h.date) : h.date;
      return isSameDay(day, hDate);
    });
    return { isHoliday: !!match, name: match?.name };
  });
}

export default function TimesheetPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [timesheetId, setTimesheetId] = useState<number | undefined>(() => {
    const id = searchParams.get('id');
    return id ? parseInt(id) : undefined;
  });
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState<number | undefined>();
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadUserId, setDownloadUserId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const { toast } = useToast();
  const createTimesheet = useCreateTimesheet();
  const submitTimesheet = useSubmitTimesheet();
  const copyPrevWeek = useCopyPreviousWeek();
  const addEntry = useAddTimeEntry(timesheetId ?? 0);
  const updateEntry = useUpdateTimeEntry(timesheetId ?? 0);
  const deleteEntry = useDeleteTimeEntry(timesheetId ?? 0);
  const { data: projects = [] } = useProjects();
  const { data: holidays = [] } = useHolidays(currentWeekStart.getFullYear());

  // Managers see their direct reports; Admins see all users
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['download-team-members', isManagerOrAdmin, user?.role],
    queryFn: () => user?.role === 'ADMIN' ? usersService.list() : teamService.getMyReports(),
    enabled: isManagerOrAdmin,
  });

  const weekEnd = getWeekEnd(currentWeekStart);
  const dayLabels = getDayLabels(currentWeekStart);

  // Compute which days of the week are holidays
  const holidayFlags = useMemo(
    () => getHolidayFlags(currentWeekStart, holidays),
    [currentWeekStart, holidays]
  );

  const { data: timesheet, isLoading } = useQuery({
    queryKey: ['timesheets', timesheetId],
    queryFn: () => timesheetsService.getById(timesheetId!),
    enabled: !!timesheetId,
  });

  // Load or create timesheet for current week
  const loadWeek = useCallback(async () => {
    const weekStartStr = formatISO(currentWeekStart);
    const existing = await timesheetsService.list(1, 50);
    const found = existing.data.find(
      (t) => t.weekStartDate.startsWith(weekStartStr)
    );
    if (found) {
      setTimesheetId(found.id);
      setSearchParams({ id: String(found.id) });
    } else {
      setTimesheetId(undefined);
      setSearchParams({});
    }
  }, [currentWeekStart, setSearchParams]);

  useEffect(() => {
    if (!searchParams.get('id')) {
      loadWeek();
    }
  }, [currentWeekStart]); // eslint-disable-line

  const handleCreateForWeek = async () => {
    const ts = await createTimesheet.mutateAsync({
      weekStartDate: formatISO(currentWeekStart),
      weekEndDate: formatISO(weekEnd),
    });
    setTimesheetId(ts.id);
    setSearchParams({ id: String(ts.id) });
  };

  const handleCopyPrevWeek = async () => {
    try {
      const ts = await copyPrevWeek.mutateAsync({ weekStartDate: formatISO(currentWeekStart) });
      setTimesheetId(ts.id);
      setSearchParams({ id: String(ts.id) });
    } catch (err) {
      // 409 means a draft already exists — ask the user whether to overwrite it
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        setConfirmOverwriteOpen(true);
      }
      // other errors are handled by the hook's onError
    }
  };

  const handleConfirmOverwrite = async () => {
    setConfirmOverwriteOpen(false);
    try {
      const ts = await copyPrevWeek.mutateAsync({ weekStartDate: formatISO(currentWeekStart), force: true });
      setTimesheetId(ts.id);
      setSearchParams({ id: String(ts.id) });
    } catch {
      // handled by hook's onError
    }
  };

  const handleSubmit = async () => {
    if (!timesheetId) return;

    if (entries.length === 0) {
      toast('Cannot submit an empty timesheet. Add at least one project row.', 'warning');
      return;
    }

    if (totalHours === 0) {
      toast('Cannot submit a timesheet with zero hours. Please log your time.', 'warning');
      return;
    }

    if (totalHours > 60) {
      const confirmed = window.confirm(`Total hours (${totalHours}) exceed 60. Are you sure you want to submit?`);
      if (!confirmed) return;
    }

    await submitTimesheet.mutateAsync(timesheetId);
  };

  const handleAddRow = async () => {
    if (!newProjectId || !timesheetId) return;
    await addEntry.mutateAsync({
      projectId: newProjectId,
      billable: true,
      description: newTaskDesc.trim() || undefined,
    });
    setAddRowOpen(false);
    setNewProjectId(undefined);
    setNewTaskDesc('');
  };

  const handleDownloadMonthlyClick = () => {
    if (isManagerOrAdmin) {
      setDownloadUserId(String(user?.userId ?? ''));
      setDownloadModalOpen(true);
    } else {
      doDownloadMonthly(user?.userId);
    }
  };

  const doDownloadMonthly = async (targetUserId?: number) => {
    setIsExporting(true);
    try {
      const yr = currentWeekStart.getFullYear();
      const mo = currentWeekStart.getMonth() + 1; // 1-based
      await reportsService.exportMonthlyTimesheet(targetUserId ?? user!.userId, yr, mo);
      toast('Monthly timesheet downloaded', 'success');
      setDownloadModalOpen(false);
    } catch {
      toast('Failed to download monthly timesheet', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleHoursChange = async (entry: TimeEntry, day: typeof DAY_KEYS[number], value: string) => {
    const hours = parseHours(value);
    await updateEntry.mutateAsync({
      entryId: entry.id,
      dto: { [day]: hours },
    });
  };

  const handleDescriptionChange = async (entry: TimeEntry, value: string) => {
    await updateEntry.mutateAsync({
      entryId: entry.id,
      dto: { description: value },
    });
  };

  const handleToggleBillable = async (entry: TimeEntry, checked: boolean) => {
    await updateEntry.mutateAsync({
      entryId: entry.id,
      dto: { billable: checked },
    });
  };

  const canEdit = !timesheet || timesheet.status === 'DRAFT' || timesheet.status === 'REJECTED';
  const entries = timesheet?.timeEntries ?? [];
  const totalHours = timesheet?.totalHours ?? 0;
  const billableHours = timesheet?.billableHours ?? 0;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Week Navigator */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCurrentWeekStart(prevWeek(currentWeekStart)); setTimesheetId(undefined); setSearchParams({}); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"
            >
              ‹
            </button>
            <span className="font-mono text-sm font-medium text-gray-700 min-w-48 text-center">
              Week of {formatDateRange(currentWeekStart, weekEnd)}
            </span>
            <button
              onClick={() => { setCurrentWeekStart(nextWeek(currentWeekStart)); setTimesheetId(undefined); setSearchParams({}); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"
            >
              ›
            </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {timesheet && <Badge variant={STATUS_VARIANT[timesheet.status]}>{timesheet.status.charAt(0) + timesheet.status.slice(1).toLowerCase()}</Badge>}
            <Button variant="ghost" size="sm" onClick={handleDownloadMonthlyClick} isLoading={isExporting}>
              Download Monthly
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopyPrevWeek} disabled={!canEdit || copyPrevWeek.isPending}>
              Copy Previous Week
            </Button>
            {canEdit && timesheetId && (
              <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={submitTimesheet.isPending}>
                Submit for Approval
              </Button>
            )}
          </div>
        </div>

        {/* Summary Bar */}
        {timesheet && (
          <div className="bg-gradient-to-r from-brand-primary to-brand-primary-dk rounded-xl p-5 text-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Total Hours</p>
                <p className="text-2xl font-bold font-mono mt-1">{formatHours(totalHours)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Billable</p>
                <p className="text-2xl font-bold font-mono mt-1">{formatHours(billableHours)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Non-Billable</p>
                <p className="text-2xl font-bold font-mono mt-1">{formatHours(totalHours - billableHours)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Status</p>
                <p className="text-sm font-medium mt-2 capitalize">{timesheet.status.toLowerCase()}</p>
              </div>
            </div>
            {timesheet.rejectedReason && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs text-white/60">Rejection reason:</p>
                <p className="text-sm text-white/80 mt-0.5">{timesheet.rejectedReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Timesheet Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !timesheetId ? (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-600 font-medium">No timesheet for this week</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              {formatDateRange(currentWeekStart, weekEnd)}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={handleCreateForWeek} isLoading={createTimesheet.isPending}>
                Create Timesheet
              </Button>
              <Button variant="outline-primary" onClick={handleCopyPrevWeek} isLoading={copyPrevWeek.isPending}>
                Copy Previous Week
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-64">Project / Task</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 w-16">Bill?</th>
                    {dayLabels.map((d, i) => (
                      <th
                        key={d.label}
                        className={`text-center px-2 py-3 font-medium w-16 ${
                          holidayFlags[i]?.isHoliday
                            ? 'bg-amber-50 text-brand-accent'
                            : 'text-gray-600'
                        }`}
                        title={holidayFlags[i]?.name}
                      >
                        <div>{d.label}</div>
                        <div className={`text-xs font-normal ${holidayFlags[i]?.isHoliday ? 'text-brand-accent/70' : 'text-gray-400'}`}>
                          {d.date}
                        </div>
                        {holidayFlags[i]?.isHoliday && (
                          <div className="text-[9px] text-brand-accent/80 font-normal truncate max-w-16" title={holidayFlags[i].name}>
                            {holidayFlags[i].name}
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium text-gray-600 w-16">Total</th>
                    {canEdit && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map((entry) => (
                    <TimeEntryRow
                      key={entry.id}
                      entry={entry}
                      canEdit={canEdit}
                      holidayFlags={holidayFlags}
                      onHoursChange={handleHoursChange}
                      onDescriptionChange={handleDescriptionChange}
                      onBillableChange={handleToggleBillable}
                      onDelete={() => deleteEntry.mutate(entry.id)}
                    />
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">
                        No entries yet. Add a project row to start tracking time.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <div className="px-4 py-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => setAddRowOpen(true)}>
                  + Add Row
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Row Modal */}
      <Modal
        isOpen={addRowOpen}
        onClose={() => { setAddRowOpen(false); setNewTaskDesc(''); }}
        title="Add Project Row"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Project *"
            value={newProjectId ?? ''}
            onChange={(e) => setNewProjectId(Number(e.target.value))}
            options={[
              { value: '', label: 'Select a project...' },
              ...projects.filter((p) => p.status === 'active').map((p) => ({
                value: p.id,
                label: `${p.code} — ${p.name}`,
              })),
            ]}
          />
          <Input
            label="Task / Description"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            placeholder="e.g., Sprint planning, Bug fixes, Code review..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setAddRowOpen(false); setNewTaskDesc(''); }}>Cancel</Button>
            <Button
              onClick={handleAddRow}
              disabled={!newProjectId}
              isLoading={addEntry.isPending}
            >
              Add Row
            </Button>
          </div>
        </div>
      </Modal>

      {/* Download Monthly Modal (Manager/Admin) */}
      <Modal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        title="Download Monthly Timesheet"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Download timesheet for <span className="font-medium text-gray-700">{format(currentWeekStart, 'MMMM yyyy')}</span>
          </p>
          <Select
            label="Employee"
            value={downloadUserId}
            onChange={(e) => setDownloadUserId(e.target.value)}
            options={[
              { value: String(user?.userId ?? ''), label: `${user?.name ?? 'Me'} (Myself)` },
              ...teamMembers
                .filter((m) => m.id !== user?.userId)
                .map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDownloadModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => doDownloadMonthly(downloadUserId ? parseInt(downloadUserId) : undefined)}
              isLoading={isExporting}
            >
              Download Excel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Overwrite Modal */}
      <Modal
        isOpen={confirmOverwriteOpen}
        onClose={() => setConfirmOverwriteOpen(false)}
        title="Overwrite existing timesheet?"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          A draft timesheet already exists for this week. Copying will replace all its
          current entries with the rows from your previous week. Hours will not be copied.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmOverwriteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmOverwrite} isLoading={copyPrevWeek.isPending}>
            Yes, overwrite
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}

function TimeEntryRow({
  entry,
  canEdit,
  holidayFlags,
  onHoursChange,
  onDescriptionChange,
  onBillableChange,
  onDelete,
}: {
  entry: TimeEntry;
  canEdit: boolean;
  holidayFlags: { isHoliday: boolean; name?: string }[];
  onHoursChange: (entry: TimeEntry, day: typeof DAY_KEYS[number], value: string) => Promise<void>;
  onDescriptionChange: (entry: TimeEntry, value: string) => Promise<void>;
  onBillableChange: (entry: TimeEntry, checked: boolean) => Promise<void>;
  onDelete: () => void;
}) {
  const [localHours, setLocalHours] = useState<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    DAY_KEYS.forEach((k) => { h[k] = entry[k] > 0 ? String(entry[k]) : ''; });
    return h;
  });
  const [localDesc, setLocalDesc] = useState(entry.description ?? '');

  const rowTotal = DAY_KEYS.reduce((sum, k) => sum + (parseFloat(localHours[k] || '0') || 0), 0);

  // Detect if this is a "Leave" or "Holiday" type project (by name/code convention)
  const projectName = (entry.project?.name ?? '').toLowerCase();
  const projectCode = (entry.project?.code ?? '').toLowerCase();
  const isLeaveRow = projectName.includes('leave') || projectName.includes('holiday')
    || projectCode.includes('leave') || projectCode.includes('holiday');

  return (
    <tr className={isLeaveRow ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-gray-50/50'}>
      <td className="px-4 py-3">
        <div>
          <p className={`text-sm font-medium leading-tight ${isLeaveRow ? 'text-brand-accent' : 'text-gray-800'}`}>
            {entry.project?.name ?? '—'}
          </p>
          <p className={`text-xs font-mono mt-0.5 ${isLeaveRow ? 'text-brand-accent/60' : 'text-gray-400'}`}>
            {entry.project?.code}
          </p>
        </div>
        <textarea
          readOnly={!canEdit}
          value={localDesc}
          onChange={(e) => setLocalDesc(e.target.value)}
          onBlur={() => {
            if (localDesc !== (entry.description ?? '')) {
              onDescriptionChange(entry, localDesc);
            }
          }}
          placeholder="Task details..."
          rows={1}
          className={`w-full text-xs resize-none border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-primary/30 rounded p-1 mt-1 ${
            isLeaveRow ? 'text-brand-accent/80 placeholder:text-brand-accent/40' : 'text-gray-600 placeholder:text-gray-300'
          }`}
        />
      </td>
      <td className="px-3 py-3 text-center">
        <Toggle
          checked={entry.billable}
          disabled={!canEdit}
          onChange={(e) => onBillableChange(entry, e.target.checked)}
        />
      </td>
      {DAY_KEYS.map((day, i) => (
        <td
          key={day}
          className={`px-2 py-3 text-center ${holidayFlags[i]?.isHoliday ? 'bg-amber-50' : ''}`}
        >
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            readOnly={!canEdit}
            value={localHours[day]}
            onChange={(e) => setLocalHours((prev) => ({ ...prev, [day]: e.target.value }))}
            onBlur={(e) => onHoursChange(entry, day, e.target.value)}
            placeholder="0"
            className={`w-14 text-center font-mono text-xs border rounded px-1 py-1.5 focus:outline-none focus:border-brand-primary
              ${holidayFlags[i]?.isHoliday
                ? 'border-amber-300 bg-amber-50 text-brand-accent'
                : parseFloat(localHours[day] || '0') > 0
                  ? 'border-brand-primary/40 bg-brand-primary/5 text-brand-primary font-medium'
                  : 'border-gray-200 text-gray-400'
              }
              ${!canEdit ? 'bg-gray-50 cursor-default' : ''}
            `}
          />
        </td>
      ))}
      <td className="px-3 py-3 text-center">
        <span className={`font-mono text-sm font-semibold ${isLeaveRow ? 'text-brand-accent' : 'text-gray-800'}`}>
          {formatHours(rowTotal)}
        </span>
      </td>
      {canEdit && (
        <td className="px-2 py-3 text-center">
          <button onClick={onDelete} className="text-gray-300 hover:text-brand-danger text-sm">✕</button>
        </td>
      )}
    </tr>
  );
}
