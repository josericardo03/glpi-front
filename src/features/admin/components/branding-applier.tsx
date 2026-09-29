'use client';

import { useEffect } from 'react';
import { HEX_RE, hexToChannels, shadeChannels } from '@/lib/color';
import type { Branding } from '@/types';
import { useBranding } from '../use-admin';

type Paleta = Pick<Branding, 'corPrimaria' | 'corSecundaria' | 'corDestaque' | 'corFundo'>;

/** Converte a paleta HEX do tenant nas variáveis CSS consumidas pelas cores `brand-*` do Tailwind. */
export function brandingVars(b: Paleta): Record<string, string> {
  const entries: [string, string, (h: string) => string][] = [
    ['--brand-primary', b.corPrimaria, hexToChannels],
    ['--brand-primary-hover', b.corPrimaria, (h) => shadeChannels(h, -0.18)],
    ['--brand-darker', b.corSecundaria, hexToChannels],
    ['--brand-dark', b.corSecundaria, (h) => shadeChannels(h, 0.1)],
    ['--brand-accent', b.corDestaque, hexToChannels],
    ['--brand-bg', b.corFundo, hexToChannels],
  ];
  return Object.fromEntries(entries.filter(([, hex]) => HEX_RE.test(hex)).map(([name, hex, fn]) => [name, fn(hex)]));
}

/** Aplica a paleta do tenant (GET /api/branding) globalmente. */
export function BrandingApplier() {
  const { data } = useBranding();
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement.style;
    Object.entries(brandingVars(data)).forEach(([k, v]) => root.setProperty(k, v));
  }, [data]);
  return null;
}
