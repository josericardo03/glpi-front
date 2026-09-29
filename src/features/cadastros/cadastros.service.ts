import { api } from '@/lib/api';
import { byId, invalidateLookups, lookups } from '@/lib/backend/lookups';
import { perfilPrincipal, PERFIL_RANK, toUsuario } from '@/lib/backend/usuario.mapper';
import { data, matches, paginate, request } from '@/lib/http';
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
  Paginated,
  PageParams,
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
  paginate(
    rows.filter(
      (u) =>
        (matches(u.nome, f.search) || matches(u.email, f.search)) &&
        (!f.departamentoId || u.departamentoId === Number(f.departamentoId)) &&
        (!f.papel || u.papeis.includes(f.papel)) &&
        (!f.status || u.status === f.status),
    ),
    f.page,
    f.pageSize,
  );

async function usuariosApi() {
  const [usuarios, departamentos] = await Promise.all([lookups.usuarios(), lookups.departamentos()]);
  const deps = byId(departamentos);
  return usuarios.map((u) => toUsuario(u, deps));
}

export const usuariosService = {
  list: (f: UsuarioFiltros) =>
    request<Paginated<Usuario>>(
      async () => filtrarUsuarios(await usuariosApi(), f),
      () => filtrarUsuarios(db.usuarios, f),
    ),

  create: (input: UsuarioInput) =>
    request<Usuario>(
      async () => {
        const u = await data(
          api.post('/usuarios', {
            nome: input.nome,
            email: input.email,
            password: input.senha,
            cargo: input.cargo,
            perfil: perfilPrincipal(input.papeis),
            status: input.status,
            ...(input.departamentoId ? { id_departamento: input.departamentoId } : {}),
          }),
        );
        await invalidateLookups();
        return u;
      },
      () => {
        if (db.usuarios.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
          throw new Error('Já existe um usuário com este e-mail (HTTP 409).');
        }
        const u: Usuario = {
          ...input,
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

  /** PATCH /usuarios/:id não aceita alteração de e-mail. */
  update: (id: number, input: UsuarioInput) =>
    request<Usuario>(
      async () => {
        const u = await data(
          api.patch(`/usuarios/${id}`, {
            nome: input.nome,
            cargo: input.cargo,
            perfil: perfilPrincipal(input.papeis),
            status: input.status,
            ...(input.departamentoId ? { id_departamento: input.departamentoId } : {}),
            ...(input.senha ? { password: input.senha } : {}),
          }),
        );
        await invalidateLookups();
        return u;
      },
      () => {
        const u = db.usuarios.find((x) => x.id === id)!;
        Object.assign(u, input, { departamentoNome: db.departamentos.find((d) => d.id === input.departamentoId)?.nome });
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
          descricao: '',
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
            codigo_sigla: input.sigla.toUpperCase(),
            nome: input.nome,
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
            nome: input.nome,
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
};

/** A API não expõe GET de membros; a lista de membros só existe no modo mock. */
export const gruposService = {
  list: () =>
    request<GrupoSuporte[]>(
      async () =>
        (await lookups.grupos()).map((g) => ({
          id: g.id,
          nome: g.nome,
          descricao: g.descricao ?? '',
          status: g.status as AtivoInativo,
          membros: [],
        })),
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

  addMembro: (input: MembroInput) =>
    request<MembroGrupo>(
      () => data(api.post(`/grupos-suporte/${input.grupoId}/membros`, { id_usuario: input.usuarioId })),
      () => {
        const g = db.grupos.find((x) => x.id === input.grupoId)!;
        if (g.membros.some((m) => m.usuarioId === input.usuarioId)) throw new Error('Este técnico já é membro do grupo (HTTP 409).');
        const u = db.usuarios.find((x) => x.id === input.usuarioId)!;
        const m: MembroGrupo = { id: uid(), ...input, nome: u.nome, email: u.email, cargo: u.cargo };
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
          .map((u) => ({ id: u.id, nome: u.nome, nivel: u.cargo, grupoId: 0, avatarUrl: u.avatar_url })),
      () => db.tecnicos,
    ),
};
