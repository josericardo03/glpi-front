import { api } from '@/lib/api';
import { byId, invalidateLookups, lookups, perfilAtualAtinge } from '@/lib/backend/lookups';
import { perfilPrincipal, PERFIL_RANK, toUsuario } from '@/lib/backend/usuario.mapper';
import type { ApiUsuario } from '@/lib/backend/types';
import { contar, data, getAll, getPagina, matches, paginate, request, TETO_PAGINA } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type {
  AtivoInativo,
  Categoria,
  CategoriaInput,
  Departamento,
  DepartamentoInput,
  GrupoInput,
  GrupoSuporte,
  MembroGrupo,
  MembroInput,
  PageParams,
  Paginated,
  Papel,
  StatusUsuario,
  Tecnico,
  Usuario,
  UsuarioInput,
} from '@/types';

export interface UsuarioFiltros extends PageParams {
  departamentoId?: number | '';
  papel?: Papel | '';
  status?: StatusUsuario | '';
}

const filtrarUsuarios = (rows: Usuario[], f: UsuarioFiltros) =>
  rows.filter(
    (u) =>
      (matches(u.nome, f.search) || matches(u.email, f.search)) &&
      (!f.departamentoId || u.departamentoId === Number(f.departamentoId)) &&
      (!f.papel || u.papeis.includes(f.papel)) &&
      (!f.status || u.status === f.status),
  );

async function usuariosApi() {
  const [usuarios, departamentos] = await Promise.all([lookups.usuarios(), lookups.departamentos()]);
  const deps = byId(departamentos);
  return usuarios.map((u) => toUsuario(u, deps));
}

/** Converte a linha devolvida pela API no modelo da interface (com nome do departamento). */
async function mapearUsuario(row: ApiUsuario) {
  return toUsuario(row, byId(await lookups.departamentos()));
}

/** Campos alteráveis via PATCH /usuarios/:id (e-mail é imutável). */
export type UsuarioUpdate = Partial<Pick<UsuarioInput, 'nome' | 'cargo' | 'departamentoId' | 'papeis' | 'status' | 'senha'>>;

/** Filtros no vocabulário da API (busca, perfil, status, departamento). */
const paramsUsuarios = (f: Omit<UsuarioFiltros, 'page' | 'pageSize'>) => ({
  ...(f.search?.trim() && { busca: f.search.trim() }),
  ...(f.papel && { perfil: f.papel }),
  ...(f.status && { status: f.status }),
  ...(f.departamentoId && { id_departamento: f.departamentoId }),
});

export interface UsuariosContagens {
  total: number;
  administradores: number;
  ativos: number;
}

export const usuariosService = {
  /** Lista filtrada completa (seletores e lookups); a tela de usuários usa `pagina`. */
  list: (f: Omit<UsuarioFiltros, 'page' | 'pageSize'>) =>
    request<Usuario[]>(
      async () => filtrarUsuarios(await usuariosApi(), f),
      () => filtrarUsuarios(db.usuarios, f),
    ),

  /** Uma página já filtrada pelo servidor (busca, perfil, status e departamento). */
  pagina: (f: UsuarioFiltros) =>
    request<Paginated<Usuario>>(
      async () => {
        const [p, departamentos] = await Promise.all([getPagina<ApiUsuario>('/usuarios', paramsUsuarios(f), f.page ?? 1, f.pageSize ?? 10), lookups.departamentos()]);
        const deps = byId(departamentos);
        return { ...p, data: p.data.map((u) => toUsuario(u, deps)) };
      },
      () => paginate(filtrarUsuarios(db.usuarios, f), f.page, f.pageSize),
    ),

  /** Totais do filtro atual (cartões da tela), por contagem no servidor, sem baixar a lista. */
  contagens: (f: Omit<UsuarioFiltros, 'page' | 'pageSize'>) =>
    request<UsuariosContagens>(
      async () => {
        const base = paramsUsuarios(f);
        // Um filtro de perfil/status incompatível com o cartão zera o cartão (ex.: perfil=TECNICO → 0 administradores).
        const [total, administradores, ativos] = await Promise.all([
          contar('/usuarios', base),
          !f.papel || f.papel === 'ADMIN' ? contar('/usuarios', { ...base, perfil: 'ADMIN' }) : 0,
          !f.status || f.status === 'ATIVO' ? contar('/usuarios', { ...base, status: 'ATIVO' }) : 0,
        ]);
        return { total, administradores, ativos };
      },
      () => {
        const lista = filtrarUsuarios(db.usuarios, f);
        return { total: lista.length, administradores: lista.filter((u) => u.papeis.includes('ADMIN')).length, ativos: lista.filter((u) => u.status === 'ATIVO').length };
      },
    ),

  /** Todos os usuários do filtro, para exportar (percorre as páginas do servidor). */
  exportar: (f: Omit<UsuarioFiltros, 'page' | 'pageSize'>) =>
    request<Usuario[]>(
      async () => {
        const [rows, departamentos] = await Promise.all([getAll<ApiUsuario>('/usuarios', TETO_PAGINA.usuarios, paramsUsuarios(f)), lookups.departamentos()]);
        const deps = byId(departamentos);
        return rows.map((u) => toUsuario(u, deps));
      },
      () => filtrarUsuarios(db.usuarios, f),
    ),

  create: (input: UsuarioInput) =>
    request<Usuario>(
      async () => {
        const row = await data(
          api.post<ApiUsuario>('/usuarios', {
            nome: input.nome.trim(),
            email: input.email.trim().toLowerCase(),
            password: input.senha,
            cargo: input.cargo.trim(),
            perfil: perfilPrincipal(input.papeis),
            status: input.status,
            ...(input.departamentoId ? { id_departamento: input.departamentoId } : {}),
          }),
        );
        await invalidateLookups();
        return mapearUsuario(row);
      },
      () => {
        if (db.usuarios.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
          throw new Error('Já existe um usuário com este e-mail (HTTP 409).');
        }
        const { senha: _senha, ...dados } = input;
        const u: Usuario = {
          ...dados,
          id: uid(),
          tenantId: 1,
          departamentoNome: db.departamentos.find((d) => d.id === input.departamentoId)?.nome,
          criadoEm: new Date().toISOString(),
          ultimoAcesso: null,
        };
        db.usuarios.unshift(u);
        return u;
      },
    ),

  /** Envia apenas os campos informados. */
  update: (id: number, input: UsuarioUpdate) =>
    request<Usuario>(
      async () => {
        const row = await data(
          api.patch<ApiUsuario>(`/usuarios/${id}`, {
            ...(input.nome !== undefined && { nome: input.nome.trim() }),
            ...(input.cargo !== undefined && { cargo: input.cargo.trim() }),
            ...(input.papeis && { perfil: perfilPrincipal(input.papeis) }),
            ...(input.status && { status: input.status }),
            // `null` remove o departamento ("Nenhum"); `undefined` não altera.
            ...(input.departamentoId !== undefined && { id_departamento: input.departamentoId }),
            ...(input.senha && { password: input.senha }),
          }),
        );
        await invalidateLookups();
        return mapearUsuario(row);
      },
      () => {
        const u = db.usuarios.find((x) => x.id === id);
        if (!u) throw new Error('Usuário não encontrado (HTTP 404).');
        const { senha: _senha, ...dados } = input;
        Object.assign(u, dados);
        if (input.departamentoId !== undefined) u.departamentoNome = db.departamentos.find((d) => d.id === input.departamentoId)?.nome;
        return u;
      },
    ),
};

export const departamentosService = {
  list: () =>
    request<Departamento[]>(
      async () => {
        const [deps, usuarios] = await Promise.all([lookups.departamentos(), lookups.usuarios()]);
        const us = byId(usuarios);
        return deps.map((d) => ({
          id: d.id,
          sigla: d.codigo_sigla,
          nome: d.nome,
          gestorId: d.id_responsavel,
          gestorNome: d.id_responsavel ? (us.get(d.id_responsavel)?.nome ?? null) : null,
          departamentoPaiId: d.id_departamento_pai,
          totalUsuarios: usuarios.filter((u) => u.id_departamento === d.id).length,
          status: d.status === 'ATIVO' ? 'ATIVO' : 'INATIVO',
        }));
      },
      () => db.departamentos,
    ),

  create: (input: DepartamentoInput) =>
    request<Departamento>(
      async () => {
        const d = await data(
          api.post('/departamentos', {
            codigo_sigla: input.sigla.trim().toUpperCase(),
            nome: input.nome.trim(),
            ...(input.gestorId ? { id_responsavel: input.gestorId } : {}),
            ...(input.departamentoPaiId ? { id_departamento_pai: input.departamentoPaiId } : {}),
          }),
        );
        await invalidateLookups();
        return d;
      },
      () => {
        const sigla = input.sigla.toUpperCase();
        if (db.departamentos.some((d) => d.sigla === sigla)) throw new Error(`A sigla ${sigla} já está em uso (HTTP 409).`);
        const d: Departamento = {
          ...input,
          sigla,
          id: uid(),
          gestorNome: db.usuarios.find((u) => u.id === input.gestorId)?.nome ?? null,
          totalUsuarios: 0,
          status: 'ATIVO',
        };
        db.departamentos.push(d);
        return d;
      },
    ),

  update: (id: number, antes: Departamento, input: DepartamentoInput & { status: AtivoInativo }) =>
    request<unknown>(
      async () => {
        const sigla = input.sigla.trim().toUpperCase();
        const nome = input.nome.trim();
        if (input.departamentoPaiId === id) throw new Error('Um departamento não pode ser pai dele mesmo.');
        const body: Record<string, unknown> = {};
        if (sigla !== antes.sigla) body.codigo_sigla = sigla;
        if (nome !== antes.nome) body.nome = nome;
        if (input.gestorId !== antes.gestorId) body.id_responsavel = input.gestorId;
        if (input.departamentoPaiId !== antes.departamentoPaiId) body.id_departamento_pai = input.departamentoPaiId;
        if (input.status !== antes.status) body.status = input.status;
        if (Object.keys(body).length) {
          await data(api.patch(`/departamentos/${id}`, body));
          await invalidateLookups();
        }
      },
      () => {
        const d = db.departamentos.find((x) => x.id === id);
        if (!d) throw new Error('Departamento não encontrado (HTTP 404).');
        const sigla = input.sigla.trim().toUpperCase();
        if (db.departamentos.some((x) => x.id !== id && x.sigla === sigla)) throw new Error(`A sigla ${sigla} já está em uso (HTTP 409).`);
        if (input.departamentoPaiId === id) throw new Error('Um departamento não pode ser pai dele mesmo.');
        Object.assign(d, { ...input, sigla, gestorNome: db.usuarios.find((u) => u.id === input.gestorId)?.nome ?? null });
        return d;
      },
    ),
};

export const categoriasService = {
  list: () =>
    request<Categoria[]>(
      async () =>
        (await lookups.categorias()).map((c) => ({
          id: c.id,
          nome: c.nome,
          categoriaPaiId: c.id_categoria_pai,
          aplicacao: c.tipo_aplicacao,
          status: c.status as AtivoInativo,
        })),
      () => db.categorias,
    ),

  create: (input: CategoriaInput) =>
    request<Categoria>(
      async () => {
        const c = await data(
          api.post('/categorias', {
            nome: input.nome.trim(),
            tipo_aplicacao: input.aplicacao,
            status: input.status,
            ...(input.categoriaPaiId ? { id_categoria_pai: input.categoriaPaiId } : {}),
          }),
        );
        await invalidateLookups();
        return c;
      },
      () => {
        const c: Categoria = { ...input, id: uid() };
        db.categorias.push(c);
        return c;
      },
    ),

  update: (id: number, antes: Categoria, input: CategoriaInput) =>
    request<unknown>(
      async () => {
        const nome = input.nome.trim();
        if (input.categoriaPaiId === id) throw new Error('Uma categoria não pode ser pai dela mesma.');
        const body: Record<string, unknown> = {};
        if (nome !== antes.nome) body.nome = nome;
        if (input.aplicacao !== antes.aplicacao) body.tipo_aplicacao = input.aplicacao;
        if (input.categoriaPaiId !== antes.categoriaPaiId) body.id_categoria_pai = input.categoriaPaiId;
        if (input.status !== antes.status) body.status = input.status;
        if (Object.keys(body).length) {
          await data(api.patch(`/categorias/${id}`, body));
          await invalidateLookups();
        }
      },
      () => {
        const c = db.categorias.find((x) => x.id === id);
        if (!c) throw new Error('Categoria não encontrada (HTTP 404).');
        if (input.categoriaPaiId === id) throw new Error('Uma categoria não pode ser pai dela mesma.');
        Object.assign(c, { ...input, nome: input.nome.trim() });
        return c;
      },
    ),
};

interface ApiMembroGrupo {
  id: number;
  id_grupo: number;
  id_usuario: number;
  cargo_especialidade: string | null;
  carga_trabalho_pct: number;
  usuario: { id: number; nome: string; email: string; cargo: string; avatar_url: string | null };
}

/** Os membros só são consultados por GESTOR ou superior; os demais perfis usam a lista de grupos para filtros. */
async function membrosPorGrupo(): Promise<Map<number, MembroGrupo[]>> {
  const porGrupo = new Map<number, MembroGrupo[]>();
  if (!perfilAtualAtinge('GESTOR')) return porGrupo;
  const rows = await data(api.get<ApiMembroGrupo[]>('/grupos-suporte/membros')).catch(() => [] as ApiMembroGrupo[]);
  for (const m of rows) {
    const lista = porGrupo.get(m.id_grupo) ?? [];
    lista.push({
      id: m.id,
      grupoId: m.id_grupo,
      usuarioId: m.id_usuario,
      nome: m.usuario.nome,
      email: m.usuario.email,
      cargo: m.cargo_especialidade || m.usuario.cargo,
      cargaTrabalho: m.carga_trabalho_pct,
      avatarUrl: m.usuario.avatar_url,
    });
    porGrupo.set(m.id_grupo, lista);
  }
  return porGrupo;
}

export const gruposService = {
  list: () =>
    request<GrupoSuporte[]>(
      async () => {
        const [grupos, membros] = await Promise.all([lookups.grupos(), membrosPorGrupo()]);
        return grupos.map((g) => ({
          id: g.id,
          nome: g.nome,
          descricao: g.descricao ?? '',
          status: g.status as AtivoInativo,
          membros: membros.get(g.id) ?? [],
        }));
      },
      () => db.grupos,
    ),

  create: (input: GrupoInput) =>
    request<GrupoSuporte>(
      async () => {
        const g = await data(api.post('/grupos-suporte', { nome: input.nome, descricao: input.descricao || undefined }));
        await invalidateLookups();
        return g;
      },
      () => {
        const g: GrupoSuporte = { ...input, id: uid(), membros: [] };
        db.grupos.push(g);
        return g;
      },
    ),

  update: (id: number, antes: GrupoSuporte, input: GrupoInput) =>
    request<unknown>(
      async () => {
        const nome = input.nome.trim();
        const descricao = input.descricao.trim();
        const body: Record<string, unknown> = {};
        if (nome !== antes.nome) body.nome = nome;
        if (descricao !== antes.descricao.trim()) body.descricao = descricao || null;
        if (input.status !== antes.status) body.status = input.status;
        if (Object.keys(body).length) {
          await data(api.patch(`/grupos-suporte/${id}`, body));
          await invalidateLookups();
        }
      },
      () => {
        const g = db.grupos.find((x) => x.id === id);
        if (!g) throw new Error('Grupo não encontrado (HTTP 404).');
        Object.assign(g, { nome: input.nome.trim(), descricao: input.descricao.trim(), status: input.status });
        return g;
      },
    ),

  addMembro: (input: MembroInput) =>
    request<MembroGrupo>(
      () =>
        data(
          api.post(`/grupos-suporte/${input.grupoId}/membros`, {
            id_usuario: input.usuarioId,
            ...(input.especialidade?.trim() && { cargo_especialidade: input.especialidade.trim() }),
          }),
        ),
      () => {
        const g = db.grupos.find((x) => x.id === input.grupoId)!;
        if (g.membros.some((m) => m.usuarioId === input.usuarioId)) throw new Error('Este técnico já é membro do grupo (HTTP 409).');
        const u = db.usuarios.find((x) => x.id === input.usuarioId)!;
        const m: MembroGrupo = {
          id: uid(),
          grupoId: input.grupoId,
          usuarioId: input.usuarioId,
          nome: u.nome,
          email: u.email,
          cargo: input.especialidade?.trim() || u.cargo,
          cargaTrabalho: 0,
        };
        g.membros.push(m);
        return m;
      },
    ),
};

/** Técnicos = usuários ativos com perfil TECNICO ou superior. */
export const tecnicosService = {
  list: () =>
    request<Tecnico[]>(
      async () =>
        (await lookups.usuarios())
          .filter((u) => u.status === 'ATIVO' && PERFIL_RANK[u.perfil] >= PERFIL_RANK.TECNICO)
          .map((u) => ({ id: u.id, nome: u.nome, nivel: u.cargo, grupoId: null, avatarUrl: u.avatar_url })),
      () => db.tecnicos,
    ),
};
