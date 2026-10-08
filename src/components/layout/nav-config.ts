import {
  Bell,
  BookOpen,
  Boxes,
  Bug,
  Building2,
  CheckSquare,
  FolderTree,
  GitPullRequestArrow,
  History,
  LayoutDashboard,
  Network,
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
      { label: 'Aprovações', href: '/aprovacoes', icon: CheckSquare },
      { label: 'Problemas', href: '/problemas', icon: Bug, roles: ['TECNICO'] },
      { label: 'Mudanças', href: '/mudancas', icon: GitPullRequestArrow, roles: ['TECNICO'] },
      { label: 'Ativos (CMDB)', href: '/ativos', icon: Boxes, roles: ['ADMIN', 'TECNICO'] },
      { label: 'Mapa de software', href: '/mapa', icon: Network, roles: ['TECNICO'] },
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
      { label: 'Categorias', href: '/categorias', icon: FolderTree, roles: ['GESTOR'] },
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

/** `roles`: exige um dos perfis; `somente`: exibe apenas para estes perfis (sem herança de hierarquia). */
export const TOP_LINKS: { label: string; href: string; roles?: Papel[]; somente?: Papel[] }[] = [
  { label: 'Fila Global', href: '/chamados', roles: ['TECNICO'] },
  { label: 'Meus Chamados', href: '/chamados', somente: ['SOLICITANTE'] },
  { label: 'Triagem', href: '/chamados/triagem', roles: ['TECNICO'] },
  { label: 'Aprovações', href: '/aprovacoes', roles: ['GESTOR'] },
  { label: 'SLA', href: '/admin/sla', roles: ['ADMIN'] },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ROUTE_ROLES: { href: string; roles: Papel[] }[] = [
  ...NAV_SECTIONS.flatMap((s) => s.items).filter((i): i is NavItem & { roles: Papel[] } => !!i.roles),
  { href: '/chamados/triagem', roles: ['TECNICO'] as Papel[] },
  { href: '/kb/artigos/novo', roles: ['TECNICO'] as Papel[] },
].sort((a, b) => b.href.length - a.href.length);

/** Rotas com segmento dinâmico, que não se resolvem por prefixo. */
const ROUTE_PATTERNS: { pattern: RegExp; roles: Papel[] }[] = [{ pattern: /^\/kb\/artigos\/[^/]+\/editar\/?$/, roles: ['TECNICO'] }];

/** Perfis exigidos pela rota (prefixo mais específico); `undefined` = qualquer usuário autenticado. */
export function requiredRoles(pathname: string): Papel[] | undefined {
  return ROUTE_PATTERNS.find((r) => r.pattern.test(pathname))?.roles ?? ROUTE_ROLES.find((r) => isActive(pathname, r.href))?.roles;
}
