'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Jogo, Time } from '@/lib/tipos';
import { formatarData, jogoComecou } from '@/lib/tipos';
import { pontosDoPalpite } from '@/lib/tipos';
import Bandeira from '@/components/Bandeira';

type Jogador = { id: string; nome: string; avatar_url: string | null; status: string };
type PalpiteT = {
  usuario_id: string;
  jogo_id: number;
  gols_casa: number;
  gols_fora: number;
  avanca_penaltis?: number | null;
  atualizado_em: string;
};

export default function ListaTransparencia({
  jogadores,
  jogos,
  times,
  palpites,
  meuId,
  campeaoPorUsuario,
  finalComecou,
}: {
  jogadores: Jogador[];
  jogos: Jogo[];
  times: Time[];
  palpites: PalpiteT[];
  meuId: string;
  campeaoPorUsuario: Record<string, number | null>;
  finalComecou: boolean;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  // re-render a cada 30s para trocar o "jogo atual" sozinho quando o
  // próximo jogo começar (sem precisar recarregar a página)
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

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

  // palpites agrupados por jogo (para o painel do jogo atual)
  const porJogo = useMemo(() => {
    const m = new Map<number, PalpiteT[]>();
    palpites.forEach((p) => {
      if (!m.has(p.jogo_id)) m.set(p.jogo_id, []);
      m.get(p.jogo_id)!.push(p);
    });
    return m;
  }, [palpites]);

  const mapaJogadores = useMemo(() => {
    const m = new Map<string, Jogador>();
    jogadores.forEach((j) => m.set(j.id, j));
    return m;
  }, [jogadores]);

  // "jogo atual" = o(s) que começou(aram) mais recentemente e ainda não
  // foram sucedidos por outro. Fica no topo até o próximo jogo começar.
  // (cálculo direto, não memoizado, para acompanhar o tick/relógio)
  const jogosAtuais: Jogo[] = (() => {
    const agora = Date.now();
    const iniciados = jogos.filter(
      (j) => j.time_casa && j.time_fora && new Date(j.inicio).getTime() <= agora
    );
    if (iniciados.length === 0) return [];
    const maxIni = iniciados.reduce(
      (mx, j) => Math.max(mx, new Date(j.inicio).getTime()),
      0
    );
    return iniciados.filter((j) => new Date(j.inicio).getTime() === maxIni);
  })();

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
    <div>
      {jogosAtuais.length > 0 && (
        <div className="atual-wrap">
          {jogosAtuais.map((jogo) => {
            const casa = nomeTime(jogo.time_casa);
            const fora = nomeTime(jogo.time_fora);
            const oficial = jogo.gols_casa != null && jogo.gols_fora != null;
            const ehMataJogo = jogo.fase !== 'grupos';

            const palps = (porJogo.get(jogo.id) || [])
              .map((p) => {
                const jg = mapaJogadores.get(p.usuario_id);
                const cravou =
                  oficial && p.gols_casa === jogo.gols_casa && p.gols_fora === jogo.gols_fora;
                let pts = oficial
                  ? pontosDoPalpite(p.gols_casa, p.gols_fora, jogo.gols_casa, jogo.gols_fora)
                  : 0;
                const empatePalpite = p.gols_casa === p.gols_fora;
                const penNome =
                  ehMataJogo && empatePalpite && p.avanca_penaltis
                    ? nomeTime(p.avanca_penaltis).nome
                    : null;
                if (
                  oficial && ehMataJogo &&
                  jogo.gols_casa === jogo.gols_fora &&
                  jogo.vencedor_penaltis != null &&
                  empatePalpite &&
                  (p.avanca_penaltis ?? null) === jogo.vencedor_penaltis
                ) {
                  pts += 3;
                }
                return {
                  id: p.usuario_id,
                  nome: jg?.nome || '—',
                  avatar: jg?.avatar_url || null,
                  gc: p.gols_casa,
                  gf: p.gols_fora,
                  cravou,
                  pts,
                  penNome,
                };
              })
              .sort((a, b) => (oficial ? b.pts - a.pts : a.nome.localeCompare(b.nome)));

            return (
              <div key={jogo.id} className="atual">
                <div className="atual-tag">🔴 Rolando agora · palpites liberados</div>
                <div className="atual-jogo">
                  <div className="at-lado">
                    <Bandeira emoji={casa.bandeira} tamanho={34} />
                    <span className="at-nome">{casa.nome}</span>
                  </div>
                  <div className="at-placar">
                    {oficial ? (
                      <>{jogo.gols_casa} <span className="at-x">×</span> {jogo.gols_fora}</>
                    ) : (
                      <span className="at-x">×</span>
                    )}
                  </div>
                  <div className="at-lado">
                    <Bandeira emoji={fora.bandeira} tamanho={34} />
                    <span className="at-nome">{fora.nome}</span>
                  </div>
                </div>
                {oficial && ehMataJogo && jogo.gols_casa === jogo.gols_fora && jogo.vencedor_penaltis != null && (
                  <div className="atual-pen">nos pênaltis passou <b>{nomeTime(jogo.vencedor_penaltis).nome}</b></div>
                )}
                <div className="atual-sub mono">
                  {formatarData(jogo.inicio)} · {palps.length} palpite{palps.length === 1 ? '' : 's'} da galera
                </div>

                <div className="atual-palps">
                  {palps.length === 0 ? (
                    <p className="sem">Ninguém palpitou esse jogo.</p>
                  ) : (
                    palps.map((it) => (
                      <div key={it.id} className={`ap ${it.cravou ? 'ap-cravou' : ''}`}>
                        <span className="ap-nome">
                          <span className="ap-avatar">
                            {it.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.avatar} alt="" />
                            ) : (
                              it.nome.charAt(0).toUpperCase()
                            )}
                          </span>
                          {it.nome}
                          {it.id === meuId && <span className="voce">você</span>}
                        </span>
                        <span className="ap-dados">
                          {it.penNome && (
                            <span className="ap-pen" title="quem passa nos pênaltis">⚖️ {it.penNome}</span>
                          )}
                          <span className={`ap-placar ${it.cravou ? 'cravou' : ''}`}>
                            {it.gc} × {it.gf}
                          </span>
                          {oficial && <span className="ap-pts">{it.pts > 0 ? `+${it.pts}` : '0'}</span>}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              {(() => {
                // só revela o campeão palpitado depois que a final começou
                // (antes disso, só o próprio dono vê) — evita cópia.
                if (!ehEu && !finalComecou) return null;
                const campId = campeaoPorUsuario[jog.id];
                const camp = campId ? mapaTimes.get(campId) : null;
                if (!camp) return null;
                return (
                  <span className="campeao" title={`Campeão palpitado: ${camp.nome}`}>
                    🏆 <Bandeira emoji={camp.bandeira} tamanho={16} />
                  </span>
                );
              })()}
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
                    let pts = oficial
                      ? pontosDoPalpite(p.gols_casa, p.gols_fora, jogo.gols_casa, jogo.gols_fora)
                      : 0;

                    // mata-mata: palpite de empate mostra quem a pessoa pôs pra
                    // passar nos pênaltis (+3 se acertou).
                    const ehMata = jogo.fase !== 'grupos';
                    const empatePalpite = p.gols_casa === p.gols_fora;
                    const penNome =
                      ehMata && empatePalpite && p.avanca_penaltis
                        ? nomeTime(p.avanca_penaltis).nome
                        : null;
                    let bonusPen = 0;
                    if (
                      oficial && ehMata &&
                      jogo.gols_casa === jogo.gols_fora &&
                      jogo.vencedor_penaltis != null &&
                      empatePalpite &&
                      (p.avanca_penaltis ?? null) === jogo.vencedor_penaltis
                    ) {
                      bonusPen = 3;
                    }
                    pts += bonusPen;

                    return (
                      <div key={p.jogo_id} className="pal">
                        <div className="pal-jogo">
                          <span className="lt-time"><Bandeira emoji={casa.bandeira} tamanho={15} /> {casa.nome}</span>
                          {podeVer ? (
                            <span className={`placar ${cravou ? 'cravou' : ''}`}>
                              {p.gols_casa} × {p.gols_fora}
                            </span>
                          ) : (
                            <span className="oculto">🔒</span>
                          )}
                          <span className="dir lt-time">{fora.nome} <Bandeira emoji={fora.bandeira} tamanho={15} /></span>
                        </div>
                        {podeVer && penNome && (
                          <div className="pal-pen">
                            ⚖️ passa nos pênaltis: <b>{penNome}</b>
                            {bonusPen > 0 && <span className="pen-ok"> ✓ +3</span>}
                          </div>
                        )}
                        <div className="pal-meta mono">
                          {podeVer ? (
                            <>palpitou em {formatarData(p.atualizado_em)}
                            {oficial && (pts > 0 ? ` · +${pts}` : ' · 0')}</>
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
    </div>

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
        .campeao { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; flex-shrink: 0; }
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
        .lt-time { display: inline-flex; align-items: center; gap: 5px; }
        .pal-jogo .dir.lt-time { justify-content: flex-end; }
        .placar {
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 7px; padding: 3px 11px; font-weight: 800;
          color: var(--white); white-space: nowrap;
        }
        .placar.cravou { border-color: var(--grass-bright); color: var(--grass-bright); }
        .oculto { font-size: 15px; opacity: 0.6; }
        .pal-pen {
          margin-top: 6px; text-align: center; font-size: 11.5px;
          color: var(--gold); font-weight: 600;
        }
        .pal-pen b { color: var(--text); }
        .pen-ok { color: var(--grass-bright); font-weight: 800; }
        .pal-meta { font-size: 10.5px; color: var(--text-faint); margin-top: 5px; text-align: center; }

        /* ---- jogo atual (topo) ---- */
        .atual-wrap { margin-bottom: 20px; }
        .atual {
          background: linear-gradient(180deg, rgba(29,185,84,0.10), var(--panel));
          border: 1px solid var(--grass-deep); border-radius: 16px;
          padding: 16px; margin-bottom: 12px;
        }
        .atual-tag {
          font-size: 11px; font-weight: 800; letter-spacing: 0.06em;
          color: var(--grass-bright); text-transform: uppercase; margin-bottom: 12px;
        }
        .atual-jogo {
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 10px;
        }
        .at-lado { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .at-nome { font-size: 14px; font-weight: 700; text-align: center; line-height: 1.15; }
        .at-placar {
          font-size: 30px; font-weight: 800; color: var(--white);
          display: flex; align-items: center; gap: 8px; white-space: nowrap;
        }
        .at-x { color: var(--text-faint); font-size: 22px; }
        .atual-pen { text-align: center; font-size: 12px; color: var(--gold); margin-top: 8px; font-weight: 600; }
        .atual-pen b { color: var(--text); }
        .atual-sub { text-align: center; font-size: 11px; color: var(--text-faint); margin-top: 10px; }
        .atual-palps {
          margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line);
          display: flex; flex-direction: column; gap: 4px;
        }
        .ap {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 7px 8px; border-radius: 9px;
        }
        .ap.ap-cravou { background: rgba(29,185,84,0.12); }
        .ap-nome { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; min-width: 0; }
        .ap-avatar {
          width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; overflow: hidden;
          background: var(--grass-deep); color: #04140a; font-weight: 800; font-size: 11px;
          display: flex; align-items: center; justify-content: center;
        }
        .ap-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .ap-dados { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .ap-pen { font-size: 11px; color: var(--gold); font-weight: 600; white-space: nowrap; }
        .ap-placar {
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 7px; padding: 2px 10px; font-weight: 800; color: var(--white);
          white-space: nowrap;
        }
        .ap-placar.cravou { border-color: var(--grass-bright); color: var(--grass-bright); }
        .ap-pts { font-size: 12px; font-weight: 800; color: var(--gold); min-width: 26px; text-align: right; }
      `}</style>
    </div>
  );
}
