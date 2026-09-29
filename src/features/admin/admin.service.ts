import { api } from '@/lib/api';
import { matches, paginate, request } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type {
  AuditLog,
  AuditoriaFiltros,
  Branding,
  Cliente,
  ClienteInput,
  HorarioComercial,
  Integracao,
  IntegracaoInput,
  Paginated,
  PoliticaSla,
  TesteIntegracaoResult,
} from '@/types';

export const slaService = {
  politicas: () => request<PoliticaSla[]>(() => api.get('/politicas-sla'), () => db.politicasSla),
  salvar: (politicas: PoliticaSla[]) =>
    request<PoliticaSla[]>(
      () => api.post('/admin/politicas-sla', politicas),
      () => {
        if (politicas.some((p) => p.tempoRespostaMin >= p.tempoSolucaoMin)) {
          throw new Error('O tempo de resposta deve ser menor que o tempo de solução (HTTP 422).');
        }
        db.politicasSla.splice(0, db.politicasSla.length, ...politicas);
        return db.politicasSla;
      },
    ),
  horarios: () => request<HorarioComercial[]>(() => api.get('/horarios-comerciais'), () => db.horariosComerciais),
};

export const brandingService = {
  get: () => request<Branding>(() => api.get('/branding'), () => db.branding),
  salvar: (b: Branding) =>
    request<Branding>(
      () => api.post('/admin/branding', b),
      () => Object.assign(db.branding, b),
    ),
};

export const integracoesService = {
  list: () => request<Integracao[]>(() => api.get('/integracoes'), () => db.integracoes),
  create: (input: IntegracaoInput) =>
    request<Integracao>(
      () => api.post('/admin/integracoes', input),
      () => {
        const i: Integracao = { ...input, id: uid(), ultimoTeste: null, ultimoResultado: null, latenciaMs: null };
        db.integracoes.push(i);
        return i;
      },
    ),
  testar: (id: number) =>
    request<TesteIntegracaoResult>(
      () => api.post(`/admin/integracoes/${id}/testar`),
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
  list: () => request<Cliente[]>(() => api.get('/clientes'), () => db.clientes),
  create: (input: ClienteInput) =>
    request<Cliente>(
      () => api.post('/admin/clientes', input),
      () => {
        if (db.clientes.some((c) => c.cnpj === input.cnpj)) throw new Error('CNPJ já cadastrado (HTTP 409).');
        const c: Cliente = { ...input, id: uid(), totalUsuarios: 0, status: 'TRIAL', criadoEm: new Date().toISOString() };
        db.clientes.unshift(c);
        return c;
      },
    ),
};

export const auditoriaService = {
  list: (f: AuditoriaFiltros) =>
    request<Paginated<AuditLog>>(
      () => api.get('/admin/auditoria', { params: f }),
      () =>
        paginate(
          db.auditLogs.filter(
            (l) => (matches(l.usuarioNome, f.search) || matches(l.entidade, f.search) || matches(l.entidadeId, f.search)) && (!f.acao || l.acao === f.acao),
          ),
          f.page,
          f.pageSize,
        ),
    ),
};
