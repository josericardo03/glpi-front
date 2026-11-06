'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import type { Software } from '../mapa.service';
import { useAtualizarSoftware } from '../use-mapa';
import { SoftwareCombobox } from './software-combobox';

/** Escolhe um software e corrige o nome ou o código de patrimônio sem sair da tela do mapa. */
export function SoftwareEditar({ onClose }: { onClose: () => void }) {
  const [escolhido, setEscolhido] = useState<Software | null>(null);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const atualizar = useAtualizarSoftware();

  const mudou = escolhido != null && (nome.trim() !== escolhido.nome || codigo.trim() !== escolhido.codigo);
  const valido = nome.trim().length >= 2 && codigo.trim().length >= 1;

  function escolher(s: Software | null) {
    setEscolhido(s);
    setNome(s?.nome ?? '');
    setCodigo(s?.codigo ?? '');
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!escolhido || !mudou || !valido) return;
    atualizar.mutate({ id: escolhido.id, nome, codigo }, { onSuccess: () => onClose() });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Editar software"
      description="Corrija o nome ou o código de patrimônio. A mudança vale em todos os mapas."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-software" loading={atualizar.isPending} disabled={!mudou || !valido}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="form-software" className="space-y-3" onSubmit={enviar}>
        <Field label="Software">{(id) => <SoftwareCombobox id={id} valor={escolhido} onChange={escolher} />}</Field>
        <Field label="Nome" required>
          {(id) => <Input id={id} value={nome} maxLength={150} disabled={!escolhido} onChange={(e) => setNome(e.target.value)} />}
        </Field>
        <Field label="Código de patrimônio" required>
          {(id) => <Input id={id} value={codigo} maxLength={50} disabled={!escolhido} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />}
        </Field>
      </form>
    </Modal>
  );
}
