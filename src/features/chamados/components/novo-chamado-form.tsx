'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Send, Tag } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  FileDropzone,
  Input,
  PageHeader,
  Select,
  Textarea,
  ToggleGroup,
  useToast,
} from '@/components/ui';
import { formatMinutes } from '@/lib/format';
import { useAuth } from '@/features/auth/auth-provider';
import { usePoliticasSla } from '@/features/admin/use-admin';
import { useCategoriaOptions } from '@/features/cadastros/use-cadastros';
import type { ChamadoInput, Nivel, Origem, TipoChamado } from '@/types';
import { useCreateChamado } from '../hooks/use-chamados';
import { calcularPrioridade } from '../utils/prioridade';
import { PRIORIDADE_META } from './chamado-badges';

const ORIGENS: { value: Origem; label: string }[] = [
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'PORTAL', label: 'Portal' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'CHAT', label: 'Chat' },
];
const IMPACTOS = [
  { value: 'BAIXO', label: 'Baixo (Usuário único)' },
  { value: 'MEDIO', label: 'Médio (Departamento)' },
  { value: 'ALTO', label: 'Alto (Empresa toda)' },
];
const URGENCIAS = [
  { value: 'BAIXO', label: 'Baixa' },
  { value: 'MEDIO', label: 'Média' },
  { value: 'ALTO', label: 'Alta' },
];

type Errors = Partial<Record<'titulo' | 'descricao' | 'categoriaId', string>>;

export function NovoChamadoForm() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const categorias = useCategoriaOptions();
  const create = useCreateChamado();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoChamado>('INCIDENTE');
  const [origem, setOrigem] = useState<Origem>('PORTAL');
  const [categoriaId, setCategoriaId] = useState('');
  const [impacto, setImpacto] = useState<Nivel>('BAIXO');
  const [urgencia, setUrgencia] = useState<Nivel>('BAIXO');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});

  const prioridade = calcularPrioridade(impacto, urgencia);
  const { data: politicas } = usePoliticasSla();
  const metaSolucao = politicas?.find((p) => p.prioridade === prioridade)?.tempoSolucaoMin;

  function validate(): Errors {
    const e: Errors = {};
    if (titulo.trim().length < 5) e.titulo = 'Informe um título com pelo menos 5 caracteres.';
    if (descricao.trim().length < 10) e.descricao = 'Descreva o problema com mais detalhes.';
    if (!categoriaId) e.categoriaId = 'Selecione uma categoria.';
    return e;
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Campos obrigatórios marcados com * precisam ser preenchidos.');
      return;
    }
    const input: ChamadoInput = {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tipo,
      origem,
      impacto,
      urgencia,
      categoriaId: Number(categoriaId),
      solicitanteId: user?.id ?? 0,
      grupoId: null,
      tecnicoId: null,
    };
    create.mutate({ input, arquivos }, { onSuccess: (c) => router.push(`/chamados/${c.id}`) });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader title="Novo Ticket" description="Registre um incidente ou requisição de serviço." breadcrumbs={[{ label: 'Chamados', href: '/chamados' }, { label: 'Novo' }]} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-5">
              <Field label="Título do Chamado" required error={errors.titulo}>
                {(id) => <Input id={id} placeholder="Resumo curto e objetivo do problema ou solicitação" value={titulo} onChange={(e) => setTitulo(e.target.value)} invalid={!!errors.titulo} maxLength={255} />}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Tipo</p>
                  <ToggleGroup
                    aria-label="Tipo do chamado"
                    value={tipo}
                    onChange={setTipo}
                    className="w-full"
                    options={[
                      { value: 'INCIDENTE', label: 'Incidente' },
                      { value: 'REQUISICAO', label: 'Requisição' },
                    ]}
                  />
                </div>
                <Field label="Origem">
                  {(id) => <Select id={id} options={ORIGENS} value={origem} onChange={(e) => setOrigem(e.target.value as Origem)} />}
                </Field>
              </div>
              <Field label="Descrição Detalhada" required error={errors.descricao}>
                {(id) => (
                  <Textarea
                    id={id}
                    className="min-h-[180px]"
                    placeholder="Descreva os detalhes técnicos, passos para reproduzir ou justificativa da solicitação..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    invalid={!!errors.descricao}
                  />
                )}
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Anexos" />
            <CardBody>
              <FileDropzone files={arquivos} onChange={setArquivos} accept={['.pdf', '.png', '.jpg', '.jpeg', '.zip']} onError={toast.error} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Classificação" icon={<Tag className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              <Field label="Solicitante" hint="O chamado é aberto em nome do usuário logado.">
                {(id) => <Input id={id} value={user?.nome ?? ''} disabled />}
              </Field>
              <Field label="Categoria" required error={errors.categoriaId}>
                {(id) => <Select id={id} placeholder="Selecione uma categoria..." options={categorias} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} invalid={!!errors.categoriaId} />}
              </Field>
              <Field label="Impacto">
                {(id) => <Select id={id} options={IMPACTOS} value={impacto} onChange={(e) => setImpacto(e.target.value as Nivel)} />}
              </Field>
              <Field label="Urgência">
                {(id) => <Select id={id} options={URGENCIAS} value={urgencia} onChange={(e) => setUrgencia(e.target.value as Nivel)} />}
              </Field>
              <div className="rounded-md bg-brand-darker p-4 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Prioridade calculada</p>
                  <span className="rounded bg-brand-primary px-2 py-0.5 text-sm font-bold uppercase">{PRIORIDADE_META[prioridade].label}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Definida automaticamente pela matriz Impacto × Urgência.{' '}
                  {metaSolucao !== undefined ? (
                    <>
                      Meta de solução: <strong className="text-slate-200">{formatMinutes(metaSolucao)}</strong>.
                    </>
                  ) : (
                    'Nenhuma política de SLA cadastrada para esta prioridade.'
                  )}
                </p>
              </div>
            </CardBody>
          </Card>

          <div className="space-y-2">
            <Button type="submit" size="lg" className="w-full" loading={create.isPending} icon={<Send className="h-4 w-4" />}>
              Abrir Chamado
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => router.back()}>
              Descartar
            </Button>
            <p className="text-center text-xs text-brand-muted">Campos obrigatórios marcados com *</p>
          </div>
        </div>
      </div>
    </form>
  );
}
