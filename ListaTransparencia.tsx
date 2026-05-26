'use client';

import { useState } from 'react';
import { importarJogadores } from './acoes';

export default function BotaoJogadores() {
  const [carregando, setCarregando] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; msg: string } | null>(null);

  async function importar() {
    setCarregando(true);
    setRes(null);
    try {
      const r = await importarJogadores();
      setRes(r as { ok: boolean; msg: string });
    } catch {
      setRes({ ok: false, msg: 'Falha inesperada. Tente de novo.' });
    }
    setCarregando(false);
  }

  return (
    <div>
      <p className="exp">
        Importa a lista de jogadores das seleções (via API-Football) para a tela de
        Craques. A lista completa de convocados sai perto da Copa. Requer a variável
        <b> API_FOOTBALL_KEY</b> configurada na Vercel.
      </p>
      <button className="btn btn-gold" onClick={importar} disabled={carregando}>
        {carregando ? 'Importando…' : '👤 Importar jogadores'}
      </button>
      {res && (
        <div className={`res ${res.ok ? 'ok' : 'erro'}`}>{res.ok ? '✅ ' : '⚠️ '}{res.msg}</div>
      )}
      <style jsx>{`
        .exp { font-size: 13px; color: var(--text-dim); line-height: 1.5; margin-bottom: 12px; }
        .exp b { color: var(--text); font-family: 'Space Grotesk', monospace; font-size: 12px; }
        .res { margin-top: 12px; padding: 11px 14px; border-radius: 10px; font-size: 13px; }
        .res.ok { background: rgba(29,185,84,0.14); border: 1px solid var(--grass-bright); color: var(--grass-bright); }
        .res.erro { background: rgba(255,91,91,0.13); border: 1px solid var(--red); color: #ffd5d5; }
      `}</style>
    </div>
  );
}
