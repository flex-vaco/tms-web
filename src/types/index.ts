export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  organisationId: number;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  managers?: { manager: { id: number; name: string } }[];
}

export interface Organisation {
  id: number;
  name: string;
}

export interface AuthUser {
  userId: number;
  orgId: number;
  role: UserRole;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  organisationId: number;
  code: string;
  name: string;
  client: string;
  budgetHours: number;
  usedHours: number;
  status: string;
  managers?: { manager: { id: number; name: string } }[];
}

export interface TimeEntry {
  id: number;
  timesheetId: number;
  projectId: number;
  description?: string;
  billable: boolean;
  monHours: number;
  tueHours: number;
  wedHours: number;
  thuHours: number;
  friHours: number;
  satHours: number;
  sunHours: number;
  totalHours: number;
  project?: Project;
}

export interface Timesheet {
  id: number;
  organisationId: number;
  userId: number;
  weekStartDate: string;
  weekEndDate: string;
  status: TimesheetStatus;
  totalHours: number;
  billableHours: number;
  approvedById?: number;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  timeEntries?: TimeEntry[];
}

export interface Holiday {
  id: number;
  organisationId: number;
  name: string;
  date: string;
  recurring: boolean;
}

export interface OrgSettings {
  id: number;
  organisationId: number;
  workWeekStart: string;
  standardHours: number;
  timeFormat: string;
  timeIncrement: number;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  requireApproval: boolean;
  allowBackdated: boolean;
  enableOvertime: boolean;
  mandatoryDesc: boolean;
  allowCopyWeek: boolean;
  dailyReminderTime?: string;
  weeklyDeadline?: string;
  payrollType?: string;
  pmType?: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ApprovalStats {
  pendingCount: number;
  approvedThisWeek: number;
  teamHours: number;
  teamMembers: number;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  userId?: number;
  status?: TimesheetStatus;
  projectId?: number;
}

export interface ReportData {
  timesheets: Timesheet[];
  totalHours: number;
  billableHours: number;
  utilizationPct: number;
  revenue: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiPaginated<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}
