'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FolderPlus, Save } from 'lucide-react';
import { Button, Callout, Card, CardBody, CardHeader, ErrorState, Field, Input, PageHeader, PageLoader, Select, useToast } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import type { KbArtigo, StatusArtigoKb } from '@/types';
import { contarPalavras } from '../documento';
import { altDeArquivo, caminhoImagem } from '../imagem';
import { kbService } from '../kb.service';
import { kbKeys, useAtualizarArtigoKb, useCriarArtigoKb, useKbArtigo, useKbCategorias } from '../use-kb';
import { AnexosArtigo } from './anexos-artigo';
import { KbCategoriaModal } from './kb-categoria-modal';
import { RichEditor } from './rich-editor';
import { STATUS_ARTIGO } from './kb-status';

const STATUS_NOVO: StatusArtigoKb[] = ['PUBLICADO', 'REVISAO', 'RASCUNHO'];
const STATUS_EDICAO: StatusArtigoKb[] = [...STATUS_NOVO, 'ARQUIVADO'];

type Erros = Partial<Record<'titulo' | 'conteudo' | 'categoria', string>>;

/* ---------------------- Rascunho local (neste navegador) ---------------------- */

interface RascunhoLocal {
  titulo: string;
  conteudo: string;
  categoriaId: string;
  status: StatusArtigoKb;
  salvoEm: string;
}

const chaveRascunho = (id?: number) => `itsm_kb_rascunho_${id ?? 'novo'}`;
/** Marca o artigo criado só para guardar uma imagem, que pode ser descartado se o usuário desistir. */
const chaveAuto = (id: number) => `itsm_kb_auto_${id}`;

function lerRascunho(chave: string): RascunhoLocal | null {
  try {
    const r = JSON.parse(localStorage.getItem(chave) ?? 'null') as RascunhoLocal | null;
    return r && typeof r.titulo === 'string' && typeof r.conteudo === 'string' && typeof r.salvoEm === 'string' ? r : null;
  } catch {
    return null;
  }
}
function gravarRascunho(chave: string, r: RascunhoLocal) {
  try {
    localStorage.setItem(chave, JSON.stringify(r));
  } catch {
    // sem espaço ou armazenamento bloqueado: o rascunho local é só uma garantia extra
  }
}
function apagarRascunho(chave: string) {
  try {
    localStorage.removeItem(chave);
  } catch {
    // idem
  }
}

/** Sem `id`, cria um artigo; com `id`, carrega o artigo e edita via PATCH. */
export function KbEditorView({ id }: { id?: number }) {
  const artigo = useKbArtigo(id ?? 0);
  if (!id) return <EditorForm />;
  if (artigo.isLoading) return <PageLoader />;
  if (artigo.isError || !artigo.data) return <ErrorState message={getErrorMessage(artigo.error)} onRetry={artigo.refetch} />;
  return <EditorForm key={artigo.data.id} artigo={artigo.data} />;
}

function EditorForm({ artigo }: { artigo?: KbArtigo }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: categorias, isLoading: carregandoCategorias } = useKbCategorias();
  const [titulo, setTitulo] = useState(artigo?.titulo ?? '');
  const [conteudo, setConteudo] = useState(artigo?.conteudoMarkdown ?? '');
  const [categoriaId, setCategoriaId] = useState(artigo ? String(artigo.categoriaId) : '');
  const [status, setStatus] = useState<StatusArtigoKb>(artigo?.status ?? 'PUBLICADO');
  const [novaCategoria, setNovaCategoria] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [idCriado, setIdCriado] = useState<number | undefined>(artigo?.id);
  const idRef = useRef(artigo?.id);
  const tituloRef = useRef(titulo);
  const conteudoRef = useRef(conteudo);
  const categoriaRef = useRef(categoriaId);
  tituloRef.current = titulo;
  conteudoRef.current = conteudo;
  categoriaRef.current = categoriaId;

  const idAtual = idCriado ?? artigo?.id;

  const chave = chaveRascunho(artigo?.id);
  const original = {
    titulo: artigo?.titulo ?? '',
    conteudo: (artigo?.conteudoMarkdown ?? '').trim(),
    categoriaId: artigo ? String(artigo.categoriaId) : '',
    status: artigo?.status ?? 'PUBLICADO',
  };
  const sujo = titulo !== original.titulo || conteudo.trim() !== original.conteudo || categoriaId !== original.categoriaId || status !== original.status;
  const salvou = useRef(false);
  const [pendente, setPendente] = useState<RascunhoLocal | null>(null);
  const [editorInicial, setEditorInicial] = useState(artigo?.conteudoMarkdown ?? '');
  const [versaoEditor, setVersaoEditor] = useState(0);

  // Ao abrir: há um rascunho local mais novo que o artigo salvo?
  useEffect(() => {
    const r = lerRascunho(chave);
    if (!r) return;
    const diferente = r.titulo !== original.titulo || r.conteudo.trim() !== original.conteudo;
    const maisNovo = !artigo || new Date(r.salvoEm) > new Date(artigo.atualizadoEm);
    if (diferente && maisNovo) setPendente(r);
    else apagarRascunho(chave);
    // só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enquanto edita: guarda uma cópia local a cada pausa na digitação.
  useEffect(() => {
    if (pendente || salvou.current) return;
    const espera = setTimeout(() => {
      if (sujo) gravarRascunho(chave, { titulo, conteudo, categoriaId, status, salvoEm: new Date().toISOString() });
      else apagarRascunho(chave);
    }, 800);
    return () => clearTimeout(espera);
  }, [titulo, conteudo, categoriaId, status, pendente, sujo, chave]);

  // Fechar ou recarregar a aba com alterações não salvas pede confirmação.
  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => {
      if (salvou.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sujo]);

  function restaurarRascunho() {
    if (!pendente) return;
    setTitulo(pendente.titulo);
    setConteudo(pendente.conteudo);
    setCategoriaId(pendente.categoriaId);
    setStatus(pendente.status);
    setEditorInicial(pendente.conteudo);
    setVersaoEditor((v) => v + 1);
    setPendente(null);
  }

  function descartarRascunhoLocal() {
    apagarRascunho(chave);
    setPendente(null);
  }

  const aoSalvar = (r: { id: number }) => {
    salvou.current = true;
    apagarRascunho(chave);
    apagarRascunho(chaveRascunho(undefined));
    try {
      sessionStorage.removeItem(chaveAuto(r.id));
    } catch {
      // idem
    }
    router.push(`/kb/artigos/${r.id}`);
  };
  const criar = useCriarArtigoKb(aoSalvar);
  const atualizar = useAtualizarArtigoKb(idAtual ?? 0, aoSalvar);
  const salvando = criar.isPending || atualizar.isPending;

  function guardarId(id: number) {
    idRef.current = id;
    setIdCriado(id);
  }

  /** A API só recebe a imagem num artigo que já tem id. O título e a categoria bastam para criá-lo na hora. */
  function antesDaImagem() {
    const e: Erros = {};
    const t = tituloRef.current.trim();
    if (t.length < 5) e.titulo = 'Informe um título com pelo menos 5 caracteres.';
    else if (t.length > 255) e.titulo = 'O título deve ter no máximo 255 caracteres.';
    if (!categoriaRef.current) e.categoria = 'Selecione uma categoria.';
    setErros((atual) => ({ ...atual, ...e, ...(t.length >= 5 && t.length <= 255 ? { titulo: undefined } : {}), ...(categoriaRef.current ? { categoria: undefined } : {}) }));
    return Object.keys(e).length === 0;
  }

  async function garantirArtigo() {
    if (idRef.current) return idRef.current;
    const texto = conteudoRef.current.trim();
    const tituloAtual = tituloRef.current.trim();
    const criado = await kbService.criarArtigo({
      categoriaId: Number(categoriaRef.current),
      titulo: tituloAtual,
      conteudo: texto.length >= 3 ? texto : tituloAtual,
      status: 'RASCUNHO',
    });
    guardarId(criado.id);
    try {
      sessionStorage.setItem(chaveAuto(criado.id), '1');
    } catch {
      // sem sessionStorage o rascunho só não será oferecido para descarte
    }
    return criado.id;
  }

  async function enviarImagem(file: File) {
    const id = await garantirArtigo();
    const img = await kbService.enviarImagem(id, file);
    return { href: caminhoImagem(id, img.id), alt: altDeArquivo(img.nome_arquivo) };
  }

  async function aoInserirImagem(markdown: string) {
    const id = idRef.current;
    if (!id) return;
    const texto = markdown.trim();
    setConteudo(markdown);
    conteudoRef.current = markdown;
    await kbService.atualizarArtigo(id, {
      categoriaId: Number(categoriaRef.current),
      titulo: tituloRef.current.trim(),
      conteudo: texto.length >= 3 ? texto : tituloRef.current.trim(),
      status: artigo?.status ?? 'RASCUNHO',
    });
    if (!artigo) {
      // O texto já está no servidor: a cópia local do artigo novo deixa de valer.
      apagarRascunho(chaveRascunho(undefined));
      router.replace(`/kb/artigos/${id}/editar`);
    }
    else void queryClient.invalidateQueries({ queryKey: kbKeys.artigo(id) });
  }

  function validar(): Erros {
    const e: Erros = {};
    const t = titulo.trim();
    if (t.length < 5) e.titulo = 'Informe um título com pelo menos 5 caracteres.';
    else if (t.length > 255) e.titulo = 'O título deve ter no máximo 255 caracteres.';
    if (conteudo.trim().length < 30) e.conteudo = 'Escreva um conteúdo com pelo menos 30 caracteres.';
    if (!categoriaId) e.categoria = 'Selecione uma categoria.';
    return e;
  }

  function salvar(ev: FormEvent) {
    ev.preventDefault();
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) return;
    const input = { categoriaId: Number(categoriaId), titulo, conteudo, status };
    if (idAtual) atualizar.mutate(input);
    else criar.mutate(input);
  }

  /** Sai do editor; se o rascunho só existe por causa de uma imagem enviada, oferece descartá-lo. */
  async function cancelar() {
    let automatico = false;
    try {
      automatico = !!idAtual && sessionStorage.getItem(chaveAuto(idAtual)) === '1' && (!artigo || artigo.status === 'RASCUNHO');
    } catch {
      automatico = false;
    }
    if (idAtual && automatico && window.confirm('Este rascunho foi criado automaticamente quando você enviou uma imagem e ainda não foi salvo por você. Descartá-lo?')) {
      try {
        await kbService.removerRascunho(idAtual);
        sessionStorage.removeItem(chaveAuto(idAtual));
        salvou.current = true;
        apagarRascunho(chave);
        apagarRascunho(chaveRascunho(undefined));
        await queryClient.invalidateQueries({ queryKey: kbKeys.all });
        router.push('/kb');
        return;
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    }
    router.push(voltar);
  }

  const palavras = contarPalavras(conteudo);
  const opcoesStatus = (idAtual ? STATUS_EDICAO : STATUS_NOVO).map((s) => ({ value: s, label: STATUS_ARTIGO[s].label }));
  const voltar = idAtual ? `/kb/artigos/${idAtual}` : '/kb';
  const rotuloSalvar = status === 'PUBLICADO' && artigo?.status !== 'PUBLICADO' ? 'Publicar artigo' : idAtual ? 'Salvar alterações' : 'Salvar artigo';

  return (
    <form onSubmit={salvar} noValidate>
      <PageHeader
        title={artigo ? 'Editar Artigo' : 'Novo Artigo'}
        description="Escreva como em um documento. A formatação e a imagem ficam nos botões."
        breadcrumbs={[
          { label: 'Base de Conhecimento', href: '/kb' },
          ...(artigo ? [{ label: artigo.titulo, href: voltar }, { label: 'Editar' }] : [{ label: 'Novo artigo' }]),
        ]}
      />

      {pendente && (
        <Callout tone="warning" title="Há um rascunho não salvo neste navegador" className="mb-6">
          <p>Salvo localmente em {new Date(pendente.salvoEm).toLocaleString('pt-BR')}. Deseja continuar de onde parou?</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" onClick={restaurarRascunho}>
              Restaurar rascunho
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={descartarRascunhoLocal}>
              Descartar
            </Button>
          </div>
        </Callout>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardBody className="space-y-4">
            <Field label="Título" required error={erros.titulo}>
              {(fid) => <Input id={fid} value={titulo} maxLength={255} onChange={(e) => setTitulo(e.target.value)} invalid={!!erros.titulo} placeholder="Ex.: Como configurar a impressora do 3º andar" />}
            </Field>
            <div>
              <Field label="Conteúdo" required error={erros.conteudo}>
                {(fid) => (
                  <RichEditor
                    key={versaoEditor}
                    id={fid}
                    inicial={editorInicial}
                    onChange={setConteudo}
                    invalid={!!erros.conteudo}
                    antesDaImagem={antesDaImagem}
                    enviarImagem={enviarImagem}
                    aoInserirImagem={aoInserirImagem}
                  />
                )}
              </Field>
              <p className="mt-2 text-right text-xs text-brand-muted">
                {palavras} {palavras === 1 ? 'palavra' : 'palavras'} · cerca de {Math.max(1, Math.round(palavras / 200))} min de leitura
              </p>
            </div>
            {artigo && <AnexosArtigo artigoId={artigo.id} imagens={artigo.imagens} pdfs={artigo.pdfs} podeEditar texto={conteudo} />}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Publicação" />
            <CardBody className="space-y-4">
              <div>
                <Field label="Categoria" required error={erros.categoria}>
                  {(fid) => (
                    <Select
                      id={fid}
                      placeholder={carregandoCategorias ? 'Carregando...' : categorias?.length ? 'Selecione...' : 'Nenhuma categoria; crie uma abaixo'}
                      options={(categorias ?? []).map((c) => ({ value: String(c.id), label: c.nome }))}
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value)}
                      invalid={!!erros.categoria}
                    />
                  )}
                </Field>
                <Button variant="ghost" size="sm" className="mt-1.5" icon={<FolderPlus className="h-4 w-4" />} onClick={() => setNovaCategoria(true)}>
                  Nova categoria
                </Button>
              </div>
              <Field label="Status" hint={STATUS_ARTIGO[status].descricao}>
                {(fid) => <Select id={fid} options={opcoesStatus} value={status} onChange={(e) => setStatus(e.target.value as StatusArtigoKb)} />}
              </Field>
              {status !== 'PUBLICADO' && (
                <Callout tone="info">
                  Artigos fora do status Publicado não aparecem para os solicitantes. Você os encontra em “Artigos em elaboração”, na página da base de conhecimento.
                </Callout>
              )}
            </CardBody>
          </Card>

          <div className="space-y-2">
            <Button type="submit" size="lg" className="w-full" loading={salvando} icon={<Save className="h-4 w-4" />}>
              {rotuloSalvar}
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => void cancelar()}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      <KbCategoriaModal open={novaCategoria} onClose={() => setNovaCategoria(false)} onCriada={(c) => setCategoriaId(String(c.id))} />
    </form>
  );
}
