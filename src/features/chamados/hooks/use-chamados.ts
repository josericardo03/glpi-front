'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { getErrorMessage, HTTP_MESSAGES, httpStatus } from '@/lib/api';
import { plural } from '@/lib/format';
import type { AtualizarStatusInput, ChamadoFiltros, ChamadoInput, CsatInput, MotivoPausa } from '@/types';
import { chamadosService } from '../services/chamados.service';

type FiltrosSemPagina = Omit<ChamadoFiltros, 'page' | 'pageSize'>;

const semPagina = ({ page: _p, pageSize: _s, ...f }: ChamadoFiltros): FiltrosSemPagina => f;

export const chamadosKeys = {
  all: ['chamados'] as const,
  list: (f: FiltrosSemPagina) => ['chamados', 'list', f] as const,
  triagem: (f: FiltrosSemPagina) => ['chamados', 'triagem', f] as const,
  detail: (id: number) => ['chamados', 'detail', id] as const,
};

/** Indicadores derivados de chamados que precisam ser recalculados após qualquer mutação. */
const DERIVADOS = [chamadosKeys.all, ['dashboard'], ['relatorios'], ['aprovacoes']] as const;

/** Lista filtrada completa (a paginação é feita pela tela com `paginate`). */
export const useChamados = (f: ChamadoFiltros, enabled = true) => {
  const filtros = semPagina(f);
  return useQuery({ queryKey: chamadosKeys.list(filtros), queryFn: () => chamadosService.list(filtros), placeholderData: keepPreviousData, enabled });
};

export const useTriagem = (f: ChamadoFiltros) => {
  const filtros = semPagina(f);
  return useQuery({ queryKey: chamadosKeys.triagem(filtros), queryFn: () => chamadosService.triagem(filtros), placeholderData: keepPreviousData });
};

export const useChamado = (id: number) =>
  useQuery({ queryKey: chamadosKeys.detail(id), queryFn: () => chamadosService.get(id), enabled: Number.isInteger(id) && id > 0 });

function erroAbertura(err: unknown) {
  const status = httpStatus(err);
  if (status === 422) return 'Não há política de SLA ativa para a prioridade e o tipo deste chamado. Ajuste impacto/urgência ou acione o administrador.';
  const msg = getErrorMessage(err);
  if (status === 400 && msg === HTTP_MESSAGES[400]) return 'A categoria escolhida não é válida para este tipo de chamado.';
  return msg;
}

/** Cria o chamado e envia os anexos; falhas de upload não desfazem nem duplicam o chamado. */
export function useCreateChamado() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ input, arquivos }: { input: ChamadoInput; arquivos: File[] }) => {
      const chamado = await chamadosService.create(input);
      const uploads = await Promise.allSettled(arquivos.map((f) => chamadosService.uploadAnexo(chamado.id, f)));
      const falhas = arquivos.filter((_, i) => uploads[i]!.status === 'rejected').map((f) => f.name);
      return { id: chamado.id, falhas };
    },
    onSuccess: async ({ id, falhas }) => {
      await Promise.all(DERIVADOS.map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (falhas.length) {
        const naoEnviados = falhas.length === 1 ? 'não foi enviado' : 'não foram enviados';
        toast.info(`Chamado #${id} aberto, mas ${plural(falhas.length, 'anexo', 'anexos')} ${naoEnviados}: ${falhas.join(', ')}. Anexe pelo chamado.`);
      }
      else toast.success(`Chamado #${id} aberto com sucesso.`);
    },
    onError: (err) => toast.error(erroAbertura(err)),
  });
}

export function useAtualizarStatus() {
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: AtualizarStatusInput }) => chamadosService.atualizarStatus(id, input),
    invalidate: [...DERIVADOS],
    successMessage: (_, { id }) => `Chamado #${id} atualizado.`,
  });
}

/** Mesma alteração aplicada a vários chamados, com resumo único de sucesso/falha. */
export function useAtualizarStatusLote() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ ids, input }: { ids: number[]; input: AtualizarStatusInput }) => {
      const r = await Promise.allSettled(ids.map((id) => chamadosService.atualizarStatus(id, input)));
      const erros = r.flatMap((x, i) => (x.status === 'rejected' ? [`#${ids[i]}: ${getErrorMessage(x.reason)}`] : []));
      return { ok: ids.length - erros.length, erros };
    },
    onSuccess: async ({ ok, erros }) => {
      await Promise.all(DERIVADOS.map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (ok) toast.success(`${plural(ok, 'chamado atualizado', 'chamados atualizados')}.`);
      if (erros.length) toast.error(`${plural(erros.length, 'falha', 'falhas')} — ${erros.slice(0, 3).join(' · ')}${erros.length > 3 ? ' …' : ''}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useComentar(id: number) {
  return useApiMutation({
    mutationFn: (body: { conteudo: string; interno: boolean }) => chamadosService.comentar(id, body),
    invalidate: [chamadosKeys.detail(id)],
    successMessage: 'Comentário enviado.',
  });
}

export function usePausar(id: number) {
  return useApiMutation({
    mutationFn: (body: { motivo: MotivoPausa }) => chamadosService.pausar(id, body),
    invalidate: [...DERIVADOS],
    successMessage: 'SLA pausado e chamado pendenciado.',
  });
}

export function useRetomar(id: number) {
  return useApiMutation({
    mutationFn: () => chamadosService.retomar(id),
    invalidate: [...DERIVADOS],
    successMessage: 'Atendimento retomado; o SLA voltou a contar.',
  });
}

export function useVincularAtivo(id: number, onSuccess?: () => void) {
  return useApiMutation({
    mutationFn: (ativo: { id: number; nome: string }) => chamadosService.vincularAtivo(id, ativo.id),
    invalidate: [chamadosKeys.detail(id)],
    successMessage: (_, ativo) => `${ativo.nome} vinculado ao chamado #${id}.`,
    onSuccess,
  });
}

export function useAvaliarChamado(id: number) {
  return useApiMutation({
    mutationFn: (input: Omit<CsatInput, 'chamadoId'>) => chamadosService.avaliar({ ...input, chamadoId: id }),
    invalidate: [chamadosKeys.detail(id), ['relatorios'], ['dashboard']],
    successMessage: (nova) => (nova ? 'Obrigado pela sua avaliação!' : 'Este chamado já havia sido avaliado.'),
  });
}

export function useWorklog(id: number) {
  return useApiMutation({
    mutationFn: (body: { descricao: string; minutos: number }) => chamadosService.registrarWorklog(id, body),
    invalidate: [chamadosKeys.detail(id), ['relatorios']],
    successMessage: 'Worklog registrado.',
  });
}

export function useUploadAnexo(id: number) {
  return useApiMutation({
    mutationFn: (file: File) => chamadosService.uploadAnexo(id, file),
    invalidate: [chamadosKeys.detail(id)],
    successMessage: 'Anexo enviado.',
  });
}
