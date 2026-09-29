import type { Chamado, StatusChamado, Prioridade } from './chamado';

export interface DashboardResumo {
  kpis: {
    abertos: number;
    atribuidosAMim: number;
    doMeuGrupo: number;
    pendentes: number;
    slaCritico: number;
    slaCumpridoPct: number;
    slaVariacaoPct: number;
    mttrMin: number;
    mttrMetaMin: number;
    mediaPorTecnico: number;
    resolvidosHoje: number;
    totalPeriodo: number;
    csat: number;
  };
  porStatus: Record<StatusChamado, number>;
  porPrioridade: Record<Prioridade, number>;
  volumeDiario: { dia: string; abertos: number; atendimento: number; fechados: number }[];
  categoriasTop: { nome: string; total: number }[];
  ultimosChamados: Chamado[];
  tecnicos: { id: number; nome: string; nivel: string; ativos: number; resolvidosHoje: number; slaPct: number; carga: number }[];
  infraestrutura: { servico: string; up: boolean }[];
}

export interface RelatorioTma {
  totalFechados: number;
  variacaoPct: number;
  tmaMin: number;
  tmaVariacaoPct: number;
  csat: number;
  analistas: {
    id: number;
    nome: string;
    departamento: string;
    fechados: number;
    tmaMin: number;
    reaberturasPct: number;
    slaPct: number;
    eficienciaPct: number;
    csat: number;
    avaliacoes: number;
  }[];
}

export interface Tenant {
  id: number;
  nome: string;
  dominio: string;
}
