export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Valores iniciados por = + - @ (ou tab/CR) seriam interpretados como fórmula pelo Excel. */
const FORMULA = /^[=+\-@\t\r]/;

function esc(v: unknown) {
  let s = String(v ?? '');
  if (typeof v === 'string' && FORMULA.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Gera e baixa um CSV (separador `;`, BOM UTF-8 para abrir corretamente no Excel pt-BR). */
export function exportCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const lines = [columns.map((c) => esc(c.header)).join(';'), ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(';'))];
  downloadBlob(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
}

/** Dispara o download de um Blob; a URL é revogada depois que o navegador inicia a transferência. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename, rel: 'noopener' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
