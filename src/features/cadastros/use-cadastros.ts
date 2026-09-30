'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { CategoriaInput, DepartamentoInput, GrupoInput, MembroInput, UsuarioInput } from '@/types';
import {
  categoriasService,
  departamentosService,
  gruposService,
  tecnicosService,
  usuariosService,
  type UsuarioFiltros,
  type UsuarioUpdate,
} from './cadastros.service';

const LOOKUP = { staleTime: 5 * 60_000 };

type FiltrosUsuario = Omit<UsuarioFiltros, 'page' | 'pageSize'>;

export const cadastrosKeys = {
  usuarios: ['usuarios'] as const,
  usuariosList: (f: FiltrosUsuario) => ['usuarios', f] as const,
  departamentos: ['departamentos'] as const,
  categorias: ['categorias'] as const,
  grupos: ['grupos'] as const,
  tecnicos: ['tecnicos'] as const,
};

// ---------- Queries ----------
export const useUsuarios = (f: FiltrosUsuario = {}) =>
  useQuery({ queryKey: cadastrosKeys.usuariosList(f), queryFn: () => usuariosService.list(f), placeholderData: keepPreviousData });
export const useDepartamentos = () => useQuery({ queryKey: cadastrosKeys.departamentos, queryFn: departamentosService.list, ...LOOKUP });
export const useCategorias = () => useQuery({ queryKey: cadastrosKeys.categorias, queryFn: categoriasService.list, ...LOOKUP });
export const useGrupos = () => useQuery({ queryKey: cadastrosKeys.grupos, queryFn: gruposService.list, ...LOOKUP });
export const useTecnicos = () => useQuery({ queryKey: cadastrosKeys.tecnicos, queryFn: tecnicosService.list, ...LOOKUP });

// ---------- Options para <Select> (memoizadas) ----------
export function useCategoriaOptions() {
  const { data } = useCategorias();
  return useMemo(() => {
    const byId = new Map(data?.map((c) => [c.id, c]));
    return (data ?? [])
      .filter((c) => c.status === 'ATIVO')
      .map((c) => {
        const pai = c.categoriaPaiId ? byId.get(c.categoriaPaiId) : undefined;
        return { value: c.id, label: pai ? `${pai.nome} / ${c.nome}` : c.nome };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);
}

export function useTecnicoOptions() {
  const { data } = useTecnicos();
  return useMemo(() => (data ?? []).map((t) => ({ value: t.id, label: t.nome })), [data]);
}

export function useGrupoOptions() {
  const { data } = useGrupos();
  return useMemo(() => (data ?? []).filter((g) => g.status === 'ATIVO').map((g) => ({ value: g.id, label: g.nome })), [data]);
}

export function useDepartamentoOptions() {
  const { data } = useDepartamentos();
  return useMemo(() => (data ?? []).map((d) => ({ value: d.id, label: `${d.sigla} · ${d.nome}` })), [data]);
}

export function useUsuarioOptions() {
  const { data } = useUsuarios();
  return useMemo(
    () =>
      (data ?? [])
        .filter((u) => u.status === 'ATIVO')
        .map((u) => ({ value: u.id, label: u.nome }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [data],
  );
}

// ---------- Mutations ----------
/** Alterações em usuários afetam técnicos (atribuição), gestores e contagem por departamento. */
const DEPENDENTES_USUARIO = [cadastrosKeys.usuarios, cadastrosKeys.tecnicos, cadastrosKeys.departamentos];

export const useCreateUsuario = () =>
  useApiMutation({ mutationFn: (i: UsuarioInput) => usuariosService.create(i), invalidate: DEPENDENTES_USUARIO, successMessage: 'Usuário cadastrado com sucesso.' });
export const useUpdateUsuario = (successMessage = 'Usuário atualizado.') =>
  useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: UsuarioUpdate }) => usuariosService.update(id, input),
    invalidate: DEPENDENTES_USUARIO,
    successMessage,
  });
export const useCreateDepartamento = () =>
  useApiMutation({ mutationFn: (i: DepartamentoInput) => departamentosService.create(i), invalidate: [cadastrosKeys.departamentos], successMessage: 'Departamento criado.' });
export const useCreateCategoria = () =>
  useApiMutation({ mutationFn: (i: CategoriaInput) => categoriasService.create(i), invalidate: [cadastrosKeys.categorias], successMessage: 'Categoria salva.' });
export const useCreateGrupo = () =>
  useApiMutation({ mutationFn: (i: GrupoInput) => gruposService.create(i), invalidate: [cadastrosKeys.grupos], successMessage: 'Grupo criado.' });
export const useAddMembro = () =>
  useApiMutation({ mutationFn: (i: MembroInput) => gruposService.addMembro(i), invalidate: [cadastrosKeys.grupos], successMessage: 'Técnico adicionado ao grupo.' });
