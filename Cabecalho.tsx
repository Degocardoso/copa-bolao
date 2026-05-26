'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Dispara a sincronização de resultados em segundo plano ao abrir a página.
// A rota respeita um cache de 60s, então várias visitas não sobrecarregam a API.
// Se algum placar foi atualizado, recarrega os dados da página.
export default function DispararSync() {
  const router = useRouter();
  const jaRodou = useRef(false);

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;
    fetch('/api/sync-resultados')
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d?.cache === false) router.refresh();
      })
      .catch(() => {});
  }, [router]);

  return null;
}
