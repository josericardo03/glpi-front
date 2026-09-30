'use client';

import { useEffect, useState } from 'react';
import { Button, Field, Modal, Select, Textarea } from '@/components/ui';
import { useGrupoOptions, useTecnicoOptions } from '@/features/cadastros/use-cadastros';
import { plural } from '@/lib/format';
import type { AtualizarStatusInput, MotivoPausa, StatusChamado } from '@/types';
import { MOTIVOS_PAUSA, STATUS_META } from './chamado-badges';

export type AtribuirModo = 'grupo' | 'tecnico' | 'status';

interface AtribuirModalProps {
  open: boolean;
  modo: AtribuirModo;
  quantidade: number;
  /** Destinos válidos no modo `status` (respeitando a máquina de estados). */
  statusPermitidos?: StatusChamado[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (input: AtualizarStatusInput) => void;
}

const TITLES: Record<AtribuirModo, string> = {
  grupo: 'Atribuir para Grupo',
  tecnico: 'Atribuir para Técnico',
  status: 'Mudar Status',
};

export function AtribuirModal({ open, modo, quantidade, statusPermitidos = [], loading, onClose, onConfirm }: AtribuirModalProps) {
  const grupos = useGrupoOptions();
  const tecnicos = useTecnicoOptions();
  const [value, setValue] = useState('');
  const [motivo, setMotivo] = useState<MotivoPausa>('AGUARDANDO_SOLICITANTE');
  const [resolucao, setResolucao] = useState('');

  useEffect(() => {
    if (!open) return;
    setValue('');
    setMotivo('AGUARDANDO_SOLICITANTE');
    setResolucao('');
  }, [open, modo]);

  const options =
    modo === 'grupo' ? grupos : modo === 'tecnico' ? tecnicos : statusPermitidos.map((s) => ({ value: s, label: STATUS_META[s].label }));
  const status = modo === 'status' ? (value as StatusChamado | '') : '';
  const valido = !!value && (status !== 'RESOLVIDO' || resolucao.trim().length >= 5);

  function confirm() {
    if (!valido) return;
    if (modo === 'grupo') onConfirm({ grupoId: Number(value) });
    else if (modo === 'tecnico') onConfirm({ tecnicoId: Number(value) });
    else
      onConfirm({
        status: status as StatusChamado,
        ...(status === 'PENDENTE' && { motivoPausa: motivo }),
        ...(status === 'RESOLVIDO' && { resolucao: resolucao.trim() }),
      });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={TITLES[modo]}
      description={plural(quantidade, 'chamado selecionado', 'chamados selecionados')}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!valido} loading={loading}>
            Confirmar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label={modo === 'grupo' ? 'Grupo técnico' : modo === 'tecnico' ? 'Técnico' : 'Novo status'}
          required
          hint={modo === 'status' && !options.length ? 'Não há transição comum a todos os chamados selecionados.' : undefined}
        >
          {(id) => <Select id={id} placeholder="Selecione..." options={options} value={value} onChange={(e) => setValue(e.target.value)} disabled={!options.length} />}
        </Field>
        {status === 'PENDENTE' && (
          <Field label="Motivo da pausa" required>
            {(id) => <Select id={id} options={MOTIVOS_PAUSA} value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoPausa)} />}
          </Field>
        )}
        {status === 'RESOLVIDO' && (
          <Field label="Resolução" required hint="Mínimo de 5 caracteres.">
            {(id) => <Textarea id={id} value={resolucao} onChange={(e) => setResolucao(e.target.value)} />}
          </Field>
        )}
      </div>
    </Modal>
  );
}
