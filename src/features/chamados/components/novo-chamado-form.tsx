'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Bold, Image as ImageIcon, Italic, Link2, List, Send, Tag, UserCog } from 'lucide-react';
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
import { useCategoriaOptions, useGrupoOptions, useTecnicos, useUsuarioOptions } from '@/features/cadastros/use-cadastros';
import type { ChamadoInput, Nivel, Origem, TipoChamado } from '@/types';
import { useCreateChamado } from '../hooks/use-chamados';
import { calcularPrioridade, SLA_SOLUCAO_MIN } from '../utils/prioridade';
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

type Errors = Partial<Record<'titulo' | 'descricao' | 'categoriaId' | 'solicitanteId', string>>;

export function NovoChamadoForm() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const categorias = useCategoriaOptions();
  const grupos = useGrupoOptions();
  const usuarios = useUsuarioOptions();
  const { data: tecnicos } = useTecnicos();
  const create = useCreateChamado();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoChamado>('INCIDENTE');
  const [origem, setOrigem] = useState<Origem>('TELEFONE');
  const [solicitanteId, setSolicitanteId] = useState(user ? String(user.id) : '');
  const [categoriaId, setCategoriaId] = useState('');
  const [impacto, setImpacto] = useState<Nivel>('BAIXO');
  const [urgencia, setUrgencia] = useState<Nivel>('BAIXO');
  const [grupoId, setGrupoId] = useState('1');
  const [tecnicoId, setTecnicoId] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});

  const prioridade = calcularPrioridade(impacto, urgencia);
  const tecnicosDoGrupo = (tecnicos ?? []).filter((t) => !grupoId || t.grupoId === Number(grupoId)).map((t) => ({ value: t.id, label: t.nome }));

  function validate(): Errors {
    const e: Errors = {};
    if (titulo.trim().length < 5) e.titulo = 'Informe um título com pelo menos 5 caracteres.';
    if (descricao.trim().length < 10) e.descricao = 'Descreva o problema com mais detalhes.';
    if (!categoriaId) e.categoriaId = 'Selecione uma categoria.';
    if (!solicitanteId) e.solicitanteId = 'Selecione o solicitante.';
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
      solicitanteId: Number(solicitanteId),
      grupoId: grupoId ? Number(grupoId) : null,
      tecnicoId: tecnicoId ? Number(tecnicoId) : null,
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
                {(id) => <Input id={id} placeholder="Resumo curto e objetivo do problema ou solicitação" value={titulo} onChange={(e) => setTitulo(e.target.value)} invalid={!!errors.titulo} maxLength={150} />}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Tipo</p>
                  <ToggleGroup
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
                  <div className="overflow-hidden rounded-md border border-brand-border focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/20">
                    <div className="flex gap-1 border-b border-brand-border bg-slate-50 px-2 py-1.5 text-brand-muted">
                      {[Bold, Italic, List, Link2, ImageIcon].map((Icon, i) => (
                        <button key={i} type="button" className="rounded p-1.5 hover:bg-slate-200 hover:text-brand-darker" tabIndex={-1}>
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      id={id}
                      className="min-h-[180px] rounded-none border-0 focus:ring-0"
                      placeholder="Descreva os detalhes técnicos, passos para reproduzir ou justificativa da solicitação..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                    />
                  </div>
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
              <Field label="Solicitante" required error={errors.solicitanteId}>
                {(id) => <Select id={id} placeholder="Buscar usuário..." options={usuarios} value={solicitanteId} onChange={(e) => setSolicitanteId(e.target.value)} invalid={!!errors.solicitanteId} />}
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
                  Definida automaticamente pela matriz Impacto × Urgência. Meta de solução: <strong className="text-slate-200">{formatMinutes(SLA_SOLUCAO_MIN[prioridade])}</strong>.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Atribuição" icon={<UserCog className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              <Field label="Grupo Técnico">
                {(id) => (
                  <Select
                    id={id}
                    placeholder="Sem grupo"
                    options={grupos}
                    value={grupoId}
                    onChange={(e) => {
                      setGrupoId(e.target.value);
                      setTecnicoId('');
                    }}
                  />
                )}
              </Field>
              <Field label="Técnico Específico">
                {(id) => <Select id={id} placeholder="Atribuir automaticamente" options={tecnicosDoGrupo} value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} />}
              </Field>
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
