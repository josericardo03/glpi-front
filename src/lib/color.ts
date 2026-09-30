export const HEX_RE = /^#[0-9a-f]{6}$/i;

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "#0056B3" -> "0 86 179" (formato consumido pelas variáveis CSS do Tailwind). */
export function hexToChannels(hex: string) {
  return toRgb(hex).join(' ');
}

/**
 * A cor secundária pinta o menu lateral e também o texto padrão sobre fundo claro,
 * por isso precisa de contraste AAA (>= 7:1) com o branco.
 */
export const SECUNDARIA_MIN_CONTRASTE = 7;

/** Razão de contraste WCAG do texto branco sobre a cor (AA exige >= 4.5). */
export function contrastWithWhite(hex: string) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

/** Clareia (amount > 0) ou escurece (amount < 0) uma cor, retornando canais RGB. */
export function shadeChannels(hex: string, amount: number) {
  return toRgb(hex)
    .map((c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount))
    .join(' ');
}
