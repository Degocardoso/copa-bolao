'use client';

import { useState, useMemo } from 'react';
import Bandeira from '@/components/Bandeira';
import { criarJogadorManual, apagarJogadorManual, importarJogadoresTxt } from './acoes';

type Jogador = { id: number; nome: string; time_nome: string | null; bandeira: string | null };
type Time = { nome: string; bandeira: string | null };

export default function GestaoJogadores({
  jogadores,
  times,
}: {
  jogadores: Jogador[];
  times: Time[];
}) {
  const [nome, setNome] = useState('');
  const [timeNome, setTimeNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  // mapa de bandeira por nome de seleção (pra preencher automaticamente)
  const bandeiraPorTime = useMemo(() => {
    const m = new Map<string, string>();
    times.forEach((t) => { if (t.bandeira) m.set(t.nome, t.bandeira); });
    return m;
  }, [times]);

  // agrupa jogadores por seleção (pra listar bonito)
  const porSelecao = useMemo(() => {
    const m = new Map<string, Jogador[]>();
    jogadores.forEach((j) => {
      const sel = j.time_nome || 'Outros';
      if (!m.has(sel)) m.set(sel, []);
      m.get(sel)!.push(j);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [jogadores]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !timeNome) {
      setMsg({ ok: false, texto: 'Preencha o nome e escolha a seleção.' });
      return;
    }
    setSalvando(true);
    setMsg(null);
    const fd = new FormData();
    fd.set('nome', nome.trim());
    fd.set('time_nome', timeNome);
    fd.set('bandeira', bandeiraPorTime.get(timeNome) || '');
    try {
      const r = await criarJogadorManual(fd);
      setMsg({ ok: r.ok, texto: r.msg });
      if (r.ok) setNome(''); // limpa só o nome, mantém a seleção pra adicionar vários do mesmo time
    } catch {
      setMsg({ ok: false, texto: 'Falha inesperada. Tente de novo.' });
    }
    setSalvando(false);
  }

  return (
    <div>
      <p className="exp">
        Enquanto a API não tem os convocados oficiais (saem em 1º/jun), você pode
        cadastrar manualmente os principais candidatos a artilheiro/assistência.
        Não precisa todos — só os craques que valem a pena (uns 30-50).
      </p>

      <form onSubmit={adicionar} className="form">
        <input
          className="inp inp-nome"
          placeholder="Nome do jogador"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={salvando}
        />
        <select
          className="inp inp-sel"
          value={timeNome}
          onChange={(e) => setTimeNome(e.target.value)}
          disabled={salvando}
        >
          <option value="">— Seleção —</option>
          {times.map((t) => (
            <option key={t.nome} value={t.nome}>{t.nome}</option>
          ))}
        </select>
        <button className="btn btn-primary" disabled={salvando}>
          {salvando ? '…' : '➕ Adicionar'}
        </button>
      </form>

      {msg && <div className={`msg ${msg.ok ? 'ok' : 'erro'}`}>{msg.ok ? '✅ ' : '⚠️ '}{msg.texto}</div>}

      <ImportarTxt />

      {jogadores.length === 0 ? (
        <p className="vazio">Nenhum jogador cadastrado ainda.</p>
      ) : (
        <div className="lista">
          <div className="lista-tit">{jogadores.length} jogador(es) cadastrado(s):</div>
          {porSelecao.map(([sel, js]) => (
            <div key={sel} className="grupo">
              <div className="grupo-tit">
                <Bandeira emoji={js[0]?.bandeira} tamanho={14} />
                <span>{sel}</span>
                <span className="grupo-cont">{js.length}</span>
              </div>
              <div className="chips">
                {js.map((j) => (
                  <form action={apagarJogadorManual} key={j.id} className="chip">
                    <input type="hidden" name="id" value={j.id} />
                    <span>{j.nome}</span>
                    {j.id < 0 && (
                      <button className="chip-x" title="Remover" type="submit">✕</button>
                    )}
                    {j.id >= 0 && <span className="chip-api" title="Veio da API">API</span>}
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .exp { font-size: 13px; color: var(--text-dim); line-height: 1.5; margin-bottom: 14px; }
        .form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .inp {
          background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px;
          padding: 11px 13px; color: var(--text); font-size: 14px;
        }
        .inp:focus { outline: none; border-color: var(--grass-bright); }
        .inp-nome { flex: 2; min-width: 160px; }
        .inp-sel { flex: 1; min-width: 140px; }
        .msg { margin-top: 12px; padding: 10px 13px; border-radius: 10px; font-size: 13px; }
        .msg.ok { background: rgba(29,185,84,0.14); border: 1px solid var(--grass-bright); color: var(--grass-bright); }
        .msg.erro { background: rgba(255,91,91,0.13); border: 1px solid var(--red); color: #ffd5d5; }
        .vazio { color: var(--text-faint); font-size: 13px; margin-top: 16px; }
        .lista { margin-top: 18px; }
        .lista-tit {
          font-size: 12px; color: var(--text-dim); margin-bottom: 10px;
          text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;
        }
        .grupo { margin-bottom: 14px; }
        .grupo-tit {
          display: flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 7px;
        }
        .grupo-cont { font-size: 11px; color: var(--text-faint); font-weight: 600; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 999px; padding: 5px 8px 5px 12px; font-size: 12.5px;
        }
        .chip-x {
          background: transparent; border: none; color: var(--red);
          font-size: 12px; padding: 1px 4px; border-radius: 5px; cursor: pointer;
        }
        .chip-x:hover { background: rgba(255,91,91,0.12); }
        .chip-api {
          background: rgba(244,196,48,0.16); color: var(--gold);
          padding: 1px 7px; border-radius: 5px; font-size: 9px; font-weight: 800;
        }
      `}</style>
    </div>
  );
}

// Bloco expansível: colar várias linhas e importar de uma vez
function ImportarTxt() {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function importar() {
    if (!texto.trim()) { setMsg({ ok: false, texto: 'Cole a lista primeiro.' }); return; }
    setSalvando(true);
    setMsg(null);
    const fd = new FormData();
    fd.set('texto', texto);
    try {
      const r = await importarJogadoresTxt(fd);
      setMsg({ ok: r.ok, texto: r.msg });
      if (r.ok) setTexto('');
    } catch {
      setMsg({ ok: false, texto: 'Falha inesperada. Tente de novo.' });
    }
    setSalvando(false);
  }

  return (
    <div className="bloco-txt">
      <button className="bt-tit" onClick={() => setAberto(!aberto)}>
        <span>📋 Importar vários de uma vez (colar TXT)</span>
        <span className={`bt-seta ${aberto ? 'g' : ''}`}>▾</span>
      </button>
      {aberto && (
        <div className="bt-corpo">
          <p className="bt-exp">
            Cole uma linha por jogador no formato <code>Nome ; Seleção</code>.
            Linhas com # no início (comentários) e vazias são ignoradas.
            A seleção precisa estar cadastrada (mesmo nome dos times importados).
          </p>
          <textarea
            className="bt-area"
            rows={8}
            placeholder="Vinícius Júnior ; Brasil&#10;Kylian Mbappé ; França&#10;Lamine Yamal ; Espanha"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={salvando}
          />
          <button className="btn btn-primary" onClick={importar} disabled={salvando}>
            {salvando ? 'Importando…' : '📥 Importar lista'}
          </button>
          {msg && <div className={`msg ${msg.ok ? 'ok' : 'erro'}`} style={{ marginTop: 10 }}>{msg.ok ? '✅ ' : '⚠️ '}{msg.texto}</div>}
        </div>
      )}
      <style jsx>{`
        .bloco-txt {
          margin: 14px 0; background: var(--panel); border: 1px solid var(--line);
          border-radius: 11px; overflow: hidden;
        }
        .bt-tit {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          padding: 12px 14px; background: transparent; border: none; color: var(--text);
          font-size: 13.5px; font-weight: 700; cursor: pointer;
        }
        .bt-seta { color: var(--text-dim); transition: transform 0.2s; }
        .bt-seta.g { transform: rotate(180deg); }
        .bt-corpo { padding: 0 14px 14px; }
        .bt-exp { font-size: 12px; color: var(--text-dim); line-height: 1.55; margin-bottom: 10px; }
        .bt-exp code {
          background: var(--bg-2); padding: 1px 6px; border-radius: 4px;
          font-family: 'Space Grotesk', monospace; font-size: 11px; color: var(--text);
        }
        .bt-area {
          width: 100%; background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 9px; padding: 10px 12px; color: var(--text);
          font-family: 'Space Grotesk', monospace; font-size: 13px; line-height: 1.5;
          margin-bottom: 10px; resize: vertical; min-height: 140px;
        }
        .bt-area:focus { outline: none; border-color: var(--grass-bright); }
      `}</style>
    </div>
  );
}
