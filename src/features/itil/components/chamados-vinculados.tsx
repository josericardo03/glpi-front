import Link from 'next/link';
import { Ticket } from 'lucide-react';
import type { StatusChamado, VinculoItil } from '@/types';
import { StatusBadge } from '@/features/chamados/components/chamado-badges';

export function ChamadosVinculados({ chamados }: { chamados: VinculoItil[] }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Chamados vinculados ({chamados.length})</h3>
      {chamados.length ? (
        <ul className="divide-y divide-brand-border rounded-md border border-brand-border">
          {chamados.map((c) => (
            <li key={c.id}>
              <Link href={`/chamados/${c.id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                <Ticket className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                <span className="font-semibold text-brand-primary">#{c.id}</span>
                <span className="min-w-0 flex-1 truncate text-brand-darker">{c.titulo}</span>
                <StatusBadge status={c.status as StatusChamado} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-brand-muted">Nenhum chamado vinculado.</p>
      )}
    </section>
  );
}
