'use client';

import { useMemo, useState } from 'react';
import Bandeira from '@/components/Bandeira';
import { salvarCraques, type EscolhaCraque } from './acoes';

type Jogador = { id: number; nome: string; time_nome: string | null; bandeira: string | null };
type PalpiteSalvo = { tipo: string; posicao: number; jogador_id: number | null; qtd: number | null };
type Escolha = { jogadorId: number | null; qtd: number };
type Tipo = 'gols' | 'assist';

export default function TelaCraques({
  jogadores,
  meusPalpites,
  travado,
  primeiroJogo,
}: {
  jogadores: Jogador[];
  meusPalpites: PalpiteSalvo[];
  travado: boolean;
  primeiroJogo: string | null;
}) {
  const [aba, setAba] = useState<Tipo>('gols');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  // seletor aberto: qual posição está escolhendo jogador (ou null)
  const [escolhendo, setEscolhendo] = useState<{ tipo: Tipo; pos: number } | null>(null);

  const jogadorPorId = useMemo(() => {
    const m = new Map<number, Jogador>();
    jogadores.forEach((j) => m.set(j.id, j));
    return m;
  }, [jogadores]);

  // estado dos palpites: gols[1..3], assist[1..3]
  const [escolhas, setEscolhas] = useState<Record<Tipo, Record<number, Escolha>>>(() => {
    const base: Record<Tipo, Record<number, Escolha>> = {
      gols: { 1: { jogadorId: null, qtd: 0 }, 2: { jogadorId: null, qtd: 0 }, 3: { jogadorId: null, qtd: 0 } },
      assist: { 1: { jogadorId: null, qtd: 0 }, 2: { jogadorId: null, qtd: 0 }, 3: { jogadorId: null, qtd: 0 } },
    };
    meusPalpites.forEach((p) => {
      const t = p.tipo as Tipo;
      if (base[t] && (p.posicao === 1 || p.posicao === 2 || p.posicao === 3)) {
        base[t][p.posicao] = { jogadorId: p.jogador_id, qtd: p.qtd ?? 0 };
      }
    });
    return base;
  });

  // jogadores agrupados por seleção (pro seletor expansível)
  const porSelecao = useMemo(() => {
    const m = new Map<string, Jogador[]>();
    jogadores.forEach((j) => {
      const sel = j.time_nome || 'Outros';
      if (!m.has(sel)) m.set(sel, []);
      m.get(sel)!.push(j);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [jogadores]);

  function definirJogador(tipo: Tipo, pos: number, jogadorId: number) {
    setEscolhas((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [pos]: { ...prev[tipo][pos], jogadorId } },
    }));
    setEscolhendo(null);
  }
  function definirQtd(tipo: Tipo, pos: number, qtd: number) {
    setEscolhas((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [pos]: { ...prev[tipo][pos], qtd: Math.max(0, qtd) } },
    }));
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const lista: EscolhaCraque[] = [];
    (['gols', 'assist'] as Tipo[]).forEach((tipo) => {
      for (let pos = 1; pos <= 3; pos++) {
        const e = escolhas[tipo][pos];
        lista.push({ tipo, posicao: pos, jogador_id: e.jogadorId, qtd: e.jogadorId ? e.qtd : null });
      }
    });
    const r = await salvarCraques(lista);
    setSalvando(false);
    setMsg({ ok: r.ok, texto: r.msg });
  }

  const rotulo = aba === 'gols' ? 'gols' : 'assistências';
  const medalhas = ['🥇', '🥈', '🥉'];

  if (jogadores.length === 0) {
    return (
      <div className="card vazio">
        <div style={{ fontSize: 38 }}>👤</div>
        <p>A lista de jogadores ainda não foi carregada.</p>
        <span>O admin precisa importar os jogadores das seleções (sai perto da Copa).</span>
        <style jsx>{`
          .vazio { text-align: center; padding: 36px 20px; color: var(--text-dim); }
          .vazio p { font-weight: 700; color: var(--text); margin: 10px 0 4px; }
          .vazio span { font-size: 13px; }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {/* abas */}
      <div className="abas">
        <button className={`aba ${aba === 'gols' ? 'on' : ''}`} onClick={() => setAba('gols')}>⚽ Artilheiros</button>
        <button className={`aba ${aba === 'assist' ? 'on' : ''}`} onClick={() => setAba('assist')}>🅰️ Assistências</button>
      </div>

      {travado && (
        <div className="trava-aviso">🔒 A Copa já começou — os palpites de craque estão fechados. Você só visualiza.</div>
      )}

      {/* 3 slots */}
      <div className="slots">
        {[1, 2, 3].map((pos) => {
          const e = escolhas[aba][pos];
          const jog = e.jogadorId ? jogadorPorId.get(e.jogadorId) : null;
          return (
            <div key={pos} className="slot">
              <div className="slot-pos">{medalhas[pos - 1]}</div>
              <button className="slot-jog" disabled={travado} onClick={() => setEscolhendo({ tipo: aba, pos })}>
                {jog ? (
                  <>
                    <Bandeira emoji={jog.bandeira} tamanho={16} />
                    <span className="sj-nome">{jog.nome}</span>
                    <span className="sj-sel">{jog.time_nome}</span>
                  </>
                ) : (
                  <span className="sj-vazio">Escolher jogador</span>
                )}
              </button>
              <div className="slot-qtd">
                <button className="q-btn" disabled={travado || !jog} onClick={() => definirQtd(aba, pos, e.qtd - 1)}>−</button>
                <span className="q-num mono">{e.qtd}</span>
                <button className="q-btn" disabled={travado || !jog} onClick={() => definirQtd(aba, pos, e.qtd + 1)}>+</button>
                <span className="q-lbl">{rotulo}</span>
              </div>
            </div>
          );
        })}
      </div>

      {!travado && (
        <button className="btn btn-primary btn-block salvar" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : '💾 Salvar meus palpites de craque'}
        </button>
      )}

      {msg && <div className={`msg ${msg.ok ? 'ok' : 'erro'}`}>{msg.ok ? '✅ ' : '⚠️ '}{msg.texto}</div>}

      <p className="regra-nota">
        Pontuação por lista: jogador na posição certa <b>2pts</b>, com a quantidade exata <b>5pts</b>,
        os 3 na posição <b>8pts</b>, e gabaritar tudo <b>15pts</b>.
      </p>

      {/* seletor de jogador (modal simples) */}
      {escolhendo && (
        <div className="modal" onClick={() => setEscolhendo(null)}>
          <div className="modal-box" onClick={(ev) => ev.stopPropagation()}>
            <div className="modal-head">
              <span>Escolher {escolhendo.pos}º {escolhendo.tipo === 'gols' ? 'artilheiro' : 'garçom'}</span>
              <button className="modal-x" onClick={() => setEscolhendo(null)}>✕</button>
            </div>
            <div className="modal-lista">
              {porSelecao.map(([sel, jogs]) => (
                <SelecaoExpansivel
                  key={sel}
                  selecao={sel}
                  bandeira={jogs[0]?.bandeira || null}
                  jogadores={jogs}
                  onEscolher={(jid) => definirJogador(escolhendo.tipo, escolhendo.pos, jid)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .abas { display: flex; gap: 8px; margin-bottom: 16px; }
        .aba {
          flex: 1; padding: 11px; border-radius: 11px; font-weight: 700; font-size: 14px;
          background: var(--panel); border: 1px solid var(--line); color: var(--text-dim);
        }
        .aba.on { background: rgba(29,185,84,0.15); border-color: var(--grass-bright); color: var(--grass-bright); }
        .trava-aviso {
          background: rgba(255,91,91,0.12); border: 1px solid var(--red); color: #ffd5d5;
          padding: 11px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 16px;
        }
        .slots { display: flex; flex-direction: column; gap: 12px; }
        .slot {
          background: var(--panel); border: 1px solid var(--line); border-radius: 14px;
          padding: 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        .slot-pos { font-size: 26px; }
        .slot-jog {
          flex: 1; min-width: 150px; display: flex; align-items: center; gap: 8px;
          background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px;
          padding: 11px 13px; color: var(--text); text-align: left;
        }
        .sj-nome { font-weight: 700; font-size: 14px; }
        .sj-sel { font-size: 11px; color: var(--text-faint); margin-left: auto; }
        .sj-vazio { color: var(--text-faint); font-size: 14px; }
        .slot-qtd { display: flex; align-items: center; gap: 7px; }
        .q-btn {
          width: 30px; height: 30px; border-radius: 8px; background: var(--bg-2);
          border: 1px solid var(--line); color: var(--grass-bright); font-size: 18px; font-weight: 700;
        }
        .q-num { font-size: 20px; font-weight: 700; min-width: 26px; text-align: center; }
        .q-lbl { font-size: 11px; color: var(--text-faint); }
        .salvar { margin-top: 18px; }
        .msg { margin-top: 12px; padding: 11px 14px; border-radius: 10px; font-size: 13px; }
        .msg.ok { background: rgba(29,185,84,0.14); border: 1px solid var(--grass-bright); color: var(--grass-bright); }
        .msg.erro { background: rgba(255,91,91,0.13); border: 1px solid var(--red); color: #ffd5d5; }
        .regra-nota { margin-top: 16px; font-size: 12px; color: var(--text-faint); line-height: 1.5; }
        .regra-nota b { color: var(--text-dim); }
        .modal {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 50;
          display: flex; align-items: flex-end; justify-content: center; padding: 0;
        }
        .modal-box {
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 18px 18px 0 0; width: 100%; max-width: 560px;
          max-height: 80vh; display: flex; flex-direction: column;
        }
        .modal-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 18px; border-bottom: 1px solid var(--line); font-weight: 700;
        }
        .modal-x { background: transparent; border: none; color: var(--text-dim); font-size: 18px; }
        .modal-lista { overflow-y: auto; padding: 10px; }
      `}</style>
    </div>
  );
}

function SelecaoExpansivel({
  selecao, bandeira, jogadores, onEscolher,
}: {
  selecao: string; bandeira: string | null; jogadores: Jogador[]; onEscolher: (id: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="sel">
      <button className="sel-head" onClick={() => setAberto(!aberto)}>
        <Bandeira emoji={bandeira} tamanho={16} />
        <span className="sel-nome">{selecao}</span>
        <span className="sel-cont">{jogadores.length}</span>
        <span className={`sel-seta ${aberto ? 'g' : ''}`}>▾</span>
      </button>
      {aberto && (
        <div className="sel-jogs">
          {jogadores.map((j) => (
            <button key={j.id} className="sel-jog" onClick={() => onEscolher(j.id)}>{j.nome}</button>
          ))}
        </div>
      )}
      <style jsx>{`
        .sel { border-bottom: 1px solid var(--line); }
        .sel-head {
          width: 100%; display: flex; align-items: center; gap: 9px;
          padding: 12px 8px; background: transparent; border: none; color: var(--text);
        }
        .sel-nome { font-weight: 700; font-size: 14px; }
        .sel-cont { margin-left: auto; font-size: 11px; color: var(--text-faint); }
        .sel-seta { color: var(--text-dim); transition: transform 0.2s; }
        .sel-seta.g { transform: rotate(180deg); }
        .sel-jogs { display: flex; flex-direction: column; padding: 4px 8px 10px; gap: 2px; }
        .sel-jog {
          text-align: left; padding: 9px 12px; border-radius: 8px;
          background: var(--panel); border: 1px solid var(--line); color: var(--text); font-size: 13px;
        }
        .sel-jog:hover { background: var(--panel-2); border-color: var(--grass-deep); }
      `}</style>
    </div>
  );
}
