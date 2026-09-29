'use client';

import { useEffect, useState } from 'react';
import { Button, Field, Modal, Select } from '@/components/ui';
import { useGrupoOptions, useTecnicoOptions } from '@/features/cadastros/use-cadastros';
import type { AtualizarStatusInput, StatusChamado } from '@/types';
import { STATUS_OPTIONS } from './chamado-badges';

export type AtribuirModo = 'grupo' | 'tecnico' | 'status';

interface AtribuirModalProps {
  open: boolean;
  modo: AtribuirModo;
  quantidade: number;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (input: AtualizarStatusInput) => void;
}

const TITLES: Record<AtribuirModo, string> = {
  grupo: 'Atribuir para Grupo',
  tecnico: 'Atribuir para Técnico',
  status: 'Mudar Status',
};

export function AtribuirModal({ open, modo, quantidade, loading, onClose, onConfirm }: AtribuirModalProps) {
  const grupos = useGrupoOptions();
  const tecnicos = useTecnicoOptions();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue('');
  }, [open, modo]);

  const options = modo === 'grupo' ? grupos : modo === 'tecnico' ? tecnicos : STATUS_OPTIONS;

  function confirm() {
    if (!value) return;
    if (modo === 'grupo') onConfirm({ grupoId: Number(value) });
    else if (modo === 'tecnico') onConfirm({ tecnicoId: Number(value) });
    else onConfirm({ status: value as StatusChamado });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={TITLES[modo]}
      description={`${quantidade} chamado(s) selecionado(s)`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!value} loading={loading}>
            Confirmar
          </Button>
        </>
      }
    >
      <Field label={modo === 'grupo' ? 'Grupo técnico' : modo === 'tecnico' ? 'Técnico' : 'Novo status'} required>
        {(id) => <Select id={id} placeholder="Selecione..." options={options} value={value} onChange={(e) => setValue(e.target.value)} />}
      </Field>
    </Modal>
  );
}
