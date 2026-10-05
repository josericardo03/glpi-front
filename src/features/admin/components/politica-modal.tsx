'use client';

import { useState } from 'react';
import { Button, Callout, Field, Input, Modal, Select, Switch, ToggleGroup } from '@/components/ui';
import { PRIORIDADE_META } from '@/features/chamados/components/chamado-badges';
import { textoInvalido } from '@/lib/validation';
import type { HorarioComercial, PoliticaSla, PoliticaSlaInput, Prioridade } from '@/types';
import { useCriarPolitica } from '../use-admin';
import { DurationInput } from './duration-input';

const VAZIO = { nome: '', prioridade: 'ALTA' as Prioridade, tipoAlvo: 'INCIDENTE' as PoliticaSlaInput['tipoAlvo'], tempoRespostaMin: 60, tempoSolucaoMin: 480, horarioId: '', ativa: true };

export const nomeHorario = (h: Pick<HorarioComercial, 'id' | 'nome'>) => h.nome ?? `Horário #${h.id}`;

interface Props {
  open: boolean;
  onClose: () => void;
  politicas: PoliticaSla[];
  horarios: HorarioComercial[];
  onCadastrarHorario: () => void;
}

export function PoliticaModal({ open, onClose, politicas, horarios, onCadastrarHorario }: Props) {
  const [form, setForm] = useState(VAZIO);
  const [tentou, setTentou] = useState(false);
  const set = (patch: Partial<typeof VAZIO>) => setForm((f) => ({ ...f, ...patch }));

  function fechar() {
    setForm(VAZIO);
    setTentou(false);
    onClose();
  }

  const criar = useCriarPolitica(fechar);

  const conflito = form.ativa
    ? politicas.find((p) => p.ativa && p.prioridade === form.prioridade && p.tipoAlvo === form.tipoAlvo)
    : undefined;
  const erros = {
    nome: textoInvalido(form.nome, { rotulo: 'O nome', max: 100 }),
    resposta: form.tempoRespostaMin <= 0 ? 'Informe um tempo maior que zero.' : form.tempoRespostaMin >= form.tempoSolucaoMin ? 'Deve ser menor que o tempo de solução.' : undefined,
    solucao: form.tempoSolucaoMin <= 0 ? 'Informe um tempo maior que zero.' : undefined,
    horario: !form.horarioId ? 'Selecione o horário comercial.' : undefined,
  };
  const valido = Object.values(erros).every((e) => !e);

  function salvar() {
    setTentou(true);
    if (!valido) return;
    criar.mutate({
      nome: form.nome.trim(),
      prioridade: form.prioridade,
      tipoAlvo: form.tipoAlvo,
      tempoRespostaMin: form.tempoRespostaMin,
      tempoSolucaoMin: form.tempoSolucaoMin,
      horarioComercialId: Number(form.horarioId),
      ativa: form.ativa,
    });
  }

  const erro = (k: keyof typeof erros) => (tentou ? erros[k] : undefined);

  return (
    <Modal
      open={open}
      onClose={fechar}
      size="lg"
      title="Nova política de SLA"
      description="Define as metas de primeira resposta e solução para uma prioridade e tipo de chamado."
      footer={
        <>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button loading={criar.isPending} onClick={salvar}>
            Criar política
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Nome" required error={erro('nome')}>
          {(id) => <Input id={id} maxLength={100} placeholder="Ex.: Alta - Incidentes" value={form.nome} onChange={(e) => set({ nome: e.target.value })} invalid={!!erro('nome')} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prioridade" required>
            {(id) => (
              <Select
                id={id}
                options={(Object.keys(PRIORIDADE_META) as Prioridade[]).map((p) => ({ value: p, label: PRIORIDADE_META[p].label }))}
                value={form.prioridade}
                onChange={(e) => set({ prioridade: e.target.value as Prioridade })}
              />
            )}
          </Field>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Aplica-se a</p>
            <ToggleGroup
              aria-label="Tipo de chamado"
              value={form.tipoAlvo}
              onChange={(tipoAlvo) => set({ tipoAlvo })}
              className="w-full"
              options={[
                { value: 'INCIDENTE', label: 'Incidentes' },
                { value: 'REQUISICAO', label: 'Requisições' },
                { value: 'AMBOS', label: 'Ambos' },
              ]}
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <DurationInput label="Primeira resposta" required value={form.tempoRespostaMin} onChange={(tempoRespostaMin) => set({ tempoRespostaMin })} error={erro('resposta')} />
          <DurationInput label="Solução" required value={form.tempoSolucaoMin} onChange={(tempoSolucaoMin) => set({ tempoSolucaoMin })} error={erro('solucao')} />
        </div>
        <Field
          label="Horário comercial"
          required
          error={erro('horario')}
          hint={horarios.length ? 'O relógio do SLA só corre dentro dos intervalos deste horário.' : undefined}
        >
          {(id) => (
            <div className="flex gap-2">
              <Select
                id={id}
                className="flex-1"
                placeholder={horarios.length ? 'Selecione...' : 'Nenhum horário cadastrado'}
                options={horarios.map((h) => ({ value: h.id, label: nomeHorario(h) }))}
                value={form.horarioId}
                onChange={(e) => set({ horarioId: e.target.value })}
                invalid={!!erro('horario')}
              />
              <Button
                variant="outline"
                onClick={() => {
                  fechar();
                  onCadastrarHorario();
                }}
              >
                Novo horário
              </Button>
            </div>
          )}
        </Field>
        <div className="rounded-md bg-slate-50 p-3">
          <Switch label="Política ativa" description="Somente políticas ativas são aplicadas a novos chamados." checked={form.ativa} onChange={(ativa) => set({ ativa })} />
        </div>
        {conflito && (
          <Callout tone="warning" title="Já existe uma política ativa equivalente">
            &quot;{conflito.nome}&quot; já cobre esta prioridade e tipo. A API recusa duas políticas ativas iguais; crie esta como inativa ou ajuste o tipo.
          </Callout>
        )}
      </div>
    </Modal>
  );
}
