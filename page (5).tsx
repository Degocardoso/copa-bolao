'use client';

import { useState } from 'react';
import { importarDaCopa } from './acoes';

export default function BotaoImportar({
  ultima,
}: {
  ultima: { qtd_times: number; qtd_jogos: number; quando: string } | null;
}) {
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function rodar() {
    if (
      !confirm(
        'Importar os jogos da Copa 2026?\n\nIsso busca times, jogos, horários e ' +
          'placares já disponíveis e atualiza o que mudou. Jogos que você já tinha ' +
          'não são duplicados. Pode rodar quantas vezes quiser.'
      )
    )
      return;
    setErro(null);
    setMsg(null);
    setCarregando(true);
    try {
      await importarDaCopa();
      setMsg('Importação concluída! A lista de jogos foi atualizada.');
    } catch (e) {
      setErro(
        'Não consegui importar agora. Verifique sua conexão e tente de novo em instantes.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="cx">
      <div className="top">
        <div>
          <div className="tit">🌎 Importar jogos da Copa 2026</div>
          <div className="desc">
            Puxa times, jogos, horários e placares automaticamente — de graça, da base
            pública openfootball. Pode clicar de novo a cada rodada para atualizar.
          </div>
        </div>
        <button className="btn btn-gold" onClick={rodar} disabled={carregando}>
          {carregando ? 'Importando…' : 'Importar agora'}
        </button>
      </div>

      {ultima && (
        <div className="ultima mono">
          última importação: {new Date(ultima.quando).toLocaleString('pt-BR')} ·{' '}
          {ultima.qtd_times} times · {ultima.qtd_jogos} jogos
        </div>
      )}
      {msg && <div className="ok">{msg}</div>}
      {erro && <div className="err">{erro}</div>}

      <div className="nota">
        Dica: enquanto o sorteio dos grupos não sair, os jogos do mata-mata aparecem como
        “a definir” (⏳). Conforme a Copa avança, reimporte para trazer os confrontos e
        placares novos.
      </div>

      <style jsx>{`
        .cx {
          background: linear-gradient(180deg, rgba(244,196,48,0.08), var(--panel));
          border: 1px solid var(--gold-deep);
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 16px;
        }
        .top {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 14px;
        }
        .tit { font-size: 16px; font-weight: 800; margin-bottom: 5px; }
        .desc { font-size: 13px; color: var(--text-dim); line-height: 1.5; max-width: 440px; }
        .btn { white-space: nowrap; }
        .ultima { font-size: 11px; color: var(--text-faint); margin-top: 12px; }
        .ok {
          margin-top: 12px; font-size: 13px; color: var(--grass-bright);
          background: rgba(29,185,84,0.12); border: 1px solid var(--grass-deep);
          border-radius: 10px; padding: 9px 12px;
        }
        .err {
          margin-top: 12px; font-size: 13px; color: #ffd5d5;
          background: rgba(255,91,91,0.12); border: 1px solid var(--red);
          border-radius: 10px; padding: 9px 12px;
        }
        .nota {
          margin-top: 12px; font-size: 11.5px; color: var(--text-faint);
          line-height: 1.5; border-top: 1px solid var(--line); padding-top: 11px;
        }
        @media (max-width: 480px) {
          .top { flex-direction: column; }
          .btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}
