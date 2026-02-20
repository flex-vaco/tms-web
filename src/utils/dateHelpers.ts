import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  parseISO,
  isSameWeek,
} from 'date-fns';

export function getWeekStart(date: Date = new Date(), weekStartsOn: 0 | 1 = 1): Date {
  return startOfWeek(date, { weekStartsOn });
}

export function getWeekEnd(date: Date = new Date(), weekStartsOn: 0 | 1 = 1): Date {
  return endOfWeek(date, { weekStartsOn });
}

export function nextWeek(date: Date): Date {
  return addWeeks(date, 1);
}

export function prevWeek(date: Date): Date {
  return subWeeks(date, 1);
}

export function formatDateRange(start: Date, end: Date): string {
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function formatISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function isCurrentWeek(date: Date | string, weekStartsOn: 0 | 1 = 1): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isSameWeek(d, new Date(), { weekStartsOn });
}

export function getDayLabels(weekStart: Date): Array<{ label: string; date: string }> {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return { label, date: format(d, 'M/d') };
  });
}
