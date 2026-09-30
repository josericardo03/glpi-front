'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={<AlertTriangle className="h-12 w-12" />}
      title="Algo deu errado ao exibir esta página"
      description="Tente novamente. Se o problema persistir, informe o suporte com o horário do ocorrido."
      action={<Button onClick={retry}>Tentar novamente</Button>}
    />
  );
}
