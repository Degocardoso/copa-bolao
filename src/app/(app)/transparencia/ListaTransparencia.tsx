'use client';

import { useState, useMemo } from 'react';
import type { Jogo, Time } from '@/lib/tipos';
import { formatarData, jogoComecou } from '@/lib/tipos';

type Jogador = { id: string; nome: string; avatar_url: string | null; status: string };
type PalpiteT = {
  usuario_id: string;
  jogo_id: number;
  gols_casa: number;
  gols_fora: number;
  atualizado_em: string;
};

export default function ListaTransparencia({
  jogadores,
  jogos,
  times,
  palpites,
  meuId,
}: {
  jogadores: Jogador[];
  jogos: Jogo[];
  times: Time[];
  palpites: PalpiteT[];
  meuId: string;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  const mapaTimes = useMemo(() => {
    const m = new Map<number, Time>();
    times.forEach((t) => m.set(t.id, t));
    return m;
  }, [times]);

  const mapaJogos = useMemo(() => {
    const m = new Map<number, Jogo>();
    jogos.forEach((j) => m.set(j.id, j));
    return m;
  }, [jogos]);

  // palpites agrupados por jogador
  const porJogador = useMemo(() => {
    const m = new Map<string, PalpiteT[]>();
    palpites.forEach((p) => {
      if (!m.has(p.usuario_id)) m.set(p.usuario_id, []);
      m.get(p.usuario_id)!.push(p);
    });
    return m;
  }, [palpites]);

  function nomeTime(id: number | null): { nome: string; bandeira: string } {
    if (!id) return { nome: 'A definir', bandeira: '🏳️' };
    const t = mapaTimes.get(id);
    return { nome: t?.nome || '—', bandeira: t?.bandeira || '🏳️' };
  }

  if (jogadores.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 36, color: 'var(--text-dim)' }}>
        Ainda não há jogadores aprovados.
      </div>
    );
  }

  return (
    <div className="lista">
      {jogadores.map((jog) => {
        const meus = porJogador.get(jog.id) || [];
        const expandido = aberto === jog.id;
        const ehEu = jog.id === meuId;

        // ordena os palpites pela data do jogo
        const ordenados = [...meus].sort((a, b) => {
          const ja = mapaJogos.get(a.jogo_id)?.inicio || '';
          const jb = mapaJogos.get(b.jogo_id)?.inicio || '';
          return ja.localeCompare(jb);
        });

        return (
          <div key={jog.id} className="bloco-jog">
            <button
              className={`cabeca ${expandido ? 'ativo' : ''}`}
              onClick={() => setAberto(expandido ? null : jog.id)}
            >
              <span className="avatar">
                {jog.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={jog.avatar_url} alt="" />
                ) : (
                  jog.nome.charAt(0).toUpperCase()
                )}
              </span>
              <span className="nome">
                {jog.nome}
                {ehEu && <span className="voce">você</span>}
              </span>
              <span className="cont">{meus.length} palpite{meus.length === 1 ? '' : 's'}</span>
              <span className={`seta ${expandido ? 'gira' : ''}`}>▾</span>
            </button>

            {expandido && (
              <div className="palpites">
                {ordenados.length === 0 ? (
                  <p className="sem">Ainda não palpitou.</p>
                ) : (
                  ordenados.map((p) => {
                    const jogo = mapaJogos.get(p.jogo_id);
                    if (!jogo) return null;
                    const casa = nomeTime(jogo.time_casa);
                    const fora = nomeTime(jogo.time_fora);
                    const comecou = jogoComecou(jogo.inicio);
                    // regra: palpite de jogo não iniciado só o próprio dono vê
                    const podeVer = ehEu || comecou;
                    const oficial = jogo.gols_casa != null && jogo.gols_fora != null;
                    const cravou =
                      oficial && p.gols_casa === jogo.gols_casa && p.gols_fora === jogo.gols_fora;

                    return (
                      <div key={p.jogo_id} className="pal">
                        <div className="pal-jogo">
                          <span>{casa.bandeira} {casa.nome}</span>
                          {podeVer ? (
                            <span className={`placar ${cravou ? 'cravou' : ''}`}>
                              {p.gols_casa} × {p.gols_fora}
                            </span>
                          ) : (
                            <span className="oculto">🔒</span>
                          )}
                          <span className="dir">{fora.nome} {fora.bandeira}</span>
                        </div>
                        <div className="pal-meta mono">
                          {podeVer ? (
                            <>palpitou em {formatarData(p.atualizado_em)}
                            {oficial && (cravou ? ' · acertou +3' : ' · errou')}</>
                          ) : (
                            <>oculto até o jogo começar ({formatarData(jogo.inicio)})</>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      <style jsx>{`
        .lista { display: flex; flex-direction: column; gap: 8px; }
        .bloco-jog {
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 13px; overflow: hidden;
        }
        .cabeca {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 13px 15px; background: transparent; border: none;
          color: var(--text); text-align: left;
        }
        .cabeca.ativo { background: var(--panel-2); }
        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--grass-deep); color: #04140a;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 15px; flex-shrink: 0; overflow: hidden;
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .nome { flex: 1; font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px; }
        .voce {
          font-size: 10px; background: var(--grass-bright); color: #04140a;
          padding: 1px 7px; border-radius: 999px; font-weight: 800; text-transform: uppercase;
        }
        .cont { font-size: 12px; color: var(--text-faint); }
        .seta { color: var(--text-dim); transition: transform 0.2s; font-size: 13px; }
        .seta.gira { transform: rotate(180deg); }
        .palpites {
          border-top: 1px solid var(--line);
          padding: 8px 15px 14px;
          display: flex; flex-direction: column; gap: 9px;
        }
        .sem { font-size: 13px; color: var(--text-faint); padding: 8px 0; }
        .pal { padding: 9px 0; border-bottom: 1px dashed var(--line); }
        .pal:last-child { border-bottom: none; }
        .pal-jogo {
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
        }
        .pal-jogo .dir { text-align: right; }
        .placar {
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 7px; padding: 3px 11px; font-weight: 800;
          color: var(--white); white-space: nowrap;
        }
        .placar.cravou { border-color: var(--grass-bright); color: var(--grass-bright); }
        .oculto { font-size: 15px; opacity: 0.6; }
        .pal-meta { font-size: 10.5px; color: var(--text-faint); margin-top: 5px; text-align: center; }
      `}</style>
    </div>
  );
}
