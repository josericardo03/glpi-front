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

export const formatNumber = (n: number) => numberFmt.format(n);
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatPercent = (n: number, digits = 1) => `${n.toFixed(digits).replace('.', ',')}%`;

/** Converte minutos em "3h 45m" / "42m" / "2d 4h". */
export function formatMinutes(total: number) {
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(Math.round(total));
  const d = Math.floor(abs / 1440);
  const h = Math.floor((abs % 1440) / 60);
  const m = abs % 60;
  if (d) return `${sign}${d}d ${h}h`;
  if (h) return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
  return `${sign}${m}m`;
}

export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
