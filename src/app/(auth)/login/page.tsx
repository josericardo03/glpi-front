import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Globe, ShieldCheck, ShieldHalf, BadgeCheck } from 'lucide-react';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4 md:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-brand-border bg-white shadow-pop md:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-darker p-10 text-white md:flex">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-2xl bg-brand-dark" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-2xl bg-brand-dark/70" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary">
                <ShieldHalf className="h-5 w-5" />
              </span>
              <span className="text-2xl font-bold">Portal ITSM</span>
            </div>
            <h1 className="mt-12 text-3xl font-bold leading-tight text-slate-100">
              Excelência operacional e gestão inteligente para sua TI.
            </h1>
            <p className="mt-4 max-w-sm text-sm text-slate-400">
              Acesse a plataforma de gerenciamento de serviços para monitorar chamados, ativos e níveis de serviço em tempo real.
            </p>
          </div>
          <div className="relative flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600 bg-brand-dark">
              <BadgeCheck className="h-5 w-5 text-brand-accent" />
            </span>
            <div>
              <p className="text-sm font-semibold">Sistema Monitorado</p>
              <p className="text-xs text-slate-400">ISO/IEC 20000 Compliance</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center p-8 md:p-14">
          <h2 className="text-xl font-semibold text-brand-darker">Bem-vindo de volta</h2>
          <p className="mb-8 mt-1 text-sm text-brand-muted">Identifique-se para acessar o painel de controle.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
          <div className="mt-8 border-t border-brand-border pt-6 text-center">
            <p className="text-sm text-brand-muted">
              Precisa de ajuda? <a className="font-semibold text-brand-primary hover:underline" href="mailto:servicedesk@portal-itsm.com.br">Contatar Central de Serviços</a>
            </p>
            <div className="mt-4 flex justify-center gap-4 text-brand-muted">
              <ShieldCheck className="h-4 w-4" />
              <Globe className="h-4 w-4" />
              <ShieldHalf className="h-4 w-4" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
