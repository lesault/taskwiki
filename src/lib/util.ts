// Small shared helpers used across views.

export function todayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatDateHuman(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function isOverdue(deadline: string | undefined, today: string): boolean {
  return !!deadline && deadline < today;
}

export function isDueToday(deadline: string | undefined, today: string): boolean {
  return deadline === today;
}
