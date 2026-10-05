import { api } from '@/lib/api';
import { lookups, perfilAtualAtinge } from '@/lib/backend/lookups';
import type { ApiDashboardResumo, ApiIntegracao, ApiRelatorioTma, ApiUsuario } from '@/lib/backend/types';
import { data, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { DashboardResumo, Prioridade, RelatorioTma, StatusChamado } from '@/types';
import { toChamado } from '@/features/chamados/services/chamado.mapper';

export type Periodo = '7d' | '30d' | '90d';

export const PERIODO_DIAS: Record<Periodo, number> = { '7d': 7, '30d': 30, '90d': 90 };

const STATUS: StatusChamado[] = ['NOVO', 'EM_ATENDIMENTO', 'PENDENTE', 'RESOLVIDO', 'CONCLUIDO'];
const PRIORIDADES: Prioridade[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'];

const contagens = <K extends string>(chaves: K[], valores: Record<string, number>) =>
  Object.fromEntries(chaves.map((k) => [k, valores[k] ?? 0])) as Record<K, number>;

/** Dia `YYYY-MM-DD` no fuso da API (Cuiabá), que é a referência dos relatórios. */
const diaCuiaba = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Cuiaba' });

/** Últimos N dias, incluindo hoje. */
function intervalo(periodo: Periodo) {
  const ate = new Date();
  const de = new Date(ate.getTime() - (PERIODO_DIAS[periodo] - 1) * 86_400_000);
  return { de: diaCuiaba(de), ate: diaCuiaba(ate) };
}

const diaDaSemana = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

async function resumoReal(periodo: Periodo): Promise<DashboardResumo> {
  const [r, usuarios, integracoes] = await Promise.all([
    data(api.get<ApiDashboardResumo>('/dashboards/resumo', { params: { periodo } })),
    lookups.usuarios().catch(() => [] as ApiUsuario[]),
    perfilAtualAtinge('ADMIN') ? data(api.get<ApiIntegracao[]>('/integracoes')).catch(() => [] as ApiIntegracao[]) : ([] as ApiIntegracao[]),
  ]);
  const cargo = new Map(usuarios.map((u) => [u.id, u.cargo]));
  const maxAtivos = Math.max(1, ...r.tecnicos.map((t) => t.ativos));
  const k = r.kpis;
  return {
    kpis: {
      abertos: k.abertos,
      atribuidosAMim: k.atribuidos_a_mim,
      naoAtribuidos: k.nao_atribuidos,
      pendentes: k.pendentes,
      slaCritico: k.sla_critico,
      slaCumpridoPct: k.sla_cumprido_pct,
      slaVariacaoPct: k.sla_variacao_pct,
      mttrMin: k.mttr_min,
      mediaPorTecnico: k.media_por_tecnico,
      resolvidosHoje: k.resolvidos_hoje,
      totalPeriodo: k.total_periodo,
      csat: k.csat,
    },
    porStatus: contagens(STATUS, r.por_status),
    porPrioridade: contagens(PRIORIDADES, r.por_prioridade),
    volumeDiario: r.volume_diario.map((d) => ({ dia: diaDaSemana(d.dia), abertos: d.abertos, fechados: d.fechados })),
    categoriasTop: r.categorias_top,
    ultimosChamados: r.ultimos_chamados.map((c) => toChamado(c)),
    tecnicos: r.tecnicos.map((t) => ({
      id: t.id,
      nome: t.nome,
      nivel: cargo.get(t.id) ?? '',
      ativos: t.ativos,
      resolvidosHoje: t.resolvidos_hoje,
      slaPct: t.sla_pct,
      carga: Math.round((t.ativos / maxAtivos) * 100),
    })),
    infraestrutura: integracoes.map((i) => ({ servico: i.nome, up: i.status === 'ATIVO' })),
  };
}

async function tmaReal(periodo: Periodo): Promise<RelatorioTma> {
  const r = await data(api.get<ApiRelatorioTma>('/relatorios/tma', { params: intervalo(periodo) }));
  return {
    totalFechados: r.total_fechados,
    variacaoPct: r.variacao_pct,
    tmaMin: r.tma_min,
    tmaVariacaoPct: r.tma_variacao_pct,
    csat: r.csat,
    analistas: r.analistas.map((a) => ({
      id: a.id,
      nome: a.nome,
      departamento: a.departamento ?? '—',
      fechados: a.fechados,
      tmaMin: a.tma_min,
      reaberturasPct: a.reaberturas_pct,
      slaPct: a.sla_pct,
      eficienciaPct: null,
      csat: a.csat,
      avaliacoes: a.avaliacoes,
    })),
  };
}

function resumoMock(): DashboardResumo {
  const cs = db.chamados;
  const abertos = cs.filter((c) => c.status !== 'RESOLVIDO' && c.status !== 'CONCLUIDO');
  const porStatus = contagens(STATUS, {});
  const porPrioridade = contagens(PRIORIDADES, {});
  cs.forEach((c) => {
    porStatus[c.status]++;
    porPrioridade[c.prioridade]++;
  });

  return {
    kpis: {
      abertos: abertos.length,
      atribuidosAMim: abertos.filter((c) => c.tecnicoId === 1).length,
      naoAtribuidos: abertos.filter((c) => !c.tecnicoId).length,
      pendentes: porStatus.PENDENTE,
      slaCritico: abertos.filter((c) => c.slaRestanteMin !== null && c.slaRestanteMin < 240).length,
      slaCumpridoPct: 94.2,
      slaVariacaoPct: 2.1,
      mttrMin: 225,
      mediaPorTecnico: 12.4,
      resolvidosHoje: 28,
      totalPeriodo: 792,
      csat: 4.8,
    },
    porStatus,
    porPrioridade,
    volumeDiario: [
      { dia: 'seg', abertos: 42, fechados: 26 },
      { dia: 'ter', abertos: 55, fechados: 30 },
      { dia: 'qua', abertos: 68, fechados: 24 },
      { dia: 'qui', abertos: 48, fechados: 31 },
      { dia: 'sex', abertos: 40, fechados: 35 },
      { dia: 'sáb', abertos: 16, fechados: 12 },
      { dia: 'dom', abertos: 12, fechados: 10 },
    ],
    categoriasTop: [
      { nome: 'Rede & Conectividade', total: 248 },
      { nome: 'Acesso & Senhas', total: 192 },
      { nome: 'E-mail (Outlook/M365)', total: 156 },
      { nome: 'Hardware & Periféricos', total: 112 },
      { nome: 'Sistemas Internos (ERP)', total: 84 },
    ],
    ultimosChamados: [...cs]
      .sort((a, b) => b.abertoEm.localeCompare(a.abertoEm))
      .slice(0, 5)
      .map(({ comentarios, worklogs, pausas, anexos, historico, ...c }) => c),
    tecnicos: [
      { id: 1, nome: 'Ricardo Andrade', nivel: 'Nível 3 - Infraestrutura', ativos: 12, resolvidosHoje: 8, slaPct: 98, carga: 67 },
      { id: 5, nome: 'Ana Paula Silva', nivel: 'Nível 2 - Suporte', ativos: 18, resolvidosHoje: 14, slaPct: 92, carga: 100 },
      { id: 10, nome: 'Jorge Santos', nivel: 'Nível 2 - Sistemas', ativos: 6, resolvidosHoje: 3, slaPct: 100, carga: 33 },
      { id: 3, nome: 'Carlos Mendes', nivel: 'Nível 1 - Suporte', ativos: 15, resolvidosHoje: 9, slaPct: 86, carga: 83 },
    ],
    infraestrutura: [
      { servico: 'VPN', up: true },
      { servico: 'Cloud', up: true },
      { servico: 'E-mail', up: true },
      { servico: 'ERP', up: false },
    ],
  };
}

function tmaMock(periodo: Periodo): RelatorioTma {
  const f = PERIODO_DIAS[periodo] / 30;
  return {
    totalFechados: Math.round(957 * f),
    variacaoPct: 12.5,
    tmaMin: 42,
    tmaVariacaoPct: -4,
    csat: 4.8,
    analistas: [
      { id: 1, nome: 'Ricardo L.', departamento: 'N3 - Infraestrutura', fechados: Math.round(242 * f), tmaMin: 58, reaberturasPct: 4, slaPct: 98, eficienciaPct: null, csat: 4.7, avaliacoes: 124 },
      { id: 2, nome: 'Ana Júlia S.', departamento: 'N1 - Service Desk', fechados: Math.round(218 * f), tmaMin: 14, reaberturasPct: 2, slaPct: 100, eficienciaPct: null, csat: 4.9, avaliacoes: 98 },
      { id: 3, nome: 'Marcos V.', departamento: 'N2 - Suporte Local', fechados: Math.round(195 * f), tmaMin: 32, reaberturasPct: 7, slaPct: 92, eficienciaPct: null, csat: 4.6, avaliacoes: 82 },
      { id: 4, nome: 'Beatriz O.', departamento: 'N2 - Aplicações', fechados: Math.round(160 * f), tmaMin: 45, reaberturasPct: 1, slaPct: 95, eficienciaPct: null, csat: 4.5, avaliacoes: 75 },
      { id: 5, nome: 'Henrique M.', departamento: 'N1 - Service Desk', fechados: Math.round(142 * f), tmaMin: 21, reaberturasPct: 3, slaPct: 97, eficienciaPct: null, csat: 4.4, avaliacoes: 60 },
    ],
  };
}

/** Indicadores agregados pela API (`/dashboards/resumo` e `/relatorios/tma`). */
export const dashboardService = {
  resumo: (periodo: Periodo = '30d') => request<DashboardResumo>(() => resumoReal(periodo), resumoMock),
  tma: (periodo: Periodo) => request<RelatorioTma>(() => tmaReal(periodo), () => tmaMock(periodo)),
};
