import { api } from '@/lib/api';
import { matches, paginate, request } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type {
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

export const usuariosService = {
  list: (f: UsuarioFiltros) =>
    request<Paginated<Usuario>>(
      () => api.get('/usuarios', { params: f }),
      () =>
        paginate(
          db.usuarios.filter(
            (u) =>
              (matches(u.nome, f.search) || matches(u.email, f.search)) &&
              (!f.departamentoId || u.departamentoId === Number(f.departamentoId)) &&
              (!f.papel || u.papeis.includes(f.papel)) &&
              (!f.status || u.status === f.status),
          ),
          f.page,
          f.pageSize,
        ),
    ),

  create: (input: UsuarioInput) =>
    request<Usuario>(
      () => api.post('/usuarios', input),
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

  update: (id: number, input: UsuarioInput) =>
    request<Usuario>(
      () => api.put(`/usuarios/${id}`, input),
      () => {
        const u = db.usuarios.find((x) => x.id === id)!;
        Object.assign(u, input, { departamentoNome: db.departamentos.find((d) => d.id === input.departamentoId)?.nome });
        return u;
      },
    ),
};

export const departamentosService = {
  list: () => request<Departamento[]>(() => api.get('/departamentos'), () => db.departamentos),

  create: (input: DepartamentoInput) =>
    request<Departamento>(
      () => api.post('/departamentos', input),
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
  list: () => request<Categoria[]>(() => api.get('/categorias'), () => db.categorias),

  create: (input: CategoriaInput) =>
    request<Categoria>(
      () => api.post('/categorias', input),
      () => {
        const c: Categoria = { ...input, id: uid() };
        db.categorias.push(c);
        return c;
      },
    ),
};

export const gruposService = {
  list: () => request<GrupoSuporte[]>(() => api.get('/grupos-suporte'), () => db.grupos),

  create: (input: GrupoInput) =>
    request<GrupoSuporte>(
      () => api.post('/grupos-suporte', input),
      () => {
        const g: GrupoSuporte = { ...input, id: uid(), membros: [] };
        db.grupos.push(g);
        return g;
      },
    ),

  addMembro: (input: MembroInput) =>
    request<MembroGrupo>(
      () => api.post('/membros-grupos', input),
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

export const tecnicosService = {
  list: () => request<Tecnico[]>(() => api.get('/tecnicos'), () => db.tecnicos),
};
