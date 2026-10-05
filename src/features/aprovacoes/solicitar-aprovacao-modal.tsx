'use client';

import { useMemo, useState } from 'react';
import { Button, Field, Modal, Select, Textarea, ToggleGroup } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useUsuarios } from '@/features/cadastros/use-cadastros';
import { useChamados } from '@/features/chamados/hooks/use-chamados';
import { isFinalizado } from '@/features/chamados/components/chamado-badges';
import { PAPEL_LABEL, perfilPrincipal } from '@/lib/backend/usuario.mapper';
import { textoInvalido } from '@/lib/validation';
import type { AprovacaoInput } from '@/types';
import { useCriarAprovacao, useMudancas } from './use-aprovacoes';

type Origem = 'CHAMADO' | 'MUDANCA';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Quando informado, a solicitação fica presa a este chamado. */
  chamadoId?: number;
}

export function SolicitarAprovacaoModal({ open, onClose, chamadoId }: Props) {
  const { user } = useAuth();
  const [origem, setOrigem] = useState<Origem>('CHAMADO');
  const [alvoId, setAlvoId] = useState('');
  const [aprovadorId, setAprovadorId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tentou, setTentou] = useState(false);

  const fixo = chamadoId !== undefined;
  const { data: usuarios } = useUsuarios();
  const { data: chamados } = useChamados({});
  const { data: mudancas } = useMudancas(open && !fixo && origem === 'MUDANCA');

  const aprovadores = useMemo(
    () =>
      (usuarios ?? [])
        .filter((u) => u.status === 'ATIVO' && u.id !== user?.id && u.papeis.some((p) => p === 'GESTOR' || p === 'ADMIN'))
        .map((u) => ({ value: u.id, label: `${u.nome} · ${PAPEL_LABEL[perfilPrincipal(u.papeis)]}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [usuarios, user?.id],
  );
  const alvos = useMemo(
    () =>
      origem === 'CHAMADO'
        ? (chamados ?? []).filter((c) => !isFinalizado(c.status)).map((c) => ({ value: c.id, label: `#${c.id} · ${c.titulo}` }))
        : (mudancas ?? []).map((m) => ({ value: m.id, label: `#${m.id} · ${m.titulo}` })),
    [origem, chamados, mudancas],
  );

  function fechar() {
    setOrigem('CHAMADO');
    setAlvoId('');
    setAprovadorId('');
    setDescricao('');
    setTentou(false);
    onClose();
  }

  const criar = useCriarAprovacao(fechar);

  const erros = {
    alvo: !fixo && !alvoId ? `Selecione ${origem === 'CHAMADO' ? 'o chamado' : 'a mudança'}.` : undefined,
    aprovador: !aprovadorId ? 'Selecione o aprovador.' : undefined,
    descricao: textoInvalido(descricao, { rotulo: 'A descrição', min: 10, max: 1000 }),
  };
  const valido = !erros.alvo && !erros.aprovador && !erros.descricao;

  function enviar() {
    setTentou(true);
    if (!valido) return;
    const base = { descricao: descricao.trim(), aprovadorId: Number(aprovadorId) };
    const input: AprovacaoInput = fixo
      ? { ...base, chamadoId }
      : origem === 'CHAMADO'
        ? { ...base, chamadoId: Number(alvoId) }
        : { ...base, mudancaId: Number(alvoId) };
    criar.mutate(input);
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Solicitar aprovação"
      description={fixo ? `A solicitação ficará vinculada ao chamado #${chamadoId}.` : 'Envie um chamado ou uma mudança para aprovação de um gestor.'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button loading={criar.isPending} onClick={enviar}>
            Enviar solicitação
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!fixo && (
          <>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Vincular a</p>
              <ToggleGroup
                aria-label="Origem da aprovação"
                value={origem}
                onChange={(o) => {
                  setOrigem(o);
                  setAlvoId('');
                }}
                className="w-full"
                options={[
                  { value: 'CHAMADO', label: 'Chamado' },
                  { value: 'MUDANCA', label: 'Mudança' },
                ]}
              />
            </div>
            <Field label={origem === 'CHAMADO' ? 'Chamado' : 'Mudança'} required error={tentou ? erros.alvo : undefined}>
              {(id) => (
                <Select
                  id={id}
                  placeholder={alvos.length ? 'Selecione...' : 'Nenhum registro disponível'}
                  options={alvos}
                  value={alvoId}
                  onChange={(e) => setAlvoId(e.target.value)}
                  invalid={tentou && !!erros.alvo}
                />
              )}
            </Field>
          </>
        )}
        <Field label="Aprovador" required hint="Somente usuários Gestor ou Administrador." error={tentou ? erros.aprovador : undefined}>
          {(id) => (
            <Select
              id={id}
              placeholder={aprovadores.length ? 'Selecione...' : 'Nenhum gestor disponível'}
              options={aprovadores}
              value={aprovadorId}
              onChange={(e) => setAprovadorId(e.target.value)}
              invalid={tentou && !!erros.aprovador}
            />
          )}
        </Field>
        <Field label="Descrição" required hint="Mínimo de 10 caracteres." error={tentou ? erros.descricao : undefined}>
          {(id) => (
            <Textarea
              id={id}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Explique o que precisa ser aprovado e por quê."
              maxLength={1000}
              invalid={tentou && !!erros.descricao}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}
