'use client';

import { useState, type FormEvent } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { ConfirmModal, Modal } from '@/components/ui/modal';
import type { Mapa } from '../mapa.service';
import { useAtualizarMapa, useCriarMapa, useRemoverMapa } from '../use-mapa';

interface Props {
  mapas: Mapa[];
  /** Mapa que está aberto (ou `null` quando ainda não existe nenhum). */
  atual: Mapa | null;
  onEscolher: (id: number) => void;
}

type Edicao = { modo: 'criar' } | { modo: 'editar'; mapa: Mapa } | null;

/** Barra de topo da tela: escolhe o mapa aberto e cria, renomeia ou apaga mapas. */
export function MapaBarra({ mapas, atual, onEscolher }: Props) {
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [apagando, setApagando] = useState(false);
  const remover = useRemoverMapa();

  const opcoes = mapas.map((m) => ({ value: m.id, label: `${m.nome} (${m.totalLigacoes})` }));

  function confirmarRemocao() {
    if (!atual) return;
    remover.mutate({ id: atual.id, comLigacoes: atual.totalLigacoes > 0 }, { onSuccess: () => setApagando(false) });
  }

  return (
    <>
      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label="Mapa">
              {(id) => (
                <Select
                  id={id}
                  options={opcoes}
                  placeholder={mapas.length ? 'Selecione' : 'Nenhum mapa'}
                  value={atual ? String(atual.id) : ''}
                  onChange={(e) => e.target.value && onEscolher(Number(e.target.value))}
                  disabled={mapas.length === 0}
                />
              )}
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEdicao({ modo: 'criar' })}>
              <Plus className="h-4 w-4" />
              Novo mapa
            </Button>
            <Button type="button" variant="outline" disabled={!atual} onClick={() => atual && setEdicao({ modo: 'editar', mapa: atual })}>
              <Pencil className="h-4 w-4" />
              Renomear
            </Button>
            <Button type="button" variant="danger-outline" disabled={!atual} onClick={() => setApagando(true)}>
              <Trash2 className="h-4 w-4" />
              Apagar
            </Button>
          </div>
          {atual?.descricao && (
            <p className="flex w-full items-center gap-1.5 text-xs text-brand-muted">
              <Layers className="h-3.5 w-3.5 shrink-0" />
              {atual.descricao}
            </p>
          )}
        </CardBody>
      </Card>

      {edicao && <FormularioMapa key={edicao.modo === 'editar' ? edicao.mapa.id : 'novo'} edicao={edicao} onClose={() => setEdicao(null)} onSalvo={onEscolher} />}

      <ConfirmModal
        open={apagando && !!atual}
        onClose={() => setApagando(false)}
        onConfirm={confirmarRemocao}
        loading={remover.isPending}
        title="Apagar mapa"
        confirmLabel="Apagar mapa"
      >
        {atual && (
          <>
            <p>
              Apagar o mapa <strong>{atual.nome}</strong>?
            </p>
            {atual.totalLigacoes > 0 ? (
              <p className="mt-2">
                As <strong>{atual.totalLigacoes}</strong> dependência(s) dele também serão removidas. Os softwares continuam cadastrados.
              </p>
            ) : (
              <p className="mt-2">O mapa está vazio.</p>
            )}
          </>
        )}
      </ConfirmModal>
    </>
  );
}

function FormularioMapa({ edicao, onClose, onSalvo }: { edicao: NonNullable<Edicao>; onClose: () => void; onSalvo: (id: number) => void }) {
  const editando = edicao.modo === 'editar' ? edicao.mapa : null;
  const [nome, setNome] = useState(editando?.nome ?? '');
  const [descricao, setDescricao] = useState(editando?.descricao ?? '');
  const criar = useCriarMapa();
  const atualizar = useAtualizarMapa();
  const salvando = criar.isPending || atualizar.isPending;
  const valido = nome.trim().length >= 2;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    if (editando) {
      atualizar.mutate({ id: editando.id, nome, descricao }, { onSuccess: () => onClose() });
    } else {
      criar.mutate(
        { nome, descricao },
        {
          onSuccess: (novo) => {
            onSalvo(novo.id);
            onClose();
          },
        },
      );
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={editando ? 'Renomear mapa' : 'Novo mapa'}
      description="Cada mapa guarda suas próprias dependências entre softwares."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-mapa" loading={salvando} disabled={!valido}>
            {editando ? 'Salvar' : 'Criar mapa'}
          </Button>
        </>
      }
    >
      <form id="form-mapa" className="space-y-3" onSubmit={enviar}>
        <Field label="Nome" required>
          {(id) => <Input id={id} value={nome} maxLength={100} placeholder="Ex.: Sistema financeiro" onChange={(e) => setNome(e.target.value)} autoFocus required />}
        </Field>
        <Field label="Descrição">
          {(id) => <Textarea id={id} value={descricao} maxLength={500} rows={3} placeholder="Opcional" onChange={(e) => setDescricao(e.target.value)} />}
        </Field>
      </form>
    </Modal>
  );
}
