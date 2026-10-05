import type { Chamado, StatusChamado, Prioridade } from './chamado';

/** Métricas sem base de cálculo no período (ex.: nenhum chamado resolvido) ficam `null`. */
export interface DashboardResumo {
  kpis: {
    abertos: number;
    atribuidosAMim: number;
    naoAtribuidos: number;
    pendentes: number;
    slaCritico: number;
    slaCumpridoPct: number | null;
    slaVariacaoPct: number | null;
    mttrMin: number | null;
    mediaPorTecnico: number | null;
    resolvidosHoje: number;
    /** Chamados abertos dentro do período selecionado. */
    totalPeriodo: number;
    csat: number | null;
  };
  /** Situação atual da fila (independe do período). */
  porStatus: Record<StatusChamado, number>;
  porPrioridade: Record<Prioridade, number>;
  /** Últimos 7 dias: chamados abertos e resolvidos em cada dia. */
  volumeDiario: { dia: string; abertos: number; fechados: number }[];
  /** Categorias dos chamados abertos no período (percentuais sobre `kpis.totalPeriodo`). */
  categoriasTop: { nome: string; total: number }[];
  ultimosChamados: Chamado[];
  tecnicos: { id: number; nome: string; nivel: string; ativos: number; resolvidosHoje: number; slaPct: number | null; carga: number }[];
  infraestrutura: { servico: string; up: boolean }[];
}

export interface RelatorioTma {
  totalFechados: number;
  variacaoPct: number | null;
  tmaMin: number | null;
  tmaVariacaoPct: number | null;
  csat: number | null;
  analistas: {
    id: number;
    nome: string;
    departamento: string;
    fechados: number;
    tmaMin: number | null;
    reaberturasPct: number | null;
    slaPct: number | null;
    eficienciaPct: number | null;
    csat: number | null;
    avaliacoes: number | null;
  }[];
}

export interface Tenant {
  id: number;
  nome: string;
  dominio: string;
}
