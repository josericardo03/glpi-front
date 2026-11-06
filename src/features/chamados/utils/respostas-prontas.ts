/** Textos que o técnico reaproveita nos comentários. As próprias ficam salvas só neste navegador. */

export interface RespostaPronta {
  id: string;
  titulo: string;
  texto: string;
  propria?: boolean;
}

export const RESPOSTAS_PADRAO: RespostaPronta[] = [
  {
    id: 'padrao-recebido',
    titulo: 'Chamado recebido',
    texto: 'Olá! Recebemos o seu chamado e já estamos analisando. Retornaremos assim que tivermos novidades.',
  },
  {
    id: 'padrao-mais-informacoes',
    titulo: 'Pedir mais informações',
    texto: 'Para avançarmos, pode nos informar: 1) quando o problema começou; 2) se aparece alguma mensagem de erro (um print ajuda); 3) se acontece em outros equipamentos?',
  },
  {
    id: 'padrao-reiniciar',
    titulo: 'Pedir reinício do equipamento',
    texto: 'Poderia reiniciar o equipamento e nos avisar se o problema continua? Se continuar, seguimos com a análise.',
  },
  {
    id: 'padrao-resolvido',
    titulo: 'Solução aplicada',
    texto: 'Aplicamos a solução e o problema deve estar resolvido. Confirme, por favor, se está tudo funcionando para encerrarmos o chamado.',
  },
];

const chave = (userId: number) => `itsm_respostas_${userId}`;

export function carregarRespostasPropias(userId: number): RespostaPronta[] {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(chave(userId)) ?? '[]');
    if (!Array.isArray(bruto)) return [];
    return bruto
      .filter((r): r is RespostaPronta => !!r && typeof r.id === 'string' && typeof r.titulo === 'string' && typeof r.texto === 'string')
      .map((r) => ({ id: r.id, titulo: r.titulo, texto: r.texto, propria: true }));
  } catch {
    return [];
  }
}

/** Devolve `false` quando o navegador não permite gravar (modo privado, cota cheia). */
export function salvarRespostasPropias(userId: number, respostas: RespostaPronta[]): boolean {
  try {
    localStorage.setItem(chave(userId), JSON.stringify(respostas.map(({ id, titulo, texto }) => ({ id, titulo, texto }))));
    return true;
  } catch {
    return false;
  }
}

/** Título curto tirado do início do texto, para a resposta salva pelo técnico. */
export const tituloDaResposta = (texto: string) => {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length > 40 ? `${limpo.slice(0, 37)}...` : limpo;
};
