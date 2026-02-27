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
const DAY_DESC_KEYS = ['monDesc', 'tueDesc', 'wedDesc', 'thuDesc', 'friDesc', 'satDesc', 'sunDesc'] as const;
type DayDescKey = typeof DAY_DESC_KEYS[number];
const STANDARD_HOURS = 8;

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

  // Add-entry modal state
  const [addEntryDayIndex, setAddEntryDayIndex] = useState<number | null>(null);
  const [addEntryProjectId, setAddEntryProjectId] = useState<number | undefined>();
  const [addEntryDesc, setAddEntryDesc] = useState('');
  const [addEntryHours, setAddEntryHours] = useState(String(STANDARD_HOURS));

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

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['download-team-members', isManagerOrAdmin, user?.role],
    queryFn: () => user?.role === 'ADMIN' ? usersService.list() : teamService.getMyReports(),
    enabled: isManagerOrAdmin,
  });

  const weekEnd = getWeekEnd(currentWeekStart);
  const dayLabels = getDayLabels(currentWeekStart);

  const holidayFlags = useMemo(
    () => getHolidayFlags(currentWeekStart, holidays),
    [currentWeekStart, holidays]
  );

  const { data: timesheet, isLoading } = useQuery({
    queryKey: ['timesheets', timesheetId],
    queryFn: () => timesheetsService.getById(timesheetId!),
    enabled: !!timesheetId,
  });

  const loadWeek = useCallback(async () => {
    const weekStartStr = formatISO(currentWeekStart);
    const existing = await timesheetsService.list(1, 50);
    const found = existing.data.find((t) => t.weekStartDate.startsWith(weekStartStr));
    if (found) {
      setTimesheetId(found.id);
      setSearchParams({ id: String(found.id) });
    } else {
      setTimesheetId(undefined);
      setSearchParams({});
    }
  }, [currentWeekStart, setSearchParams]);

  useEffect(() => {
    if (!searchParams.get('id')) loadWeek();
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
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        setConfirmOverwriteOpen(true);
      }
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
      toast('Cannot submit an empty timesheet. Add at least one entry.', 'warning');
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

  const closeAddEntry = () => {
    setAddEntryDayIndex(null);
    setAddEntryProjectId(undefined);
    setAddEntryDesc('');
    setAddEntryHours(String(STANDARD_HOURS));
  };

  const handleAddDayEntry = async () => {
    if (!timesheetId || addEntryDayIndex === null || !addEntryProjectId) return;
    const dayKey = DAY_KEYS[addEntryDayIndex];
    const dayDescKey = DAY_DESC_KEYS[addEntryDayIndex];
    const hours = parseHours(addEntryHours);

    // If an entry for this project already exists, update its hours for this day
    const existingEntry = entries.find((e) => e.projectId === addEntryProjectId);
    if (existingEntry) {
      await updateEntry.mutateAsync({
        entryId: existingEntry.id,
        dto: {
          [dayKey]: hours,
          ...(addEntryDesc ? { [dayDescKey]: addEntryDesc } : {}),
        },
      });
    } else {
      await addEntry.mutateAsync({
        projectId: addEntryProjectId,
        billable: true,
        [dayDescKey]: addEntryDesc || undefined,
        [dayKey]: hours,
      } as Partial<TimeEntry>);
    }
    closeAddEntry();
  };

  const handleDeleteDayEntry = async (entry: TimeEntry, dayIndex: number) => {
    const dayKey = DAY_KEYS[dayIndex];
    const otherDaysHaveHours = DAY_KEYS.some((k, i) => i !== dayIndex && (entry[k] as number) > 0);
    if (otherDaysHaveHours) {
      await updateEntry.mutateAsync({ entryId: entry.id, dto: { [dayKey]: 0 } });
    } else {
      deleteEntry.mutate(entry.id);
    }
  };

  const handleHoursChange = async (entry: TimeEntry, day: typeof DAY_KEYS[number], value: string) => {
    const hours = parseHours(value);
    await updateEntry.mutateAsync({ entryId: entry.id, dto: { [day]: hours } });
  };

  const handleDescriptionChange = async (entry: TimeEntry, dayDescKey: DayDescKey, value: string) => {
    await updateEntry.mutateAsync({ entryId: entry.id, dto: { [dayDescKey]: value } });
  };

  const handleToggleBillable = async (entry: TimeEntry, checked: boolean) => {
    await updateEntry.mutateAsync({ entryId: entry.id, dto: { billable: checked } });
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
      const mo = currentWeekStart.getMonth() + 1;
      await reportsService.exportMonthlyTimesheet(targetUserId ?? user!.userId, yr, mo);
      toast('Monthly timesheet downloaded', 'success');
      setDownloadModalOpen(false);
    } catch {
      toast('Failed to download monthly timesheet', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const canEdit = !timesheet || timesheet.status === 'DRAFT' || timesheet.status === 'REJECTED';
  const entries = timesheet?.timeEntries ?? [];
  const totalHours = timesheet?.totalHours ?? 0;
  const billableHours = timesheet?.billableHours ?? 0;

  // Group entries by day index (only those with hours > 0 on that day)
  const entriesByDay = useMemo(
    () => DAY_KEYS.map((key) => entries.filter((e) => (e[key] as number) > 0)),
    [entries]
  );

  // Day-level total hours
  const dayTotals = useMemo(
    () => DAY_KEYS.map((key, i) => entriesByDay[i].reduce((sum, e) => sum + (e[key] as number), 0)),
    [entriesByDay]
  );

  // Overtime = sum of max(0, dayTotal - standard) across all days
  const totalOvertime = useMemo(
    () => dayTotals.reduce((sum, h) => sum + Math.max(0, h - STANDARD_HOURS), 0),
    [dayTotals]
  );
  const totalRegularTime = Math.max(0, totalHours - totalOvertime);

  return (
    <Layout>
      <div className="space-y-5">
        {/* Week Navigator */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCurrentWeekStart(prevWeek(currentWeekStart)); setTimesheetId(undefined); setSearchParams({}); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"
            >‹</button>
            <span className="font-mono text-sm font-medium text-gray-700 min-w-48 text-center">
              Week of {formatDateRange(currentWeekStart, weekEnd)}
            </span>
            <button
              onClick={() => { setCurrentWeekStart(nextWeek(currentWeekStart)); setTimesheetId(undefined); setSearchParams({}); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"
            >›</button>
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
            <p className="text-gray-400 text-sm mt-1 mb-6">{formatDateRange(currentWeekStart, weekEnd)}</p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={handleCreateForWeek} isLoading={createTimesheet.isPending}>Create Timesheet</Button>
              <Button variant="outline-primary" onClick={handleCopyPrevWeek} isLoading={copyPrevWeek.isPending}>Copy Previous Week</Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 w-24 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-3 py-3 w-28 font-semibold text-gray-500 text-xs uppercase tracking-wide">Day</th>
                    <th className="text-left px-3 py-3 w-52 font-semibold text-gray-500 text-xs uppercase tracking-wide">Project / Activity</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Description</th>
                    <th className="text-center px-2 py-3 w-14 font-semibold text-gray-500 text-xs uppercase tracking-wide">Bill?</th>
                    <th className="text-center px-2 py-3 w-20 font-semibold text-gray-500 text-xs uppercase tracking-wide">Time</th>
                    <th className="text-center px-2 py-3 w-20 font-semibold text-gray-500 text-xs uppercase tracking-wide">O/T</th>
                    <th className="text-center px-2 py-3 w-20 font-semibold text-gray-500 text-xs uppercase tracking-wide">Total</th>
                    {canEdit && <th className="w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {dayLabels.flatMap((dayLabel, dayIndex) => {
                    const dayKey = DAY_KEYS[dayIndex];
                    const isWeekend = dayIndex >= 5;
                    const holiday = holidayFlags[dayIndex];
                    const dayEnts = entriesByDay[dayIndex];
                    const dayTotal = dayTotals[dayIndex];
                    const dayOT = Math.max(0, dayTotal - STANDARD_HOURS);

                    const rowBgClass = holiday?.isHoliday
                      ? 'bg-amber-50'
                      : isWeekend
                        ? 'bg-yellow-50/60'
                        : '';

                    // Empty day row
                    if (dayEnts.length === 0) {
                      return [(
                        <tr
                          key={`day-${dayIndex}-empty`}
                          className={`border-b border-gray-100 ${rowBgClass}`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-gray-400">{dayLabel.date}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-sm font-medium ${
                              holiday?.isHoliday ? 'text-brand-accent' : isWeekend ? 'text-amber-600' : 'text-gray-700'
                            }`}>{dayLabel.label}</span>
                            {holiday?.isHoliday && (
                              <div className="text-xs text-brand-accent/70 font-normal mt-0.5">{holiday.name}</div>
                            )}
                          </td>
                          <td className="px-3 py-3" colSpan={2}>
                            {canEdit && !isWeekend && !holiday?.isHoliday ? (
                              <button
                                onClick={() => setAddEntryDayIndex(dayIndex)}
                                className="text-brand-primary/40 hover:text-brand-primary text-xs font-medium transition-colors"
                              >
                                + Add entry
                              </button>
                            ) : (
                              <span className={`text-xs italic ${
                                isWeekend ? 'text-amber-400/80' : holiday?.isHoliday ? 'text-brand-accent/60' : 'text-gray-300'
                              }`}>
                                {isWeekend ? 'Weekend' : holiday?.isHoliday ? holiday.name : '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3" />
                          <td className="px-2 py-3 text-center font-mono text-xs text-gray-300">0</td>
                          <td className="px-2 py-3 text-center font-mono text-xs text-gray-300">0</td>
                          <td className="px-2 py-3 text-center font-mono text-xs text-gray-300">0</td>
                          {canEdit && <td />}
                        </tr>
                      )];
                    }

                    // Day has entries — one row per entry
                    return dayEnts.map((entry, rowIdx) => {
                      const isFirst = rowIdx === 0;
                      const isLast = rowIdx === dayEnts.length - 1;
                      const isLeave = (entry.project?.name ?? '').toLowerCase().includes('leave');
                      const entryRowBg = isLeave ? 'bg-green-50/60' : rowBgClass;

                      const dayDescKey = DAY_DESC_KEYS[dayIndex];
                      return (
                        <DayEntryRow
                          key={`day-${dayIndex}-entry-${entry.id}`}
                          entry={entry}
                          dayKey={dayKey}
                          dayDescKey={dayDescKey}
                          dayLabel={dayLabel}
                          showDateDay={isFirst}
                          isLastInDay={isLast}
                          dayTotal={dayTotal}
                          dayOT={dayOT}
                          rowBgClass={entryRowBg}
                          canEdit={canEdit}
                          holiday={holiday}
                          isWeekend={isWeekend}
                          isLeave={isLeave}
                          onAddEntry={() => setAddEntryDayIndex(dayIndex)}
                          onHoursChange={handleHoursChange}
                          onDescriptionChange={(e, v) => handleDescriptionChange(e, dayDescKey, v)}
                          onBillableChange={handleToggleBillable}
                          onDelete={() => handleDeleteDayEntry(entry, dayIndex)}
                        />
                      );
                    });
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={5} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Total Working Hours
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono text-sm font-bold text-gray-800">{formatHours(totalRegularTime)}</span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className={`font-mono text-sm font-bold ${totalOvertime > 0 ? 'text-brand-accent' : 'text-gray-400'}`}>
                        {formatHours(totalOvertime)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono text-sm font-bold text-brand-primary">{formatHours(totalHours)}</span>
                    </td>
                    {canEdit && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      <Modal
        isOpen={addEntryDayIndex !== null}
        onClose={closeAddEntry}
        title={
          addEntryDayIndex !== null
            ? `Add Entry — ${dayLabels[addEntryDayIndex]?.label}, ${dayLabels[addEntryDayIndex]?.date}`
            : 'Add Entry'
        }
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Project *"
            value={addEntryProjectId ?? ''}
            onChange={(e) => setAddEntryProjectId(Number(e.target.value))}
            options={[
              { value: '', label: 'Select a project...' },
              ...projects.filter((p) => p.status === 'active').map((p) => ({
                value: p.id,
                label: `${p.code} — ${p.name}`,
              })),
            ]}
          />
          <Input
            label="Description"
            value={addEntryDesc}
            onChange={(e) => setAddEntryDesc(e.target.value)}
            placeholder="e.g., Worked on security alerts, Sprint planning..."
          />
          <Input
            label="Hours"
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={addEntryHours}
            onChange={(e) => setAddEntryHours(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeAddEntry}>Cancel</Button>
            <Button
              onClick={handleAddDayEntry}
              disabled={!addEntryProjectId}
              isLoading={addEntry.isPending || updateEntry.isPending}
            >
              Add Entry
            </Button>
          </div>
        </div>
      </Modal>

      {/* Download Monthly Modal */}
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
          <Button variant="ghost" onClick={() => setConfirmOverwriteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirmOverwrite} isLoading={copyPrevWeek.isPending}>
            Yes, overwrite
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}

// ─── DayEntryRow ──────────────────────────────────────────────────────────────

function DayEntryRow({
  entry,
  dayKey,
  dayDescKey,
  dayLabel,
  showDateDay,
  isLastInDay,
  dayTotal,
  dayOT,
  rowBgClass,
  canEdit,
  holiday,
  isWeekend,
  isLeave,
  onAddEntry,
  onHoursChange,
  onDescriptionChange,
  onBillableChange,
  onDelete,
}: {
  entry: TimeEntry;
  dayKey: typeof DAY_KEYS[number];
  dayDescKey: DayDescKey;
  dayLabel: { label: string; date: string };
  showDateDay: boolean;
  isLastInDay: boolean;
  dayTotal: number;
  dayOT: number;
  rowBgClass: string;
  canEdit: boolean;
  holiday: { isHoliday: boolean; name?: string };
  isWeekend: boolean;
  isLeave: boolean;
  onAddEntry: () => void;
  onHoursChange: (entry: TimeEntry, day: typeof DAY_KEYS[number], value: string) => Promise<void>;
  onDescriptionChange: (entry: TimeEntry, value: string) => Promise<void>;
  onBillableChange: (entry: TimeEntry, checked: boolean) => Promise<void>;
  onDelete: () => void;
}) {
  const currentHours = entry[dayKey] as number;
  const currentDesc = (entry[dayDescKey] as string | undefined) ?? '';
  const [localHours, setLocalHours] = useState(currentHours > 0 ? String(currentHours) : '');
  const [localDesc, setLocalDesc] = useState(currentDesc);

  useEffect(() => {
    setLocalHours(currentHours > 0 ? String(currentHours) : '');
  }, [currentHours]);

  useEffect(() => {
    setLocalDesc(currentDesc);
  }, [currentDesc]); // eslint-disable-line react-hooks/exhaustive-deps

  const entryHours = parseFloat(localHours || '0') || 0;
  // Per-entry O/T (for display on the row itself; day-level OT shown only on last row)
  const entryOT = isLastInDay ? dayOT : 0;
  const entryTotal = isLastInDay ? dayTotal : entryHours;

  const dayLabelColor = holiday?.isHoliday ? 'text-brand-accent' : isWeekend ? 'text-amber-600' : 'text-gray-700';
  const projectColor = isLeave ? 'text-green-700' : 'text-gray-800';
  const codeColor = isLeave ? 'text-green-600/70' : 'text-gray-400';

  return (
    <tr className={`border-b border-gray-100 ${rowBgClass} hover:brightness-[0.985] transition-all`}>
      {/* Date */}
      <td className="px-4 py-2.5">
        {showDateDay && (
          <span className="font-mono text-xs text-gray-400">{dayLabel.date}</span>
        )}
      </td>

      {/* Day */}
      <td className="px-3 py-2.5">
        {showDateDay && (
          <div>
            <span className={`text-sm font-medium ${dayLabelColor}`}>{dayLabel.label}</span>
            {holiday?.isHoliday && (
              <div className="text-xs text-brand-accent/70 mt-0.5">{holiday.name}</div>
            )}
          </div>
        )}
      </td>

      {/* Project / Activity */}
      <td className="px-3 py-2.5">
        <p className={`text-sm font-medium leading-tight ${projectColor}`}>
          {entry.project?.name ?? '—'}
        </p>
        <p className={`text-xs font-mono mt-0.5 ${codeColor}`}>
          {entry.project?.code}
        </p>
      </td>

      {/* Description */}
      <td className="px-3 py-2.5">
        <textarea
          readOnly={!canEdit}
          value={localDesc}
          onChange={(e) => setLocalDesc(e.target.value)}
          onBlur={() => {
            if (localDesc !== (entry.description ?? '')) {
              onDescriptionChange(entry, localDesc);
            }
          }}
          placeholder="Describe your work..."
          rows={1}
          className={`w-full text-xs resize-none border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-primary/30 rounded p-1 ${
            isLeave ? 'text-green-700/80 placeholder:text-green-500/40' : 'text-gray-600 placeholder:text-gray-300'
          } ${!canEdit ? 'cursor-default' : ''}`}
        />
      </td>

      {/* Billable */}
      <td className="px-2 py-2.5 text-center">
        <Toggle
          checked={entry.billable}
          disabled={!canEdit}
          onChange={(e) => onBillableChange(entry, e.target.checked)}
        />
      </td>

      {/* Time */}
      <td className="px-2 py-2.5 text-center">
        <input
          type="number"
          min="0"
          max="24"
          step="0.5"
          readOnly={!canEdit}
          value={localHours}
          onChange={(e) => setLocalHours(e.target.value)}
          onBlur={(e) => onHoursChange(entry, dayKey, e.target.value)}
          placeholder="0"
          className={`w-16 text-center font-mono text-sm border rounded px-1 py-1.5 focus:outline-none focus:border-brand-primary transition-colors
            ${entryHours > 0
              ? 'border-brand-primary/40 bg-brand-primary/5 text-brand-primary font-semibold'
              : 'border-gray-200 text-gray-400'
            }
            ${!canEdit ? 'bg-gray-50 cursor-default' : ''}
          `}
        />
      </td>

      {/* Overtime */}
      <td className="px-2 py-2.5 text-center">
        {isLastInDay && entryOT > 0 ? (
          <span className="font-mono text-sm font-semibold text-brand-accent">{formatHours(entryOT)}</span>
        ) : (
          <span className="font-mono text-xs text-gray-300">0</span>
        )}
      </td>

      {/* Total */}
      <td className="px-2 py-2.5 text-center">
        <span className={`font-mono text-sm font-semibold ${
          isLeave ? 'text-green-700' : isLastInDay && dayTotal > 0 ? 'text-gray-800' : 'text-gray-500'
        }`}>
          {formatHours(entryTotal)}
        </span>
      </td>

      {/* Actions */}
      {canEdit && (
        <td className="px-2 py-2.5">
          <div className="flex items-center justify-center gap-1.5">
            {isLastInDay && !isWeekend && !holiday?.isHoliday && (
              <button
                onClick={onAddEntry}
                title="Add another entry for this day"
                className="text-brand-primary/30 hover:text-brand-primary text-base leading-none transition-colors"
              >
                +
              </button>
            )}
            <button
              onClick={onDelete}
              title="Remove this entry"
              className="text-gray-300 hover:text-brand-danger text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
