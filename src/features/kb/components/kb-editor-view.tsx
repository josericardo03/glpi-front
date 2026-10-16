'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { FolderPlus, Save } from 'lucide-react';
import { Button, Callout, Card, CardBody, CardHeader, ErrorState, Field, Input, PageHeader, PageLoader, Select } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import type { KbArtigo, StatusArtigoKb } from '@/types';
import { contarPalavras } from '../documento';
import { altDeArquivo, caminhoImagem } from '../imagem';
import { kbService } from '../kb.service';
import { useAtualizarArtigoKb, useCriarArtigoKb, useKbArtigo, useKbCategorias } from '../use-kb';
import { KbCategoriaModal } from './kb-categoria-modal';
import { RichEditor } from './rich-editor';
import { STATUS_ARTIGO } from './kb-status';

const STATUS_NOVO: StatusArtigoKb[] = ['PUBLICADO', 'REVISAO', 'RASCUNHO'];
const STATUS_EDICAO: StatusArtigoKb[] = [...STATUS_NOVO, 'ARQUIVADO'];

type Erros = Partial<Record<'titulo' | 'conteudo' | 'categoria', string>>;

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
  const aoSalvar = (r: { id: number }) => router.push(`/kb/artigos/${r.id}`);
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
    if (!artigo) router.replace(`/kb/artigos/${id}/editar`);
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
                    id={fid}
                    inicial={artigo?.conteudoMarkdown ?? ''}
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
            <Button variant="outline" size="lg" className="w-full" onClick={() => router.push(voltar)}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      <KbCategoriaModal open={novaCategoria} onClose={() => setNovaCategoria(false)} onCriada={(c) => setCategoriaId(String(c.id))} />
    </form>
  );
}
