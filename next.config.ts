import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

// Os dados fictícios (src/mocks) existem só para desenvolvimento sem backend. Um build de produção com
// mocks ligados serviria dados falsos a usuários reais, então exige uma confirmação explícita.
if (USE_MOCKS && process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCKS_IN_PRODUCTION !== 'true') {
  throw new Error(
    'NEXT_PUBLIC_USE_MOCKS=true em build de produção. Use false, ou defina ALLOW_MOCKS_IN_PRODUCTION=true para uma demonstração.',
  );
}

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  reactCompiler: true,
  poweredByHeader: false,
  turbopack: {
    resolveAlias: USE_MOCKS ? {} : { '@/mocks/db': './src/mocks/db.stub.cjs' },
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
