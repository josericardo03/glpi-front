import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-6xl font-bold text-brand-primary">404</p>
      <h1 className="text-xl font-semibold text-brand-darker">Página não encontrada</h1>
      <p className="text-sm text-brand-muted">O recurso solicitado não existe ou foi movido.</p>
      <Link href="/dashboard" className={buttonVariants({ className: 'mt-3' })}>
        Voltar ao Dashboard
      </Link>
    </main>
  );
}
