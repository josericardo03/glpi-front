'use client';

import { useState, type CSSProperties } from 'react';
import { Bell, Eye, ImageIcon, LayoutDashboard, Palette, RotateCcw, Save, Ticket, Trash2 } from 'lucide-react';
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  FileDropzone,
  Input,
  PageHeader,
  PageLoader,
  Select,
  useToast,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { contrastWithWhite, HEX_RE, SECUNDARIA_MIN_CONTRASTE } from '@/lib/color';
import { recursos } from '@/lib/recursos';
import { cn } from '@/lib/utils';
import { textoInvalido } from '@/lib/validation';
import type { Branding } from '@/types';
import { LOGO_URL_MAX, LOGO_URL_RE } from '../admin.service';
import { useBranding, useSalvarBranding } from '../use-admin';
import { brandingVars } from './branding-applier';

const DEFAULT_PALETA = { corPrimaria: '#0056B3', corSecundaria: '#0F172A', corDestaque: '#3B82F6', corFundo: '#F4F6F9' };

const CORES: { key: keyof typeof DEFAULT_PALETA; label: string; hint: string }[] = [
  { key: 'corPrimaria', label: 'Cor Primária', hint: 'Botões e ações principais' },
  { key: 'corSecundaria', label: 'Cor Secundária', hint: 'Menu lateral, cabeçalhos e texto (tom escuro)' },
  { key: 'corDestaque', label: 'Cor de Destaque', hint: 'Foco, links e item ativo' },
  { key: 'corFundo', label: 'Cor de Fundo', hint: 'Plano de fundo das páginas' },
];

const FUSOS = ['America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Recife', 'America/Cuiaba', 'America/Rio_Branco', 'America/Noronha', 'UTC'].map(
  (f) => ({ value: f, label: f.replace('America/', '').replace('_', ' ') + (f === 'UTC' ? '' : ` (${f})`) }),
);

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const valid = HEX_RE.test(value);
  return (
    <Field label={label} hint={hint} error={valid ? undefined : 'Informe um HEX válido (#RRGGBB).'}>
      {(id) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={valid ? value : '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label={`${label} (seletor)`}
            className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-brand-border bg-white p-1"
          />
          <Input id={id} value={value} maxLength={7} invalid={!valid} className="font-mono uppercase" onChange={(e) => onChange(e.target.value.toUpperCase())} />
        </div>
      )}
    </Field>
  );
}

function BrandingPreview({ b }: { b: Branding }) {
  return (
    <div style={brandingVars(b) as CSSProperties} className="overflow-hidden rounded-lg border border-brand-border shadow-pop">
      <div className="flex h-[340px] bg-brand-bg">
        <aside className="flex w-40 shrink-0 flex-col bg-brand-darker p-3 text-slate-300">
          <div className="mb-4 flex items-center gap-2">
            {b.logoUrl ? (
              <img src={b.logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-primary text-[10px] font-bold text-white">IT</span>
            )}
            <span className="truncate text-xs font-bold text-white">{b.nomePortal || 'Portal'}</span>
          </div>
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: Ticket, label: 'Chamados' },
            { icon: Bell, label: 'Notificações' },
          ].map(({ icon: Icon, label, active }) => (
            <span key={label} className={cn('mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-[11px]', active && 'border-l-2 border-brand-accent bg-brand-dark text-white')}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
          ))}
          <span className="mt-auto rounded bg-brand-primary py-1.5 text-center text-[11px] font-semibold text-white">+ Novo Chamado</span>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 items-center justify-between border-b border-brand-border bg-white px-3">
            <span className="h-5 w-32 rounded bg-slate-100" />
            <span className="h-6 w-6 rounded-full bg-brand-dark" />
          </div>
          <div className="space-y-3 p-3">
            <p className="text-sm font-bold text-brand-darker">Visão Geral</p>
            <div className="grid grid-cols-2 gap-2">
              {['Abertos', 'Resolvidos'].map((l, i) => (
                <div key={l} className="rounded-md border border-brand-border bg-white p-2">
                  <p className="text-[9px] font-semibold uppercase text-brand-muted">{l}</p>
                  <p className={cn('text-lg font-bold', i ? 'text-status-resolvido' : 'text-brand-primary')}>{i ? 128 : 42}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-brand-border bg-white">
              <div className="rounded-t-md bg-brand-dark px-2 py-1.5 text-[10px] font-semibold uppercase text-white">Fila de Chamados</div>
              {[1, 2].map((r) => (
                <div key={r} className="flex items-center justify-between border-t border-brand-border px-2 py-1.5 text-[10px]">
                  <span className="font-semibold text-brand-accent">#1024{r}</span>
                  <span className="rounded-full bg-brand-accent/10 px-2 text-brand-accent">Novo</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <span className="rounded bg-brand-primary px-3 py-1.5 text-[11px] font-semibold text-white">Primário</span>
              <span className="rounded border border-brand-primary px-3 py-1.5 text-[11px] font-semibold text-brand-primary">Secundário</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function erroLogo(url: string | null) {
  if (!url || url.startsWith('data:image/')) return undefined;
  if (!LOGO_URL_RE.test(url)) return 'Informe uma URL válida, como https://exemplo.com/logo.png';
  if (url.length > LOGO_URL_MAX) return `Máximo de ${LOGO_URL_MAX} caracteres.`;
  return undefined;
}

export function BrandingView() {
  const { data, isLoading, isError, error, refetch } = useBranding();
  const salvar = useSalvarBranding();
  const toast = useToast();
  const [draft, setDraft] = useState<Branding | null>(null);
  const [logo, setLogo] = useState<File[]>([]);
  const [logoQuebrado, setLogoQuebrado] = useState(false);

  if (isLoading) return <PageLoader />;
  if (isError || !data) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const avancado = recursos.brandingAvancado;
  const cores = avancado ? CORES : CORES.filter((c) => c.key !== 'corDestaque');
  const form = draft ?? data;
  const set = (patch: Partial<Branding>) => setDraft({ ...form, ...patch });
  const paletaValida = cores.every((c) => HEX_RE.test(form[c.key]));
  const contraste = HEX_RE.test(form.corPrimaria) ? contrastWithWhite(form.corPrimaria) : 0;
  const contrasteSecundaria = HEX_RE.test(form.corSecundaria) ? contrastWithWhite(form.corSecundaria) : 0;
  const secundariaClara = contrasteSecundaria > 0 && contrasteSecundaria < SECUNDARIA_MIN_CONTRASTE;
  const erroNome = textoInvalido(form.nomePortal, { rotulo: 'O nome', min: 2, max: 100 });
  const logoErro = avancado ? undefined : erroLogo(form.logoUrl);
  const valido = paletaValida && !secundariaClara && !erroNome && !logoErro;

  function onLogo(files: File[]) {
    setLogo(files);
    setLogoQuebrado(false);
    const file = files[0];
    if (!file) return set({ logoUrl: null });
    const reader = new FileReader();
    reader.onload = () => set({ logoUrl: reader.result as string });
    reader.onerror = () => toast.error('Não foi possível ler o arquivo selecionado.');
    reader.readAsDataURL(file);
  }

  function reset() {
    setDraft(null);
    setLogo([]);
    setLogoQuebrado(false);
  }

  return (
    <>
      <PageHeader
        title="Identidade Visual"
        description="Personalize nome, logotipo e paleta de cores do portal. As mudanças valem para todos os usuários do tenant."
        breadcrumbs={[{ label: 'Administração' }, { label: 'Branding' }]}
        actions={
          <>
            <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} disabled={!draft} onClick={reset}>Descartar</Button>
            <Button
              icon={<Save className="h-4 w-4" />}
              disabled={!draft || !valido}
              loading={salvar.isPending}
              onClick={() => draft && salvar.mutate(draft, { onSuccess: reset })}
            >
              Publicar Alterações
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Informações da Instância" icon={<LayoutDashboard className="h-5 w-5" />} />
            <CardBody className="grid gap-4 md:grid-cols-2">
              <Field label="Nome do Portal" required error={erroNome}>
                {(id) => <Input id={id} value={form.nomePortal} maxLength={100} onChange={(e) => set({ nomePortal: e.target.value })} />}
              </Field>
              {avancado && (
                <Field label="Fuso Horário">
                  {(id) => <Select id={id} options={FUSOS} value={form.fusoHorario} onChange={(e) => set({ fusoHorario: e.target.value })} />}
                </Field>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Logotipo"
              description={avancado ? 'PNG, SVG ou JPG com fundo transparente, até 2MB.' : 'Endereço público (https://) de uma imagem PNG, SVG ou JPG.'}
              icon={<ImageIcon className="h-5 w-5" />}
              actions={
                form.logoUrl && (
                  <Button size="sm" variant="danger-outline" icon={<Trash2 className="h-4 w-4" />} onClick={() => onLogo([])}>
                    Remover
                  </Button>
                )
              }
            />
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-bg">
                {form.logoUrl && !logoQuebrado ? (
                  <img src={form.logoUrl} alt="Logotipo atual" className="max-h-20 max-w-20 object-contain" onError={() => setLogoQuebrado(true)} />
                ) : (
                  <ImageIcon className="h-8 w-8 text-brand-muted" aria-hidden />
                )}
              </div>
              <div className="flex-1">
                {avancado ? (
                  <FileDropzone files={logo} onChange={onLogo} accept={['.png', '.svg', '.jpg', '.jpeg']} maxSizeMb={2} multiple={false} onError={toast.error} />
                ) : (
                  <Field label="URL do logotipo" error={logoErro} hint={logoQuebrado && !logoErro ? 'Não foi possível carregar a imagem deste endereço.' : undefined}>
                    {(id) => (
                      <Input
                        id={id}
                        type="url"
                        inputMode="url"
                        placeholder="https://exemplo.com/logo.png"
                        maxLength={LOGO_URL_MAX}
                        value={form.logoUrl ?? ''}
                        onChange={(e) => {
                          setLogoQuebrado(false);
                          set({ logoUrl: e.target.value.trim() || null });
                        }}
                      />
                    )}
                  </Field>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Paleta de Cores"
              description="Valores HEX aplicados em runtime via variáveis CSS."
              icon={<Palette className="h-5 w-5" />}
              actions={
                <Button size="sm" variant="ghost" onClick={() => set(DEFAULT_PALETA)}>
                  Restaurar padrão
                </Button>
              }
            />
            <CardBody className="grid gap-4 md:grid-cols-2">
              {cores.map((c) => (
                <ColorField key={c.key} label={c.label} hint={c.hint} value={form[c.key]} onChange={(v) => set({ [c.key]: v })} />
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
            <Eye className="h-4 w-4" /> Pré-visualização ao vivo
          </div>
          <BrandingPreview b={form} />
          {contraste > 0 && contraste < 4.5 && (
            <Callout tone="warning" title={`Contraste baixo (${contraste.toFixed(1)}:1)`}>
              Texto branco sobre a cor primária não atinge o mínimo WCAG AA de 4.5:1. Considere um tom mais escuro.
            </Callout>
          )}
          {secundariaClara && (
            <Callout tone="danger" title={`Cor secundária clara demais (${contrasteSecundaria.toFixed(1)}:1)`}>
              A cor secundária é usada no menu lateral e no texto das páginas e precisa de contraste mínimo de{' '}
              {SECUNDARIA_MIN_CONTRASTE}:1. Enquanto isso, o portal mantém o tom padrão.
            </Callout>
          )}
        </div>
      </div>
    </>
  );
}
