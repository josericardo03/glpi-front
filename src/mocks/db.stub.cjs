// Substitui `@/mocks/db` quando NEXT_PUBLIC_USE_MOCKS !== 'true' (ver next.config.ts): os mocks só são
// lidos dentro de `request()`, que nunca os executa nesse modo. CommonJS para o bundler não exigir cada export.
module.exports = {};
