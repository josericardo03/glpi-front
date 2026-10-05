import { api } from '@/lib/api';
import { assetPath, assetUrl, byId, currentTenantId, lookups } from '@/lib/backend/lookups';
import type {
  ApiAuditLog,
  ApiBranding,
  ApiCliente,
  ApiFeriado,
  ApiHistoricoIntegracao,
  ApiHorarioComercial,
  ApiIntegracao,
  ApiPoliticaSla,
} from '@/lib/backend/types';
import { data, getAll, matches, request, TETO_PAGINA } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type {
  AcaoAuditoria,
  AuditLog,
  AuditoriaFiltros,
  Branding,
  AuditoriaFiltrosApi,
  Cliente,
  ClienteInput,
  Feriado,
  FeriadoInput,
  HorarioComercial,
  HorarioInput,
  Integracao,
  IntegracaoInput,
  IntervaloHorario,
  IntervaloInput,
  PoliticaSla,
  PoliticaSlaInput,
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

const porDiaEHora = (a: IntervaloHorario, b: IntervaloHorario) => a.diaSemana - b.diaSemana || a.inicio.localeCompare(b.inicio);

/** A API devolve as horas como `HH:mm:ss`; a tela trabalha com `HH:mm`. */
const toHorario = (h: ApiHorarioComercial): HorarioComercial => ({
  id: h.id,
  nome: h.nome,
  fusoHorario: h.fuso_horario,
  ativo: h.status === 'ATIVO',
  intervalos: h.intervalos.map((i) => ({ id: i.id, diaSemana: i.dia_semana, inicio: i.hora_inicio.slice(0, 5), fim: i.hora_fim.slice(0, 5) })).sort(porDiaEHora),
});

const porData = (a: Feriado, b: Feriado) => (a.ano ?? 0) - (b.ano ?? 0) || a.mes - b.mes || a.dia - b.dia;

const corpoPolitica = (p: Pick<PoliticaSlaInput, 'nome' | 'tempoRespostaMin' | 'tempoSolucaoMin' | 'horarioComercialId' | 'ativa'>) => ({
  nome: p.nome.trim(),
  tempo_resposta_min: p.tempoRespostaMin,
  tempo_resolucao_min: p.tempoSolucaoMin,
  id_horario_comercial: p.horarioComercialId,
  status: p.ativa ? 'ATIVO' : 'INATIVO',
});

const acharHorario = (id: number) => {
  const h = db.horariosComerciais.find((x) => x.id === id);
  if (!h) throw new Error('Horário comercial não encontrado (HTTP 404).');
  return h;
};
const sobrepoe = (h: HorarioComercial, i: Omit<IntervaloHorario, 'id'>, ignorar?: number) =>
  h.intervalos.some((x) => x.id !== ignorar && x.diaSemana === i.diaSemana && i.inicio < x.fim && i.fim > x.inicio);

export const slaService = {
  politicas: () =>
    request<PoliticaSla[]>(async () => (await data(api.get<ApiPoliticaSla[]>('/politicas-sla'))).map(toPolitica), () => db.politicasSla),
  criarPolitica: (input: PoliticaSlaInput) =>
    request<unknown>(
      () =>
        data(
          api.post('/admin/politicas-sla', { ...corpoPolitica(input), prioridade_alvo: input.prioridade, tipo_chamado_alvo: input.tipoAlvo }),
        ),
      () => {
        const repetida = db.politicasSla.some((p) => p.ativa && input.ativa && p.prioridade === input.prioridade && p.tipoAlvo === input.tipoAlvo);
        if (repetida) throw new Error('Já existe uma política ativa para esta prioridade e tipo (HTTP 409).');
        const p: PoliticaSla = {
          ...input,
          id: Math.max(0, ...db.politicasSla.map((x) => x.id)) + 1,
          descricao: `Aplica-se a: ${TIPO_ALVO[input.tipoAlvo]}`,
          calendario: 'COMERCIAL',
          notificarGestor: false,
          alertaPercentual: null,
        };
        db.politicasSla.push(p);
        return p;
      },
    ),
  /** Envia um PATCH por política alterada, em sequência, para que um conflito (HTTP 409) pare no item que o causou. */
  atualizarPoliticas: (alteradas: PoliticaSla[]) =>
    request<unknown>(
      async () => {
        for (const p of alteradas) {
          if (!p.horarioComercialId) throw new Error(`Selecione o horário comercial da política "${p.nome}".`);
          await api.patch(`/admin/politicas-sla/${p.id}`, corpoPolitica({ ...p, horarioComercialId: p.horarioComercialId }));
        }
        return null;
      },
      () => {
        if (alteradas.some((p) => p.tempoRespostaMin >= p.tempoSolucaoMin)) {
          throw new Error('O tempo de resposta deve ser menor que o tempo de solução (HTTP 422).');
        }
        alteradas.forEach((p) => Object.assign(db.politicasSla.find((x) => x.id === p.id)!, p));
        return null;
      },
    ),
  horarios: () =>
    request<HorarioComercial[]>(
      async () => (await data(api.get<ApiHorarioComercial[]>('/admin/horarios-comerciais'))).map(toHorario).sort((a, b) => a.id - b.id),
      () => db.horariosComerciais,
    ),
  criarHorario: (input: HorarioInput) =>
    request<unknown>(
      () => data(api.post('/admin/horarios-comerciais', { nome: input.nome.trim(), fuso_horario: input.fusoHorario, status: input.ativo ? 'ATIVO' : 'INATIVO' })),
      () => {
        const h: HorarioComercial = { id: Math.max(0, ...db.horariosComerciais.map((x) => x.id)) + 1, nome: input.nome.trim(), fusoHorario: input.fusoHorario, ativo: input.ativo, intervalos: [] };
        db.horariosComerciais.push(h);
        return h;
      },
    ),
  atualizarHorario: (id: number, input: HorarioInput) =>
    request<unknown>(
      () => data(api.patch(`/admin/horarios-comerciais/${id}`, { nome: input.nome.trim(), fuso_horario: input.fusoHorario, status: input.ativo ? 'ATIVO' : 'INATIVO' })),
      () => Object.assign(acharHorario(id), { nome: input.nome.trim(), fusoHorario: input.fusoHorario, ativo: input.ativo }),
    ),
  /** A API recusa (HTTP 409) a exclusão de horário usado por alguma política. */
  excluirHorario: (id: number) =>
    request<unknown>(
      () => data(api.delete(`/admin/horarios-comerciais/${id}`)),
      () => {
        acharHorario(id);
        if (db.politicasSla.some((p) => p.horarioComercialId === id)) throw new Error('Este horário está em uso por uma política de SLA (HTTP 409).');
        db.horariosComerciais.splice(db.horariosComerciais.findIndex((h) => h.id === id), 1);
        return null;
      },
    ),
  criarIntervalo: ({ horarioId, diaSemana, inicio, fim }: IntervaloInput) =>
    request<unknown>(
      () => data(api.post(`/admin/horarios-comerciais/${horarioId}/intervalos`, { dia_semana: diaSemana, hora_inicio: inicio, hora_fim: fim })),
      () => {
        const h = acharHorario(horarioId);
        if (sobrepoe(h, { diaSemana, inicio, fim })) throw new Error('O intervalo se sobrepõe a outro do mesmo dia (HTTP 400).');
        const i: IntervaloHorario = { id: uid(), diaSemana, inicio, fim };
        h.intervalos = [...h.intervalos, i].sort(porDiaEHora);
        return i;
      },
    ),
  atualizarIntervalo: (id: number, { horarioId, diaSemana, inicio, fim }: IntervaloInput) =>
    request<unknown>(
      () => data(api.patch(`/admin/horarios-comerciais/${horarioId}/intervalos/${id}`, { dia_semana: diaSemana, hora_inicio: inicio, hora_fim: fim })),
      () => {
        const h = acharHorario(horarioId);
        if (sobrepoe(h, { diaSemana, inicio, fim }, id)) throw new Error('O intervalo se sobrepõe a outro do mesmo dia (HTTP 400).');
        h.intervalos = h.intervalos.map((x) => (x.id === id ? { id, diaSemana, inicio, fim } : x)).sort(porDiaEHora);
        return null;
      },
    ),
  excluirIntervalo: (horarioId: number, id: number) =>
    request<unknown>(
      () => data(api.delete(`/admin/horarios-comerciais/${horarioId}/intervalos/${id}`)),
      () => {
        const h = acharHorario(horarioId);
        h.intervalos = h.intervalos.filter((x) => x.id !== id);
        return null;
      },
    ),
  feriados: () =>
    request<Feriado[]>(
      async () => (await data(api.get<ApiFeriado[]>('/admin/feriados'))).map(({ id, nome, dia, mes, ano }) => ({ id, nome, dia, mes, ano })).sort(porData),
      () => [...db.feriados].sort(porData),
    ),
  criarFeriado: (input: FeriadoInput) =>
    request<unknown>(
      () => data(api.post('/admin/feriados', { nome: input.nome.trim(), dia: input.dia, mes: input.mes, ...(input.ano && { ano: input.ano }) })),
      () => {
        if (db.feriados.some((f) => f.dia === input.dia && f.mes === input.mes && f.ano === input.ano)) throw new Error('Já existe um feriado nesta data (HTTP 409).');
        const f: Feriado = { ...input, nome: input.nome.trim(), id: uid() };
        db.feriados.push(f);
        return f;
      },
    ),
  atualizarFeriado: (id: number, input: FeriadoInput) =>
    request<unknown>(
      () => data(api.patch(`/admin/feriados/${id}`, { nome: input.nome.trim(), dia: input.dia, mes: input.mes, ano: input.ano })),
      () => {
        if (db.feriados.some((f) => f.id !== id && f.dia === input.dia && f.mes === input.mes && f.ano === input.ano)) throw new Error('Já existe um feriado nesta data (HTTP 409).');
        Object.assign(db.feriados.find((f) => f.id === id)!, { ...input, nome: input.nome.trim() });
        return null;
      },
    ),
  excluirFeriado: (id: number) =>
    request<unknown>(
      () => data(api.delete(`/admin/feriados/${id}`)),
      () => {
        db.feriados.splice(db.feriados.findIndex((f) => f.id === id), 1);
        return null;
      },
    ),
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
            logo_url: assetPath(b.logoUrl) ?? '',
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

/** `data_fim` é enviada como o último instante do dia para incluir os eventos da data escolhida. */
function paramsAuditoria(f: AuditoriaFiltrosApi) {
  return {
    ...(f.dataInicio && { data_inicio: new Date(`${f.dataInicio}T00:00:00`).toISOString() }),
    ...(f.dataFim && { data_fim: new Date(`${f.dataFim}T23:59:59.999`).toISOString() }),
    ...(f.usuarioId && { id_usuario: f.usuarioId }),
    ...(f.codigoAcao && { acao: f.codigoAcao }),
  };
}

/** Teto de eventos carregados por consulta (páginas de 200); acima disso, a tela pede para refinar o período. */
const AUDITORIA_MAX_PAGINAS = 5;
export const AUDITORIA_MAX_EVENTOS = TETO_PAGINA.auditoria * AUDITORIA_MAX_PAGINAS;

async function auditoriaReal(f: AuditoriaFiltrosApi): Promise<AuditLog[]> {
  const [rows, usuarios] = await Promise.all([
    getAll<ApiAuditLog>('/admin/auditoria', TETO_PAGINA.auditoria, paramsAuditoria(f), AUDITORIA_MAX_PAGINAS),
    lookups.usuarios(),
  ]);
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

function filtrarAuditoriaMock(f: AuditoriaFiltrosApi) {
  const inicio = f.dataInicio ? `${f.dataInicio}T00:00:00` : '';
  const fim = f.dataFim ? `${f.dataFim}T23:59:59.999` : '';
  const usuario = f.usuarioId ? db.usuarios.find((u) => u.id === f.usuarioId)?.nome : undefined;
  return db.auditLogs.filter(
    (l) =>
      (!inicio || new Date(l.criadoEm) >= new Date(inicio)) &&
      (!fim || new Date(l.criadoEm) <= new Date(fim)) &&
      (!f.usuarioId || l.usuarioNome === usuario) &&
      (!f.codigoAcao || l.acaoDetalhe === f.codigoAcao),
  );
}

export const auditoriaService = {
  /** Filtros de período, usuário e ação vão para a API (até AUDITORIA_MAX_EVENTOS); busca, categoria e paginação ficam na tela. */
  list: (f: AuditoriaFiltrosApi) =>
    request<AuditLog[]>(
      async () => maisRecentes(await auditoriaReal(f)),
      () => maisRecentes(filtrarAuditoriaMock(f)),
    ),
};
