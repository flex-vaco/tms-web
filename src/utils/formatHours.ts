export function formatHours(hours: number, format: 'decimal' | 'hhmm' = 'decimal'): string {
  if (format === 'hhmm') {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return hours.toFixed(2);
}

export function parseHours(value: string): number {
  const trimmed = value.trim();
  if (trimmed.includes(':')) {
    const [h, m] = trimmed.split(':').map(Number);
    return h + (m || 0) / 60;
  }
  return parseFloat(trimmed) || 0;
}
