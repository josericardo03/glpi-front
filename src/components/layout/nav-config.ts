import {
  Bell,
  BookOpen,
  Boxes,
  Building2,
  CheckSquare,
  FolderTree,
  History,
  LayoutDashboard,
  Palette,
  PieChart,
  Plug,
  Building,
  Ticket,
  Timer,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { Papel } from '@/types';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: Papel[];
  /** Rotas adicionais que também ativam o item. */
  match?: string[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Chamados', href: '/chamados', icon: Ticket },
      { label: 'Aprovações', href: '/aprovacoes', icon: CheckSquare, roles: ['ADMIN', 'GESTOR'] },
      { label: 'Ativos (CMDB)', href: '/ativos', icon: Boxes, roles: ['ADMIN', 'TECNICO'] },
      { label: 'Base de Conhecimento', href: '/kb', icon: BookOpen },
      { label: 'Notificações', href: '/notificacoes', icon: Bell },
      { label: 'Relatórios', href: '/relatorios', icon: PieChart, roles: ['ADMIN', 'GESTOR'] },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { label: 'Usuários', href: '/usuarios', icon: Users, roles: ['ADMIN', 'GESTOR'] },
      { label: 'Departamentos', href: '/departamentos', icon: Building2, roles: ['ADMIN', 'GESTOR'] },
      { label: 'Categorias', href: '/categorias', icon: FolderTree, roles: ['ADMIN'] },
      { label: 'Equipes de Suporte', href: '/grupos', icon: UsersRound, roles: ['ADMIN', 'GESTOR'] },
    ],
  },
  {
    title: 'Administração',
    items: [
      { label: 'Regras de SLA', href: '/admin/sla', icon: Timer, roles: ['ADMIN'] },
      { label: 'Branding', href: '/admin/branding', icon: Palette, roles: ['ADMIN'] },
      { label: 'Integrações', href: '/admin/integracoes', icon: Plug, roles: ['ADMIN'] },
      { label: 'Clientes (Tenants)', href: '/admin/clientes', icon: Building, roles: ['ADMIN'] },
      { label: 'Logs de Auditoria', href: '/auditoria', icon: History, roles: ['ADMIN'] },
    ],
  },
];

export const TOP_LINKS = [
  { label: 'Fila Global', href: '/chamados' },
  { label: 'Triagem', href: '/chamados/triagem' },
  { label: 'Aprovações', href: '/aprovacoes' },
  { label: 'SLA', href: '/admin/sla' },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
