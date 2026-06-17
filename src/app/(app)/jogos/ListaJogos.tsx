'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarClienteNavegador } from '@/lib/supabase-browser';
import type { Jogo, Time, Palpite, PalpiteMataSalvo, ConfrontoReal } from '@/lib/tipos';
import { formatarData, jogoComecou } from '@/lib/tipos';
import { pontosDoPalpite } from '@/lib/tipos';
import Bandeira from '@/components/Bandeira';
import SecaoMataMata from './SecaoMataMata';

type Placar = { casa: number; fora: number };

export default function ListaJogos({
  jogos,
  times,
  palpitesIniciais,
  usuarioId,
  totalGrupo,
  palpitadosGrupo,
  palpitesMataIniciais,
  jogosMataReais,
}: {
  jogos: Jogo[];
  times: Time[];
  palpitesIniciais: Palpite[];
  usuarioId: string;
  totalGrupo: number;
  palpitadosGrupo: number;
  palpitesMataIniciais: PalpiteMataSalvo[];
  jogosMataReais: ConfrontoReal[];
}) {
  const supabase = criarClienteNavegador();
  const router = useRouter();

  // força re-render a cada 30s para que jogoComecou() use o horário atual
  // (evita a UI ficar obsoleta quando o jogo começa com a página aberta)
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

  // placar atual em edicao por jogo
  const [placares, setPlacares] = useState<Record<number, Placar>>(() => {
    const r: Record<number, Placar> = {};
    palpitesIniciais.forEach((p) => (r[p.jogo_id] = { casa: p.gols_casa, fora: p.gols_fora }));
    return r;
  });
  // jogos que ja tem palpite salvo no banco
  const [salvos, setSalvos] = useState<Set<number>>(
    () => new Set(palpitesIniciais.map((p) => p.jogo_id))
  );
  const [salvando, setSalvando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function ajustar(jogoId: number, lado: 'casa' | 'fora', delta: number) {
    setPlacares((p) => {
      const atual = p[jogoId] || { casa: 0, fora: 0 };
      const novo = Math.max(0, Math.min(20, atual[lado] + delta));
      return { ...p, [jogoId]: { ...atual, [lado]: novo } };
    });
  }

  async function salvar(jogo: Jogo) {
    if (jogoComecou(jogo.inicio)) return;
    const placar = placares[jogo.id];
    if (!placar) return;
    setErro(null);
    setSalvando(jogo.id);

    const { error } = await supabase
      .from('palpites')
      .upsert(
        {
          usuario_id: usuarioId,
          jogo_id: jogo.id,
          gols_casa: placar.casa,
          gols_fora: placar.fora,
        },
        { onConflict: 'usuario_id,jogo_id' }
      );

    setSalvando(null);
    if (error) {
      console.error('[salvar palpite]', error);
      // Descobre qual condição RLS falhou para dar mensagem útil
      const { data: perfil } = await supabase
        .from('perfis').select('status').eq('id', usuarioId).single();
      if (perfil?.status !== 'aprovado') {
        setErro('Sua participação ainda não foi aprovada — peça ao admin para liberar seu acesso.');
      } else {
        setErro('Esse jogo já começou. A página está sendo atualizada…');
        router.refresh();
      }
    } else {
      setSalvos((s) => new Set(s).add(jogo.id));
    }
  }

  if (jogos.length === 0) {
    return (
      <div className="card vazio">
        <div style={{ fontSize: 40 }}>📅</div>
        <p>Os jogos ainda não foram cadastrados.</p>
        <span>Assim que o admin lançar a tabela, eles aparecem aqui.</span>
        <style jsx>{`
          .vazio { text-align: center; padding: 40px 20px; color: var(--text-dim); }
          .vazio p { font-weight: 700; color: var(--text); margin: 10px 0 4px; }
          .vazio span { font-size: 13px; }
        `}</style>
      </div>
    );
  }

  const grupos = new Map<string, Jogo[]>();
  jogos.forEach((j) => {
    const chave = j.rodada || (j.fase === 'grupos' ? 'Fase de Grupos' : 'Mata-mata');
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(j);
  });

  return (
    <div>
      {erro && <div className="erro-flutua">{erro}</div>}
      {Array.from(grupos.entries()).map(([titulo, lista]) => (
        <section key={titulo} style={{ marginBottom: 26 }}>
          <h3 className="secao-titulo mono">{titulo}</h3>
          <div className="jogos">
            {lista.map((jogo) => {
              const casa = jogo.time_casa ? mapaTimes.get(jogo.time_casa) : null;
              const fora = jogo.time_fora ? mapaTimes.get(jogo.time_fora) : null;
              const travado = jogoComecou(jogo.inicio);
              const placar = placares[jogo.id];
              const temPalpite = salvos.has(jogo.id);
              const oficial = jogo.gols_casa != null && jogo.gols_fora != null;
              const cravou =
                oficial && temPalpite && placar &&
                placar.casa === jogo.gols_casa && placar.fora === jogo.gols_fora;
              const ptsJogo = oficial && temPalpite && placar
                ? pontosDoPalpite(placar.casa, placar.fora, jogo.gols_casa, jogo.gols_fora)
                : 0;

              // mudou em relacao ao salvo?
              const inicial = palpitesIniciais.find((p) => p.jogo_id === jogo.id);
              const mudou =
                !!placar &&
                (!inicial || inicial.gols_casa !== placar.casa || inicial.gols_fora !== placar.fora);

              return (
                <div key={jogo.id} className={`jogo ${travado ? 'travado' : ''}`}>
                  <div className="jogo-topo">
                    <span className="jogo-data mono">{formatarData(jogo.inicio)}</span>
                    {travado ? (
                      <span className="tag tag-locked">🔒 Fechado</span>
                    ) : (
                      <span className="tag tag-grass">Aberto</span>
                    )}
                  </div>

                  <div className="confronto">
                    <div className="lado">
                      <Bandeira emoji={casa?.bandeira} tamanho={30} />
                      <span className="time-nome">{casa?.nome || 'A definir'}</span>
                    </div>

                    <div className="placar">
                      <Stepper
                        valor={placar?.casa ?? 0}
                        travado={travado}
                        onMais={() => ajustar(jogo.id, 'casa', 1)}
                        onMenos={() => ajustar(jogo.id, 'casa', -1)}
                      />
                      <span className="x mono">×</span>
                      <Stepper
                        valor={placar?.fora ?? 0}
                        travado={travado}
                        onMais={() => ajustar(jogo.id, 'fora', 1)}
                        onMenos={() => ajustar(jogo.id, 'fora', -1)}
                      />
                    </div>

                    <div className="lado">
                      <Bandeira emoji={fora?.bandeira} tamanho={30} />
                      <span className="time-nome">{fora?.nome || 'A definir'}</span>
                    </div>
                  </div>

                  {oficial && (
                    <div className={`oficial ${ptsJogo > 0 ? 'cravou' : ''}`}>
                      Resultado oficial: <b>{jogo.gols_casa} × {jogo.gols_fora}</b>
                      {temPalpite && (
                        ptsJogo === 4 ? ' · você cravou o empate! +4 🔥'
                        : ptsJogo === 3 ? ' · você cravou o placar! +3 🎯'
                        : ptsJogo === 1 ? ' · acertou o resultado! +1 ✅'
                        : ' · não foi dessa vez'
                      )}
                    </div>
                  )}

                  {!travado && (
                    <div className="jogo-rodape">
                      <span className="status">
                        {temPalpite && !mudou ? (
                          <span className="ok">✓ palpite salvo: {placar?.casa} × {placar?.fora}</span>
                        ) : placar ? (
                          <span className="pend">palpite não salvo</span>
                        ) : (
                          <span className="pend">defina o placar</span>
                        )}
                      </span>
                      <button
                        className="btn btn-primary btn-salvar"
                        disabled={!placar || !mudou || salvando === jogo.id}
                        onClick={() => salvar(jogo)}
                      >
                        {salvando === jogo.id ? 'salvando…' : temPalpite ? 'Atualizar' : 'Salvar'}
                      </button>
                    </div>
                  )}

                  {travado && temPalpite && (
                    <div className="jogo-rodape">
                      <span className="status">
                        <span className="trav">seu palpite: {placar?.casa} × {placar?.fora}</span>
                      </span>
                    </div>
                  )}
                  {travado && !temPalpite && (
                    <div className="jogo-rodape">
                      <span className="status"><span className="pend">você não palpitou</span></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <SecaoMataMata
        jogos={jogos}
        times={times}
        placaresGrupo={placares}
        totalGrupo={totalGrupo}
        palpitadosGrupo={palpitadosGrupo}
        salvosGrupo={salvos.size}
        palpitesMataIniciais={palpitesMataIniciais}
        jogosMataReais={jogosMataReais}
      />

      <style jsx>{`
        .erro-flutua {
          position: sticky; top: 120px; z-index: 5;
          background: rgba(255,91,91,0.15); border: 1px solid var(--red);
          color: #ffd5d5; padding: 10px 14px; border-radius: 10px;
          font-size: 13px; margin-bottom: 14px;
        }
        .secao-titulo {
          font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 12px; padding-left: 2px;
        }
        .jogos { display: flex; flex-direction: column; gap: 12px; }
        .jogo {
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 16px; padding: 14px; transition: opacity 0.2s;
        }
        .jogo.travado { opacity: 0.9; }
        .jogo-topo {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px;
        }
        .jogo-data { font-size: 12px; color: var(--text-dim); }
        .confronto {
          display: grid; grid-template-columns: 1fr auto 1fr;
          gap: 10px; align-items: center;
        }
        .lado {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .bandeira { font-size: 30px; line-height: 1; }
        .time-nome {
          font-size: 13px; font-weight: 700; text-align: center; line-height: 1.15;
        }
        .placar { display: flex; align-items: center; gap: 8px; }
        .x { font-size: 20px; color: var(--text-faint); font-weight: 700; }
        .oficial {
          margin-top: 12px; padding: 8px 12px; border-radius: 10px;
          background: var(--bg-2); border: 1px solid var(--line);
          font-size: 12px; color: var(--text-dim); text-align: center;
        }
        .oficial b { color: var(--text); }
        .oficial.cravou {
          background: rgba(29,185,84,0.14); border-color: var(--grass-bright);
          color: var(--grass-bright);
        }
        .jogo-rodape {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 13px; gap: 10px;
        }
        .status { font-size: 12px; font-weight: 600; }
        .ok { color: var(--grass-bright); }
        .pend { color: var(--text-faint); }
        .trav { color: var(--text-dim); }
        .btn-salvar { padding: 9px 18px; font-size: 14px; }
      `}</style>
    </div>
  );
}

function Stepper({
  valor,
  travado,
  onMais,
  onMenos,
}: {
  valor: number;
  travado: boolean;
  onMais: () => void;
  onMenos: () => void;
}) {
  return (
    <div className="stepper">
      <button className="sbtn" disabled={travado} onClick={onMais} aria-label="mais">+</button>
      <span className="snum mono">{valor}</span>
      <button className="sbtn" disabled={travado} onClick={onMenos} aria-label="menos">−</button>
      <style jsx>{`
        .stepper {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .snum {
          font-size: 30px; font-weight: 700; color: var(--white);
          min-width: 38px; text-align: center; line-height: 1;
        }
        .sbtn {
          width: 34px; height: 30px; border-radius: 9px;
          background: var(--bg-2); border: 1px solid var(--line);
          color: var(--grass-bright); font-size: 19px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s; line-height: 1;
        }
        .sbtn:not(:disabled):hover { background: var(--panel-2); border-color: var(--grass-deep); }
        .sbtn:not(:disabled):active { transform: scale(0.92); }
        .sbtn:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
