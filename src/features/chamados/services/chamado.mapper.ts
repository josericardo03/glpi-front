import { byId, lookups } from '@/lib/backend/lookups';
import type { ApiCategoria, ApiChamado, ApiChamadoDetalhe, ApiGrupo, ApiUsuario } from '@/lib/backend/types';
import type { Chamado, ChamadoDetalhe, HistoricoEvento, Nivel, Origem, Prioridade, StatusChamado, TipoChamado } from '@/types';

export interface ChamadoCtx {
  usuarios: Map<number, ApiUsuario>;
  categorias: Map<number, ApiCategoria>;
  grupos: Map<number, ApiGrupo>;
}

export async function loadCtx(): Promise<ChamadoCtx> {
  const [usuarios, categorias, grupos] = await Promise.all([lookups.usuarios(), lookups.categorias(), lookups.grupos()]);
  return { usuarios: byId(usuarios), categorias: byId(categorias), grupos: byId(grupos) };
}

/** A API não persiste impacto/urgência; são inferidos da prioridade para a matriz ITIL. */
const NIVEIS: Record<Prioridade, [Nivel, Nivel]> = {
  CRITICA: ['ALTO', 'ALTO'],
  ALTA: ['ALTO', 'MEDIO'],
  MEDIA: ['MEDIO', 'MEDIO'],
  BAIXA: ['BAIXO', 'BAIXO'],
};

function categoriaNome(id: number, cats: ChamadoCtx['categorias']) {
  const c = cats.get(id);
  if (!c) return `Categoria #${id}`;
  const pai = c.id_categoria_pai ? cats.get(c.id_categoria_pai) : undefined;
  return pai ? `${pai.nome} / ${c.nome}` : c.nome;
}

export function toChamado(c: ApiChamado, ctx: ChamadoCtx): Chamado {
  const prioridade = c.prioridade as Prioridade;
  const [impacto, urgencia] = NIVEIS[prioridade] ?? ['MEDIO', 'MEDIO'];
  const abertura = new Date(c.data_abertura).getTime();
  const prazo = c.data_previsao_resolucao ? new Date(c.data_previsao_resolucao).getTime() : null;
  const referencia = c.data_resolucao ? new Date(c.data_resolucao).getTime() : Date.now();
  const slaTotalMin = prazo ? Math.max(1, Math.round((prazo - abertura) / 60_000)) : 1;
  let slaRestanteMin = prazo ? Math.round((prazo - referencia) / 60_000) : slaTotalMin;
  if (c.sla_vencido && slaRestanteMin >= 0) slaRestanteMin = -1;
  const atualizado = [c.data_fechamento, c.data_resolucao, c.data_abertura].find(Boolean)!;

  return {
    id: c.id,
    titulo: c.titulo,
    descricao: c.descricao,
    tipo: c.tipo as TipoChamado,
    origem: c.origem as Origem,
    status: c.status as StatusChamado,
    prioridade,
    impacto,
    urgencia,
    categoriaId: c.id_categoria,
    categoriaNome: categoriaNome(c.id_categoria, ctx.categorias),
    solicitanteId: c.id_solicitante,
    solicitanteNome: ctx.usuarios.get(c.id_solicitante)?.nome ?? `Usuário #${c.id_solicitante}`,
    grupoId: c.id_grupo_responsavel,
    grupoNome: c.id_grupo_responsavel ? (ctx.grupos.get(c.id_grupo_responsavel)?.nome ?? null) : null,
    tecnicoId: c.id_tecnico_atribuido,
    tecnicoNome: c.id_tecnico_atribuido ? (ctx.usuarios.get(c.id_tecnico_atribuido)?.nome ?? null) : null,
    abertoEm: c.data_abertura,
    atualizadoEm: atualizado,
    prazoSla: c.data_previsao_resolucao ?? c.data_abertura,
    slaRestanteMin,
    slaTotalMin,
    slaPausado: c.status === 'PENDENTE',
  };
}

const PAPEL_LABEL: Record<string, string> = { ADMIN: 'Administrador', GESTOR: 'Gestor', TECNICO: 'Técnico', SOLICITANTE: 'Solicitante' };

export function toChamadoDetalhe(c: ApiChamadoDetalhe, ctx: ChamadoCtx): ChamadoDetalhe {
  const base = toChamado(c, ctx);
  const historico: HistoricoEvento[] = [{ id: 1, descricao: 'Chamado aberto', autor: base.solicitanteNome, criadoEm: c.data_abertura }];
  if (c.data_resolucao) historico.push({ id: 2, descricao: `Resolvido${c.resolucao ? `: ${c.resolucao}` : ''}`, autor: base.tecnicoNome ?? '—', criadoEm: c.data_resolucao });
  if (c.data_fechamento) historico.push({ id: 3, descricao: 'Chamado concluído', autor: '—', criadoEm: c.data_fechamento });
  if (c.tempo_acumulado_pausa_s > 0) {
    historico.push({ id: 4, descricao: `SLA pausado por ${Math.round(c.tempo_acumulado_pausa_s / 60)} min no total`, autor: 'Motor de SLA', criadoEm: c.data_abertura });
  }

  return {
    ...base,
    comentarios: c.comentarios_chamados
      .map((cm) => {
        const autor = ctx.usuarios.get(cm.id_autor);
        return {
          id: cm.id,
          chamadoId: cm.id_chamado,
          autorId: cm.id_autor,
          autorNome: autor?.nome ?? `Usuário #${cm.id_autor}`,
          autorPapel: PAPEL_LABEL[autor?.perfil ?? ''] ?? '',
          conteudo: cm.mensagem,
          interno: cm.tipo_visibilidade === 'INTERNO',
          criadoEm: cm.data_criacao,
        };
      })
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)),
    anexos: c.anexos_chamados.map((a) => ({
      id: a.id,
      chamadoId: a.id_chamado,
      nomeArquivo: a.nome_arquivo,
      tamanhoBytes: a.tamanho_bytes,
      mimeType: a.tipo_mime,
      enviadoPor: '—',
      criadoEm: a.data_upload,
    })),
    worklogs: [],
    pausas: [],
    historico: historico.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)),
  };
}