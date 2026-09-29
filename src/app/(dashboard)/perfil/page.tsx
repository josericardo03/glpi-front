import type { Metadata } from 'next';
import { PerfilView } from '@/features/auth/components/perfil-view';

export const metadata: Metadata = { title: 'Minha Conta' };

export default function PerfilPage() {
  return <PerfilView />;
}
