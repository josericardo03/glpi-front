import { api } from '@/lib/api';
import { byId, currentUserId, lookups, perfilAtualAtinge } from '@/lib/backend/lookups';
import type { ApiChamado, ApiIntegracao } from '@/lib/backend/types';
import { PERFIL_RANK } from '@/lib/backend/usuario.mapper';
import { data, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { DashboardResumo, Prioridade, RelatorioTma, StatusChamado } from '@/types';
import { chamadosApi, loadCtx, toChamado } from '@/features/chamados/services/chamado.mapper';

export type Periodo = '30d' | 'trimestre' | 'ano';

const DIA_MS = 86_400_000;
const PERIODO_DIAS: Record<Periodo, number> = { '30d': 30, trimestre: 90, ano: 365 };
const ts = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);
const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 1000) / 10 : null);
const media = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const variacao = (atual: number | null, anterior: number | null) =>
  atual !== null && anterior ? Math.round(((atual - anterior) / anterior) * 1000) / 10 : null;
const finalizado = (c: ApiChamado) => c.status === 'RESOLVIDO' || c.status === 'CONCLUIDO';
const dentroSla = (c: ApiChamado) => !c.sla_vencido && (!c.data_previsao_resolucao || ts(c.data_resolucao) <= ts(c.data_previsao_resolucao));
/** Minutos úteis de atendimento (descontando pausas de SLA). */
const duracaoMin = (c: ApiChamado) => Math.max(0, (ts(c.data_resolucao) - ts(c.data_abertura)) / 60_000 - c.tempo_acumulado_pausa_s / 60);

function resolvidosEntre(rows: ApiChamado[], de: number, ate: number) {
  return rows.filter((c) => {
    const t = ts(c.data_resolucao);
    return t >= de && t < ate;
  });
}

async function resumoReal(periodo: Periodo): Promise<DashboardResumo> {
  const [rows, ctx, integracoes] = await Promise.all([
    chamadosApi(),
    loadCtx(),
    perfilAtualAtinge('ADMIN') ? data(api.get<ApiIntegracao[]>('/integracoes')).catch(() => [] as ApiIntegracao[]) : ([] as ApiIntegracao[]),
  ]);
  const chamados = rows.map((r) => toChamado(r, ctx));
  const eu = currentUserId();
  const agora = Date.now();
  const janela = PERIODO_DIAS[periodo] * DIA_MS;
  const hoje = new Date().setHours(0, 0, 0, 0);

  const abertos = chamados.filter((c) => c.status !== 'RESOLVIDO' && c.status !== 'CONCLUIDO');
  const porStatus = { NOVO: 0, EM_ATENDIMENTO: 0, PENDENTE: 0, RESOLVIDO: 0, CONCLUIDO: 0 } as Record<StatusChamado, number>;
  const porPrioridade = { CRITICA: 0, ALTA: 0, MEDIA: 0, BAIXA: 0 } as Record<Prioridade, number>;
  chamados.forEach((c) => {
    porStatus[c.status]++;
    porPrioridade[c.prioridade]++;
  });

  const doPeriodo = chamados.filter((c) => ts(c.abertoEm) >= agora - janela);
  const categorias = new Map<string, number>();
  doPeriodo.forEach((c) => {
    const raiz = c.categoriaNome.split(' / ')[0]!;
    categorias.set(raiz, (categorias.get(raiz) ?? 0) + 1);
  });

  const resolvidos = resolvidosEntre(rows, agora - janela, agora);
  const anteriores = resolvidosEntre(rows, agora - 2 * janela, agora - janela);
  const slaAtual = pct(resolvidos.filter(dentroSla).length, resolvidos.length);
  const slaAnterior = pct(anteriores.filter(dentroSla).length, anteriores.length);
  const metas = resolvidos.filter((c) => c.data_previsao_resolucao).map((c) => (ts(c.data_previsao_resolucao) - ts(c.data_abertura)) / 60_000);

  const tecnicos = [...ctx.usuarios.values()]
    .filter((u) => PERFIL_RANK[u.perfil] >= PERFIL_RANK.TECNICO && u.status === 'ATIVO')
    .map((u) => {
      const seus = rows.filter((c) => c.id_tecnico_atribuido === u.id);
      const fechados = seus.filter(finalizado);
      return {
        id: u.id,
        nome: u.nome,
        nivel: u.cargo,
        ativos: seus.length - fechados.length,
        resolvidosHoje: fechados.filter((c) => ts(c.data_resolucao) >= hoje).length,
        slaPct: pct(fechados.filter(dentroSla).length, fechados.length),
        carga: 0,
      };
    })
    .filter((t) => t.ativos || t.resolvidosHoje)
    .sort((a, b) => b.ativos - a.ativos);
  const maxAtivos = Math.max(1, ...tecnicos.map((t) => t.ativos));
  tecnicos.forEach((t) => (t.carga = Math.round((t.ativos / maxAtivos) * 100)));

  const volumeDiario = Array.from({ length: 7 }, (_, i) => {
    const ini = hoje - (6 - i) * DIA_MS;
    const noDia = (iso: string | null) => {
      const t = ts(iso);
      return t >= ini && t < ini + DIA_MS;
    };
    return {
      dia: new Date(ini).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      abertos: rows.filter((c) => noDia(c.data_abertura)).length,
      fechados: rows.filter((c) => noDia(c.data_resolucao)).length,
    };
  });

  const atribuidos = abertos.filter((c) => c.tecnicoId !== null);
  return {
    kpis: {
      abertos: abertos.length,
      atribuidosAMim: abertos.filter((c) => c.tecnicoId === eu).length,
      naoAtribuidos: abertos.length - atribuidos.length,
      pendentes: porStatus.PENDENTE,
      slaCritico: abertos.filter((c) => !c.slaPausado && c.slaRestanteMin !== null && c.slaRestanteMin < 0).length,
      slaCumpridoPct: slaAtual,
      slaVariacaoPct: slaAtual !== null && slaAnterior !== null ? Math.round((slaAtual - slaAnterior) * 10) / 10 : null,
      mttrMin: media(resolvidos.map(duracaoMin)),
      mttrMetaMin: media(metas),
      mediaPorTecnico: tecnicos.length ? Math.round((atribuidos.length / tecnicos.length) * 10) / 10 : null,
      resolvidosHoje: rows.filter((c) => ts(c.data_resolucao) >= hoje).length,
      totalPeriodo: doPeriodo.length,
      csat: null,
    },
    porStatus,
    porPrioridade,
    volumeDiario,
    categoriasTop: [...categorias].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total).slice(0, 5),
    ultimosChamados: [...chamados].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 6),
    tecnicos: tecnicos.slice(0, 6),
    infraestrutura: integracoes.map((i) => ({ servico: i.nome, up: i.status === 'ATIVO' })),
  };
}

async function tmaReal(periodo: Periodo): Promise<RelatorioTma> {
  const [rows, usuarios, departamentos] = await Promise.all([chamadosApi(), lookups.usuarios(), lookups.departamentos()]);
  const deps = byId(departamentos);
  const agora = Date.now();
  const janela = PERIODO_DIAS[periodo] * DIA_MS;
  const fechados = resolvidosEntre(rows, agora - janela, agora);
  const anteriores = resolvidosEntre(rows, agora - 2 * janela, agora - janela);
  const tma = media(fechados.map(duracaoMin));

  const analistas = usuarios
    .map((u) => {
      const seus = fechados.filter((c) => c.id_tecnico_atribuido === u.id);
      return {
        id: u.id,
        nome: u.nome,
        departamento: (u.id_departamento && deps.get(u.id_departamento)?.nome) || u.cargo,
        fechados: seus.length,
        tmaMin: media(seus.map(duracaoMin)) ?? 0,
        reaberturasPct: null,
        slaPct: pct(seus.filter(dentroSla).length, seus.length) ?? 0,
        eficienciaPct: null,
        csat: null,
        avaliacoes: null,
      };
    })
    .filter((a) => a.fechados > 0)
    .sort((a, b) => b.fechados - a.fechados);

  return {
    totalFechados: fechados.length,
    variacaoPct: variacao(fechados.length, anteriores.length),
    tmaMin: tma,
    tmaVariacaoPct: variacao(tma, media(anteriores.map(duracaoMin))),
    csat: null,
    analistas,
  };
}

function resumoMock(): DashboardResumo {
  const cs = db.chamados;
  const abertos = cs.filter((c) => c.status !== 'RESOLVIDO' && c.status !== 'CONCLUIDO');
  const porStatus = { NOVO: 0, EM_ATENDIMENTO: 0, PENDENTE: 0, RESOLVIDO: 0, CONCLUIDO: 0 } as Record<StatusChamado, number>;
  const porPrioridade = { CRITICA: 0, ALTA: 0, MEDIA: 0, BAIXA: 0 } as Record<Prioridade, number>;
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
      slaCritico: abertos.filter((c) => c.slaRestanteMin !== null && c.slaRestanteMin < 0).length,
      slaCumpridoPct: 94.2,
      slaVariacaoPct: 2.1,
      mttrMin: 225,
      mttrMetaMin: 210,
      mediaPorTecnico: 12.4,
      resolvidosHoje: 28,
      totalPeriodo: 792,
      csat: 4.8,
    },
    porStatus,
    porPrioridade,
    volumeDiario: [
      { dia: 'Seg', abertos: 42, fechados: 26 },
      { dia: 'Ter', abertos: 55, fechados: 30 },
      { dia: 'Qua', abertos: 68, fechados: 24 },
      { dia: 'Qui', abertos: 48, fechados: 31 },
      { dia: 'Sex', abertos: 40, fechados: 35 },
      { dia: 'Sáb', abertos: 16, fechados: 12 },
      { dia: 'Dom', abertos: 12, fechados: 10 },
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
  const f = periodo === 'ano' ? 11.5 : periodo === 'trimestre' ? 3 : 1;
  return {
    totalFechados: Math.round(957 * f),
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
  resumo: (periodo: Periodo = '30d') => request<DashboardResumo>(() => resumoReal(periodo), resumoMock),
  tma: (periodo: Periodo) => request<RelatorioTma>(() => tmaReal(periodo), () => tmaMock(periodo)),
};
