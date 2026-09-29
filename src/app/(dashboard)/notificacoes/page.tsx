import type { Metadata } from 'next';
import { NotificacoesView } from '@/features/notificacoes/notificacoes-view';

export const metadata: Metadata = { title: 'Notificações' };

export default function NotificacoesPage() {
  return <NotificacoesView />;
}
