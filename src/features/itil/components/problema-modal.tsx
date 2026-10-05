'use client';

import { useState } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { textoInvalido } from '@/lib/validation';
import type { ProblemaInput } from '@/types';
import { PRIORIDADE_OPTIONS } from '@/features/chamados/components/chamado-badges';
import { useCriarProblema } from '../use-itil';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Chamado de origem: o problema nasce vinculado a ele, com título e descrição sugeridos. */
  chamado?: { id: number; titulo: string; descricao: string };
}

const vazio = (chamado?: Props['chamado']): ProblemaInput => ({
  titulo: chamado?.titulo ?? '',
  descricao: chamado?.descricao ?? '',
  prioridade: 'MEDIA',
  causaRaiz: '',
  solucaoContorno: '',
});

export function ProblemaModal({ open, onClose, chamado }: Props) {
  const [form, setForm] = useState<ProblemaInput>(() => vazio(chamado));
  const [tocado, setTocado] = useState(false);
  const set = <K extends keyof ProblemaInput>(k: K, v: ProblemaInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function fechar() {
    setForm(vazio(chamado));
    setTocado(false);
    onClose();
  }

  const criar = useCriarProblema(fechar);
  const erros = {
    titulo: textoInvalido(form.titulo, { rotulo: 'O título', min: 5, max: 150 }),
    descricao: textoInvalido(form.descricao, { rotulo: 'A descrição', min: 10, max: 2000 }),
  };
  const valido = !erros.titulo && !erros.descricao;

  function salvar() {
    setTocado(true);
    if (valido) criar.mutate({ ...form, chamadoId: chamado?.id });
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      size="lg"
      title="Registrar problema"
      description={
        chamado
          ? `O problema ficará vinculado ao chamado #${chamado.id} para investigação da causa raiz.`
          : 'Use para investigar a causa raiz de incidentes recorrentes ou de grande impacto.'
      }
      footer={
        <>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button loading={criar.isPending} onClick={salvar}>
            Registrar problema
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Título" required error={tocado ? erros.titulo : undefined}>
          {(id) => <Input id={id} value={form.titulo} maxLength={150} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Lentidão recorrente no ERP às segundas" />}
        </Field>
        <Field label="Prioridade" required>
          {(id) => <Select id={id} options={PRIORIDADE_OPTIONS} value={form.prioridade} onChange={(e) => set('prioridade', e.target.value as ProblemaInput['prioridade'])} />}
        </Field>
      </div>
      <div className="mt-4 space-y-4">
        <Field label="Descrição" required error={tocado ? erros.descricao : undefined} hint="Sintomas, serviços afetados e frequência.">
          {(id) => <Textarea id={id} value={form.descricao} maxLength={2000} onChange={(e) => set('descricao', e.target.value)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Causa raiz (se já conhecida)">
            {(id) => <Textarea id={id} value={form.causaRaiz} maxLength={2000} onChange={(e) => set('causaRaiz', e.target.value)} className="min-h-[88px]" />}
          </Field>
          <Field label="Solução de contorno" hint="Paliativo que os técnicos podem aplicar enquanto a causa é tratada.">
            {(id) => <Textarea id={id} value={form.solucaoContorno} maxLength={2000} onChange={(e) => set('solucaoContorno', e.target.value)} className="min-h-[88px]" />}
          </Field>
        </div>
      </div>
    </Modal>
  );
}
