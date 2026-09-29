import { api } from '@/lib/api';
import { request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { DashboardResumo, Prioridade, RelatorioTma, StatusChamado } from '@/types';

export type Periodo = '30d' | 'trimestre' | 'ano';

function resumoMock(): DashboardResumo {
  const cs = db.chamados;
  const abertos = cs.filter((c) => c.status !== 'RESOLVIDO' && c.status !== 'CONCLUIDO');
  const porStatus = { NOVO: 0, EM_ATENDIMENTO: 0, PENDENTE: 0, RESOLVIDO: 0, CONCLUIDO: 0 } as Record<StatusChamado, number>;
  const porPrioridade = { CRITICA: 0, ALTA: 0, MEDIA: 0, BAIXA: 0 } as Record<Prioridade, number>;
  cs.forEach((c) => {
    porStatus[c.status]++;
    porPrioridade[c.prioridade]++;
  });
  const catCount = new Map<string, number>();
  cs.forEach((c) => {
    const raiz = c.categoriaNome.split(' / ')[0]!;
    catCount.set(raiz, (catCount.get(raiz) ?? 0) + 1);
  });

  return {
    kpis: {
      abertos: abertos.length,
      atribuidosAMim: abertos.filter((c) => c.tecnicoId === 1).length,
      doMeuGrupo: abertos.filter((c) => c.grupoId === 1 || c.grupoId === 2).length,
      pendentes: porStatus.PENDENTE,
      slaCritico: abertos.filter((c) => c.slaRestanteMin < 0).length,
      slaCumpridoPct: 94.2,
      slaVariacaoPct: 2.1,
      mttrMin: 225,
      mttrMetaMin: 210,
      mediaPorTecnico: 12.4,
      resolvidosHoje: 28,
      totalPeriodo: 1284,
      csat: 4.8,
    },
    porStatus,
    porPrioridade,
    volumeDiario: [
      { dia: 'Seg', abertos: 42, atendimento: 18, fechados: 26 },
      { dia: 'Ter', abertos: 55, atendimento: 22, fechados: 30 },
      { dia: 'Qua', abertos: 68, atendimento: 30, fechados: 24 },
      { dia: 'Qui', abertos: 48, atendimento: 0, fechados: 0 },
      { dia: 'Sex', abertos: 40, atendimento: 16, fechados: 0 },
      { dia: 'Sáb', abertos: 16, atendimento: 10, fechados: 12 },
      { dia: 'Dom', abertos: 12, atendimento: 8, fechados: 10 },
    ],
    categoriasTop: [
      { nome: 'Rede & Conectividade', total: 248 },
      { nome: 'Acesso & Senhas', total: 192 },
      { nome: 'E-mail (Outlook/M365)', total: 156 },
      { nome: 'Hardware & Periféricos', total: 112 },
      { nome: 'Sistemas Internos (ERP)', total: 84 },
    ],
    ultimosChamados: [...cs]
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
      .slice(0, 6)
      .map(({ comentarios, worklogs, pausas, anexos, historico, ...c }) => c),
    tecnicos: [
      { id: 1, nome: 'Ricardo Andrade', nivel: 'Nível 3 - Infraestrutura', ativos: 12, resolvidosHoje: 8, slaPct: 98, carga: 72 },
      { id: 5, nome: 'Ana Paula Silva', nivel: 'Nível 2 - Suporte', ativos: 18, resolvidosHoje: 14, slaPct: 92, carga: 88 },
      { id: 10, nome: 'Jorge Santos', nivel: 'Nível 2 - Sistemas', ativos: 6, resolvidosHoje: 3, slaPct: 100, carga: 45 },
      { id: 3, nome: 'Carlos Mendes', nivel: 'Nível 1 - Suporte', ativos: 15, resolvidosHoje: 9, slaPct: 86, carga: 90 },
    ],
    infraestrutura: [
      { servico: 'VPN', up: true },
      { servico: 'Cloud', up: true },
      { servico: 'E-mail', up: true },
      { servico: 'ERP', up: true },
    ],
  };
}

function tmaMock(periodo: Periodo): RelatorioTma {
  const f = periodo === 'ano' ? 11.5 : periodo === 'trimestre' ? 3 : 1;
  return {
    totalFechados: Math.round(1284 * f),
    variacaoPct: 12.5,
    tmaMin: 42,
    tmaVariacaoPct: -4,
    csat: 4.8,
    analistas: [
      { id: 1, nome: 'Ricardo L.', departamento: 'N3 - Infraestrutura', fechados: Math.round(242 * f), tmaMin: 58, reaberturasPct: 4, slaPct: 98, eficienciaPct: 92, csat: 4.7, avaliacoes: 124 },
      { id: 2, nome: 'Ana Júlia S.', departamento: 'N1 - Service Desk', fechados: Math.round(218 * f), tmaMin: 14, reaberturasPct: 2, slaPct: 100, eficienciaPct: 97, csat: 4.9, avaliacoes: 98 },
      { id: 3, nome: 'Marcos V.', departamento: 'N2 - Suporte Local', fechados: Math.round(195 * f), tmaMin: 32, reaberturasPct: 7, slaPct: 92, eficienciaPct: 88, csat: 4.6, avaliacoes: 82 },
      { id: 4, nome: 'Beatriz O.', departamento: 'N2 - Aplicações', fechados: Math.round(160 * f), tmaMin: 45, reaberturasPct: 1, slaPct: 95, eficienciaPct: 94, csat: 4.5, avaliacoes: 75 },
      { id: 5, nome: 'Henrique M.', departamento: 'N1 - Service Desk', fechados: Math.round(142 * f), tmaMin: 21, reaberturasPct: 3, slaPct: 97, eficienciaPct: 91, csat: 4.4, avaliacoes: 60 },
    ],
  };
}

export const dashboardService = {
  resumo: (periodo: Periodo = '30d') =>
    request<DashboardResumo>(() => api.get('/dashboards/resumo', { params: { periodo } }), resumoMock),
  tma: (periodo: Periodo) => request<RelatorioTma>(() => api.get('/relatorios/tma', { params: { periodo } }), () => tmaMock(periodo)),
};
