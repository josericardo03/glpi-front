'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { getErrorMessage, HTTP_MESSAGES, httpStatus } from '@/lib/api';
import { plural } from '@/lib/format';
import type { AtualizarStatusInput, ChamadoFiltros, ChamadoInput, CsatInput, MotivoPausa, StatusChamado } from '@/types';
import { chamadosService } from '../services/chamados.service';
import { STATUS_ABERTOS, STATUS_FINALIZADOS } from '../utils/transicoes';

const STATUS_KANBAN: StatusChamado[] = [...STATUS_ABERTOS, ...STATUS_FINALIZADOS];

type FiltrosSemPagina = Omit<ChamadoFiltros, 'page' | 'pageSize'>;

const semPagina = ({ page: _p, pageSize: _s, ...f }: ChamadoFiltros): FiltrosSemPagina => f;

export const chamadosKeys = {
  all: ['chamados'] as const,
  list: (f: ChamadoFiltros) => ['chamados', 'list', f] as const,
  indicadores: (f: FiltrosSemPagina) => ['chamados', 'indicadores', f] as const,
  kanban: (f: FiltrosSemPagina) => ['chamados', 'kanban', f] as const,
  triagem: (f: ChamadoFiltros) => ['chamados', 'triagem', f] as const,
  detail: (id: number) => ['chamados', 'detail', id] as const,
};

/** Indicadores derivados de chamados que precisam ser recalculados após qualquer mutação. */
const DERIVADOS = [chamadosKeys.all, ['dashboard'], ['relatorios'], ['aprovacoes']] as const;

/** Uma página da lista; filtros e paginação são aplicados pela API. */
export const useChamados = (f: ChamadoFiltros, enabled = true) =>
  useQuery({ queryKey: chamadosKeys.list(f), queryFn: () => chamadosService.list(f), placeholderData: keepPreviousData, enabled });

export const useTriagem = (f: ChamadoFiltros) =>
  useQuery({ queryKey: chamadosKeys.triagem(f), queryFn: () => chamadosService.triagem(f), placeholderData: keepPreviousData });

/** Status do filtro que também pertencem ao grupo (vazio quando o filtro exclui o grupo inteiro). */
function restringirStatus(f: FiltrosSemPagina, grupo: StatusChamado[]): FiltrosSemPagina {
  return { ...f, status: '', statusIn: f.status ? grupo.filter((s) => s === f.status) : grupo };
}

/** Contagens da fila (em aberto, SLA vencido e finalizados) sobre o filtro atual, via `X-Total-Count`. */
export function useIndicadoresFila(f: ChamadoFiltros) {
  const filtros = semPagina(f);
  return useQuery({
    queryKey: chamadosKeys.indicadores(filtros),
    queryFn: async () => {
      const abertos = restringirStatus(filtros, STATUS_ABERTOS);
      const [emAberto, vencidos, finalizados] = await Promise.all([
        chamadosService.contar(abertos),
        chamadosService.contar({ ...abertos, slaVencido: true }),
        chamadosService.contar(restringirStatus(filtros, STATUS_FINALIZADOS)),
      ]);
      return { emAberto, vencidos, finalizados };
    },
    placeholderData: keepPreviousData,
  });
}

export const KANBAN_POR_COLUNA = 50;

/** Uma consulta por coluna do Kanban, com o total real de cada status. */
export function useKanbanChamados(f: ChamadoFiltros, enabled: boolean) {
  const filtros = semPagina(f);
  return useQuery({
    queryKey: chamadosKeys.kanban(filtros),
    queryFn: async () => {
      const colunas = STATUS_KANBAN.filter((s) => !filtros.status || filtros.status === s);
      const paginas = await Promise.all(
        colunas.map((s) => chamadosService.list({ ...filtros, status: s, statusIn: undefined, page: 1, pageSize: KANBAN_POR_COLUNA })),
      );
      const totais = Object.fromEntries(STATUS_KANBAN.map((s) => [s, 0])) as Record<StatusChamado, number>;
      colunas.forEach((s, i) => (totais[s] = paginas[i]!.total));
      return { chamados: paginas.flatMap((p) => p.data), totais };
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

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
