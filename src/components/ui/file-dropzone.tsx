'use client';

import { useRef, useState, type DragEvent } from 'react';
import { CloudUpload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format';

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string[];
  maxSizeMb?: number;
  multiple?: boolean;
  hint?: string;
  onError?: (msg: string) => void;
}

export function FileDropzone({
  files,
  onChange,
  accept = ['.pdf', '.png', '.jpg', '.jpeg', '.zip', '.txt', '.log'],
  maxSizeMb = 20,
  multiple = true,
  hint,
  onError,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function add(list: FileList | null) {
    if (!list) return;
    const valid: File[] = [];
    for (const f of Array.from(list)) {
      const ext = `.${f.name.split('.').pop()?.toLowerCase()}`;
      if (!accept.includes(ext)) onError?.(`Formato não permitido: ${f.name}`);
      else if (f.size > maxSizeMb * 1024 * 1024) onError?.(`${f.name} excede o limite de ${maxSizeMb}MB`);
      else valid.push(f);
    }
    onChange(multiple ? [...files, ...valid] : valid.slice(0, 1));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-brand-accent bg-blue-50' : 'border-slate-300 hover:border-brand-accent hover:bg-slate-50',
        )}
      >
        <CloudUpload className="h-8 w-8 text-brand-muted" />
        <p className="text-sm text-brand-darker">
          Arraste arquivos aqui ou <span className="font-semibold text-brand-primary">clique para procurar</span>
        </p>
        <p className="text-[11px] uppercase tracking-wide text-brand-muted">
          {hint ?? `${accept.map((a) => a.slice(1).toUpperCase()).join(', ')} (máx ${maxSizeMb}MB)`}
        </p>
      </button>
      <input ref={inputRef} type="file" hidden multiple={multiple} accept={accept.join(',')} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-md border border-brand-border bg-slate-50 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-brand-primary" />
              <span className="flex-1 truncate text-brand-darker">{f.name}</span>
              <span className="text-xs text-brand-muted">{formatBytes(f.size)}</span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="text-brand-muted hover:text-status-critica" aria-label={`Remover ${f.name}`}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
