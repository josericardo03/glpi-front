/** Limite do backend para `POST /chamados/:id/anexos`. */
export const ANEXO_MAX_MB = 20;
export const ANEXO_MAX_BYTES = ANEXO_MAX_MB * 1024 * 1024;
export const ANEXO_EXTENSOES = ['.pdf', '.png', '.jpg', '.jpeg', '.zip', '.txt', '.log'];
