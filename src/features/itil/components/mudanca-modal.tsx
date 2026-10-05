'use client';

import { useState } from 'react';
import { Button, Field, Input, Modal, Textarea, ToggleGroup } from '@/components/ui';
import { textoInvalido } from '@/lib/validation';
import type { TipoMudanca } from '@/types';
import { TIPO_MUDANCA } from '../status';
import { useCriarMudanca } from '../use-itil';

interface Props {
  open: boolean;
  onClose: () => void;
  chamado?: { id: number; titulo: string };
}

interface Form {
  titulo: string;
  tipo: TipoMudanca;
  descricao: string;
  justificativa: string;
  planoImpacto: string;
  planoTestes: string;
  planoRetorno: string;
  /** Valores de `<input type="datetime-local">` (hora local, sem fuso). */
  inicio: string;
  fim: string;
}

const vazio = (chamado?: Props['chamado']): Form => ({
  titulo: chamado ? `Correção definitiva: ${chamado.titulo}`.slice(0, 150) : '',
  tipo: 'NORMAL',
  descricao: '',
  justificativa: '',
  planoImpacto: '',
  planoTestes: '',
  planoRetorno: '',
  inicio: '',
  fim: '',
});

const TIPOS = (Object.keys(TIPO_MUDANCA) as TipoMudanca[]).map((t) => ({ value: t, label: TIPO_MUDANCA[t].label }));

export function MudancaModal({ open, onClose, chamado }: Props) {
  const [form, setForm] = useState<Form>(() => vazio(chamado));
  const [tocado, setTocado] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function fechar() {
    setForm(vazio(chamado));
    setTocado(false);
    onClose();
  }

  const criar = useCriarMudanca(fechar);
  const plano = (v: string, rotulo: string) => textoInvalido(v, { rotulo, min: 10, max: 2000 });
  const erros = {
    titulo: textoInvalido(form.titulo, { rotulo: 'O título', min: 5, max: 150 }),
    descricao: plano(form.descricao, 'A descrição'),
    justificativa: plano(form.justificativa, 'A justificativa'),
    planoImpacto: plano(form.planoImpacto, 'O plano de impacto'),
    planoTestes: plano(form.planoTestes, 'O plano de testes'),
    planoRetorno: plano(form.planoRetorno, 'O plano de retorno'),
    inicio: form.inicio ? undefined : 'Informe o início da janela.',
    fim: !form.fim ? 'Informe o fim da janela.' : form.inicio && form.fim <= form.inicio ? 'O fim precisa ser depois do início.' : undefined,
  };
  const valido = Object.values(erros).every((e) => !e);
  const erro = (k: keyof typeof erros) => (tocado ? erros[k] : undefined);

  function salvar() {
    setTocado(true);
    if (!valido) return;
    const { inicio, fim, ...resto } = form;
    criar.mutate({ ...resto, janelaInicio: new Date(inicio).toISOString(), janelaFim: new Date(fim).toISOString(), chamadoId: chamado?.id });
  }

  const area = (k: 'descricao' | 'justificativa' | 'planoImpacto' | 'planoTestes' | 'planoRetorno', label: string, hint: string) => (
    <Field label={label} required error={erro(k)} hint={hint}>
      {(id) => <Textarea id={id} value={form[k]} maxLength={2000} onChange={(e) => set(k, e.target.value)} className="min-h-[80px]" />}
    </Field>
  );

  return (
    <Modal
      open={open}
      onClose={fechar}
      size="lg"
      title="Nova requisição de mudança"
      description={chamado ? `A mudança ficará vinculada ao chamado #${chamado.id}. Ela nasce como rascunho até ser enviada para aprovação.` : 'A mudança nasce como rascunho até ser enviada para aprovação do CAB.'}
      footer={
        <>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button loading={criar.isPending} onClick={salvar}>
            Registrar mudança
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título" required error={erro('titulo')}>
          {(id) => <Input id={id} value={form.titulo} maxLength={150} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Atualização do firmware dos switches do 2º andar" />}
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-brand-darker">Tipo de mudança</p>
          <ToggleGroup value={form.tipo} onChange={(v) => set('tipo', v)} options={TIPOS} aria-label="Tipo de mudança" />
          <p className="mt-1.5 text-xs text-brand-muted">{TIPO_MUDANCA[form.tipo].descricao}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Início da janela" required error={erro('inicio')}>
            {(id) => <Input id={id} type="datetime-local" value={form.inicio} onChange={(e) => set('inicio', e.target.value)} />}
          </Field>
          <Field label="Fim da janela" required error={erro('fim')}>
            {(id) => <Input id={id} type="datetime-local" value={form.fim} min={form.inicio || undefined} onChange={(e) => set('fim', e.target.value)} />}
          </Field>
        </div>
        {area('descricao', 'Descrição', 'O que será alterado e em quais itens de configuração.')}
        {area('justificativa', 'Justificativa', 'Por que a mudança é necessária e o risco de não fazê-la.')}
        <div className="grid gap-4 sm:grid-cols-3">
          {area('planoImpacto', 'Plano de impacto', 'Serviços e usuários afetados.')}
          {area('planoTestes', 'Plano de testes', 'Como validar o sucesso.')}
          {area('planoRetorno', 'Plano de retorno', 'Rollback se algo der errado.')}
        </div>
      </div>
    </Modal>
  );
}
