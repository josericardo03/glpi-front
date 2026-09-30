/** Regras de validação espelhando os DTOs do backend (class-validator). */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SENHA_MIN = 8;

export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

/** Mensagem de erro para texto obrigatório com limites; `undefined` quando válido. */
export function textoInvalido(v: string, { min = 2, max = 100, rotulo = 'Campo' }: { min?: number; max?: number; rotulo?: string } = {}) {
  const t = v.trim();
  if (t.length < min) return min === 1 ? `${rotulo} é obrigatório.` : `${rotulo} deve ter ao menos ${min} caracteres.`;
  if (t.length > max) return `${rotulo} deve ter no máximo ${max} caracteres.`;
  return undefined;
}

export const senhaInvalida = (v: string) => (v.length < SENHA_MIN ? `A senha deve ter ao menos ${SENHA_MIN} caracteres.` : undefined);

/** `true` quando nenhum campo do mapa de erros tem mensagem. */
export const semErros = (erros: Record<string, string | undefined>) => Object.values(erros).every((e) => !e);
