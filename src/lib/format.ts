const numberFmt = new Intl.NumberFormat('pt-BR');
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const relativeFmt = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

const VAZIO = '—';

function toDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const formatNumber = (n: number) => (Number.isFinite(n) ? numberFmt.format(n) : VAZIO);

export function formatDateTime(iso: string | null | undefined) {
  const d = toDate(iso);
  return d ? dateTimeFmt.format(d) : VAZIO;
}

export function formatDate(iso: string | null | undefined) {
  const d = toDate(iso);
  return d ? dateFmt.format(d) : VAZIO;
}

/** `plural(1, 'chamado', 'chamados')` -> "1 chamado"; `plural(3, ...)` -> "3 chamados". */
export const plural = (n: number, um: string, varios: string) => `${formatNumber(n)} ${n === 1 ? um : varios}`;

export const formatPercent = (n: number, digits = 1) => (Number.isFinite(n) ? `${n.toFixed(digits).replace('.', ',')}%` : VAZIO);

/** Converte minutos em "3h 45m" / "42m" / "2d 4h". */
export function formatMinutes(total: number) {
  if (!Number.isFinite(total)) return VAZIO;
  if (total > 0 && total < 1) return '< 1m';
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(Math.round(total));
  const d = Math.floor(abs / 1440);
  const h = Math.floor((abs % 1440) / 60);
  const m = abs % 60;
  if (d) return `${sign}${d}d ${h}h`;
  if (h) return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
  return `${sign}${m}m`;
}

export function timeAgo(iso: string | null | undefined) {
  const d = toDate(iso);
  if (!d) return VAZIO;
  const diff = (d.getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return relativeFmt.format(Math.round(diff / secs), unit);
  }
  return 'agora mesmo';
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return VAZIO;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
