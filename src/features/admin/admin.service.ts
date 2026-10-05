import { api } from '@/lib/api';
import { assetUrl, byId, currentTenantId, lookups } from '@/lib/backend/lookups';
import type { ApiAuditLog, ApiBranding, ApiCliente, ApiHistoricoIntegracao, ApiIntegracao, ApiPoliticaSla } from '@/lib/backend/types';
import { data, matches, request } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type {
  AcaoAuditoria,
  AuditLog,
  AuditoriaFiltros,
  Branding,
  Cliente,
  ClienteInput,
  HorarioComercial,
  Integracao,
  IntegracaoInput,
  PoliticaSla,
  Prioridade,
  TesteIntegracaoResult,
  TipoIntegracao,
} from '@/types';

const TIPO_ALVO: Record<string, string> = { INCIDENTE: 'Incidentes', REQUISICAO: 'Requisições', AMBOS: 'Incidentes e requisições' };

function toPolitica(p: ApiPoliticaSla): PoliticaSla {
  return {
    id: p.id,
    prioridade: p.prioridade_alvo as Prioridade,
    tipoAlvo: p.tipo_chamado_alvo as PoliticaSla['tipoAlvo'],
    ativa: p.status === 'ATIVO',
    nome: p.nome,
    descricao: `Aplica-se a: ${TIPO_ALVO[p.tipo_chamado_alvo] ?? p.tipo_chamado_alvo}${p.status !== 'ATIVO' ? ' · inativa' : ''}`,
    tempoRespostaMin: p.tempo_resposta_min,
    tempoSolucaoMin: p.tempo_resolucao_min,
    calendario: p.id_horario_comercial ? 'COMERCIAL' : '24X7',
    horarioComercialId: p.id_horario_comercial,
    notificarGestor: false,
    alertaPercentual: null,
  };
}

export const slaService = {
  politicas: () =>
    request<PoliticaSla[]>(async () => (await data(api.get<ApiPoliticaSla[]>('/politicas-sla'))).map(toPolitica), () => db.politicasSla),
  salvar: (politicas: PoliticaSla[]) =>
    request<PoliticaSla[]>(
      () => Promise.reject(new Error('A API permite apenas criar novas políticas de SLA; a edição das existentes ainda não está disponível.')),
      () => {
        if (politicas.some((p) => p.tempoRespostaMin >= p.tempoSolucaoMin)) {
          throw new Error('O tempo de resposta deve ser menor que o tempo de solução (HTTP 422).');
        }
        db.politicasSla.splice(0, db.politicasSla.length, ...politicas);
        return db.politicasSla;
      },
    ),
  /** A API não expõe GET de horários comerciais/feriados. */
  horarios: () => request<HorarioComercial[]>(async () => [], () => db.horariosComerciais),
};

export const LOGO_URL_RE = /^https?:\/\/\S+$/i;
export const LOGO_URL_MAX = 255;

const BRANDING_PADRAO = { corPrimaria: '#0056B3', corSecundaria: '#0F172A', corDestaque: '#3B82F6', corFundo: '#F4F6F9' };

export const brandingService = {
  get: () =>
    request<Branding>(
      async () => {
        const [b] = await data(api.get<ApiBranding[]>('/branding'));
        return {
          nomePortal: b?.nome_portal ?? 'Portal ITSM',
          fusoHorario: 'America/Sao_Paulo',
          logoUrl: assetUrl(b?.logo_url || null),
          corPrimaria: b?.cor_primaria ?? BRANDING_PADRAO.corPrimaria,
          corSecundaria: b?.cor_secundaria ?? BRANDING_PADRAO.corSecundaria,
          corDestaque: BRANDING_PADRAO.corDestaque,
          corFundo: b?.cor_fundo ?? BRANDING_PADRAO.corFundo,
        };
      },
      () => db.branding,
    ),
  salvar: (b: Branding) =>
    request<unknown>(
      () => {
        if (b.logoUrl && !LOGO_URL_RE.test(b.logoUrl)) {
          return Promise.reject(new Error('Informe o logotipo como uma URL pública (a API não aceita upload de arquivo).'));
        }
        if (b.logoUrl && b.logoUrl.length > LOGO_URL_MAX) {
          return Promise.reject(new Error(`A URL do logotipo deve ter no máximo ${LOGO_URL_MAX} caracteres.`));
        }
        return data(
          api.post('/admin/branding', {
            nome_portal: b.nomePortal.trim(),
            cor_primaria: b.corPrimaria,
            cor_secundaria: b.corSecundaria,
            cor_fundo: b.corFundo,
            logo_url: b.logoUrl ?? '',
          }),
        );
      },
      () => Object.assign(db.branding, b),
    ),
};

function toIntegracao(i: ApiIntegracao): Integracao {
  const cfg = i.configuracoes ?? {};
  return {
    id: i.id,
    nome: i.nome,
    tipo: i.tipo as TipoIntegracao,
    host: String(cfg.host ?? cfg.url ?? ''),
    porta: Number(cfg.port ?? cfg.porta ?? 0),
    ativo: i.status === 'ATIVO',
    ultimoTeste: null,
    ultimoResultado: null,
    latenciaMs: null,
  };
}

export const integracoesService = {
  list: () => request<Integracao[]>(async () => (await data(api.get<ApiIntegracao[]>('/integracoes'))).map(toIntegracao), () => db.integracoes),
  create: (input: IntegracaoInput) =>
    request<unknown>(
      () =>
        data(
          api.post('/admin/integracoes', {
            nome: input.nome.trim(),
            tipo: input.tipo,
            configuracoes: { host: input.host.trim(), port: input.porta },
            status: input.ativo ? 'ATIVO' : 'INATIVO',
          }),
        ),
      () => {
        const i: Integracao = { ...input, id: uid(), ultimoTeste: null, ultimoResultado: null, latenciaMs: null };
        db.integracoes.push(i);
        return i;
      },
    ),
  testar: (id: number) =>
    request<TesteIntegracaoResult>(
      async () => {
        const inicio = performance.now();
        const r = await data(api.post<ApiHistoricoIntegracao>(`/admin/integracoes/${id}/testar`));
        const sucesso = r.status === 'SUCESSO';
        return { sucesso, latenciaMs: sucesso ? Math.round(performance.now() - inicio) : 0, mensagem: r.dados_log ?? (sucesso ? 'Conexão estabelecida.' : 'Falha de conexão.') };
      },
      async () => {
        await new Promise((r) => setTimeout(r, 700));
        const i = db.integracoes.find((x) => x.id === id)!;
        const sucesso = i.ativo && !i.host.includes('invalid');
        const latenciaMs = sucesso ? 10 + Math.round(Math.random() * 90) : 0;
        Object.assign(i, { ultimoTeste: new Date().toISOString(), ultimoResultado: sucesso ? 'SUCESSO' : 'FALHA', latenciaMs: sucesso ? latenciaMs : null });
        return {
          sucesso,
          latenciaMs,
          mensagem: sucesso ? `Conexão TCP estabelecida com ${i.host}:${i.porta}` : `Falha ao conectar em ${i.host}:${i.porta} (timeout/conector inativo)`,
        };
      },
    ),
};

export const clientesService = {
  list: () =>
    request<Cliente[]>(
      async () => {
        const [rows, usuarios] = await Promise.all([data(api.get<ApiCliente[]>('/clientes')), lookups.usuarios()]);
        const tenant = currentTenantId();
        return rows.map((c) => ({
          id: c.id,
          razaoSocial: c.razao_social,
          nomeFantasia: c.nome_fantasia,
          cnpj: c.cnpj,
          totalUsuarios: c.id === tenant ? usuarios.length : null,
          status: c.status as Cliente['status'],
          criadoEm: c.data_contratacao,
        }));
      },
      () => db.clientes,
    ),
  create: (input: ClienteInput) =>
    request<unknown>(
      () => data(api.post('/admin/clientes', { razao_social: input.razaoSocial, nome_fantasia: input.nomeFantasia, cnpj: input.cnpj, status: input.status })),
      () => {
        if (db.clientes.some((c) => c.cnpj === input.cnpj)) throw new Error('CNPJ já cadastrado (HTTP 409).');
        const c: Cliente = { ...input, id: uid(), totalUsuarios: 0, criadoEm: new Date().toISOString() };
        db.clientes.unshift(c);
        return c;
      },
    ),
};

/** A API grava códigos como CREATE_CHAMADO / PAUSE_SLA; o filtro da tela usa a categoria. */
function categoriaAcao(acao: string): AcaoAuditoria {
  if (/^(CREATE|ADD|INSERT|LINK)/.test(acao)) return 'CREATE';
  if (/^(DELETE|REMOVE)/.test(acao)) return 'DELETE';
  if (/LOGIN|LOGOUT|AUTH/.test(acao)) return 'LOGIN';
  if (/^(UPSERT|CONFIG|EXECUTE|TEST)/.test(acao) || /BRANDING|INTEGRA|SLA_POLICY/.test(acao)) return 'CONFIG';
  return 'UPDATE';
}

async function auditoriaReal(): Promise<AuditLog[]> {
  const [rows, usuarios] = await Promise.all([data(api.get<ApiAuditLog[]>('/admin/auditoria')), lookups.usuarios()]);
  const us = byId(usuarios);
  return rows.map((l) => ({
    id: l.id,
    criadoEm: l.data_criacao,
    usuarioNome: l.id_usuario ? (us.get(l.id_usuario)?.nome ?? `Usuário #${l.id_usuario}`) : 'Sistema',
    acao: categoriaAcao(l.acao),
    acaoDetalhe: l.acao,
    entidade: l.tabela_afetada,
    entidadeId: l.registro_id !== null ? String(l.registro_id) : '—',
    valorAntigo: l.valor_anterior,
    valorNovo: l.valor_novo,
    ip: l.endereco_ip?.replace(/^::ffff:/i, '') || '—',
  }));
}

const maisRecentes = (logs: AuditLog[]) => [...logs].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

export function filtrarAuditoria(logs: AuditLog[], f: Pick<AuditoriaFiltros, 'search' | 'acao'>) {
  return logs.filter(
    (l) =>
      (matches(l.usuarioNome, f.search) || matches(l.entidade, f.search) || matches(l.entidadeId, f.search) || matches(l.acaoDetalhe ?? '', f.search)) &&
      (!f.acao || l.acao === f.acao),
  );
}

export const auditoriaService = {
  /** Trilha completa, mais recente primeiro; filtros e paginação são aplicados na tela. */
  list: () =>
    request<AuditLog[]>(
      async () => maisRecentes(await auditoriaReal()),
      () => maisRecentes(db.auditLogs),
    ),
};
