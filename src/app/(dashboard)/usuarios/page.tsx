import type { Metadata } from 'next';
import { UsuariosView } from '@/features/cadastros/components/usuarios-view';

export const metadata: Metadata = { title: 'Gestão de Usuários' };

export default function UsuariosPage() {
  return <UsuariosView />;
}
