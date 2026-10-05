'use client';

import { useState } from 'react';
import { Button, Field, Input, Modal, Textarea } from '@/components/ui';
import { textoInvalido } from '@/lib/validation';
import type { KbCategoria } from '@/types';
import { useCriarCategoriaKb } from '../use-kb';

interface Props {
  open: boolean;
  onClose: () => void;
  onCriada?: (c: KbCategoria) => void;
}

export function KbCategoriaModal({ open, onClose, onCriada }: Props) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tocado, setTocado] = useState(false);

  function fechar() {
    setNome('');
    setDescricao('');
    setTocado(false);
    onClose();
  }

  const criar = useCriarCategoriaKb((c) => {
    onCriada?.(c);
    fechar();
  });
  const erro = textoInvalido(nome, { rotulo: 'O nome', min: 2, max: 100 });

  function salvar() {
    setTocado(true);
    if (!erro) criar.mutate({ nome, descricao });
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      size="sm"
      title="Nova categoria de conhecimento"
      description="Agrupa artigos por assunto na página inicial da base."
      footer={
        <>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button loading={criar.isPending} onClick={salvar}>
            Criar categoria
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" required error={tocado ? erro : undefined}>
          {(id) => <Input id={id} value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Impressoras" autoFocus />}
        </Field>
        <Field label="Descrição">
          {(id) => <Textarea id={id} value={descricao} maxLength={500} onChange={(e) => setDescricao(e.target.value)} className="min-h-[72px]" />}
        </Field>
      </div>
    </Modal>
  );
}
