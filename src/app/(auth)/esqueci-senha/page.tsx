import type { Metadata } from 'next';
import { EsqueciSenhaForm } from '@/features/auth/components/recuperar-senha';

export const metadata: Metadata = { title: 'Esqueci minha senha' };

export default function EsqueciSenhaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4 md:p-8">
      <div className="w-full max-w-md rounded-xl border border-brand-border bg-white p-8 shadow-pop md:p-10">
        <h1 className="text-xl font-semibold text-brand-darker">Esqueci minha senha</h1>
        <div className="mt-6">
          <EsqueciSenhaForm />
        </div>
      </div>
    </main>
  );
}
