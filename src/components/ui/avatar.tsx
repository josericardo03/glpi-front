'use client';

import { useState } from 'react';
import { cn, initials } from '@/lib/utils';

const PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-violet-100 text-violet-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-slate-200 text-slate-800',
  'bg-rose-100 text-rose-800',
];

function colorFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-2xl' };

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ name, src, size = 'sm', className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-white',
        SIZES[size],
        !showImage && colorFor(name),
        className,
      )}
      title={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" onError={() => setFailedSrc(src)} />
      ) : (
        <>
          <span aria-hidden>{initials(name)}</span>
          <span className="sr-only">{name}</span>
        </>
      )}
    </span>
  );
}

export function AvatarGroup({ names, max = 3, size = 'sm' }: { names: string[]; max?: number; size?: keyof typeof SIZES }) {
  const extra = names.length - max;
  return (
    <div className="flex -space-x-2">
      {names.slice(0, max).map((n) => (
        <Avatar key={n} name={n} size={size} />
      ))}
      {extra > 0 && (
        <span
          className={cn('inline-flex items-center justify-center rounded-full bg-slate-100 font-semibold text-brand-muted ring-2 ring-white', SIZES[size])}
          title={names.slice(max).join(', ')}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

export function UserCell({ name, subtitle, src }: { name: string; subtitle?: string; src?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} src={src} />
      <div className="min-w-0">
        <p className="truncate font-medium text-brand-darker">{name}</p>
        {subtitle && <p className="truncate text-xs text-brand-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
