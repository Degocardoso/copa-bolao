'use client';

import { useEffect, useMemo, useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase-browser';
import type { Jogo, Time, Palpite } from '@/lib/tipos';
import { formatarData, jogoComecou, pontosDoPalpite } from '@/lib/tipos';
import Bandeira from '@/components/Bandeira';

type Placar = { casa: number; fora: number };

const FASE_TITULO: Record<string, string> = {
  avos: '32 Avos de Final',
  oitavas: 'Oitavas de Final',
  quartas: 'Quartas de Final',
  semi: 'Semifinais',
  final: 'Final',
};

// Título amigável (PT) de um jogo do mata-mata, valendo tanto para jogos
// criados à mão (fase = avos/oitavas/...) quanto importados (fase = 'mata-mata'
// com a rodada em inglês vinda do openfootball).
function tituloMata(j: Jogo): string {
  if (FASE_TITULO[j.fase]) return FASE_TITULO[j.fase];
  const r = (j.rodada || '').toLowerCase();
  if (/round of 32|1\/16|16.?avos|32.?avos/.test(r)) return '32 Avos de Final';
  if (/round of 16|1\/8|oitavas/.test(r)) return 'Oitavas de Final';
  if (/quarter|1\/4|quartas/.test(r)) return 'Quartas de Final';
  if (/semi/.test(r)) return 'Semifinais';
  if (/third|3rd|terceiro|3º|3o/.test(r)) return 'Disputa de 3º lugar';
  if (/final/.test(r)) return 'Final';
  return j.rodada || 'Mata-mata';
}

export default function ListaJogos({
  jogos,
  jogosMata,
  times,
  palpitesIniciais,
  usuarioId,
}: {
  jogos: Jogo[];
  jogosMata: Jogo[];
  times: Time[];
  palpitesIniciais: Palpite[];
  usuarioId: string;
}) {
  const supabase = criarClienteNavegador();

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
  // último placar confirmado no banco (atualiza a cada save bem-sucedido)
  const [salvosPlacares, setSalvosPlacares] = useState<Record<number, Placar>>(() => {
    const r: Record<number, Placar> = {};
    palpitesIniciais.forEach((p) => (r[p.jogo_id] = { casa: p.gols_casa, fora: p.gols_fora }));
    return r;
  });
  // jogos que ja tem palpite salvo no banco
  const [salvos, setSalvos] = useState<Set<number>>(
    () => new Set(palpitesIniciais.map((p) => p.jogo_id))
  );
  // palpite de "quem passa nos pênaltis" (só mata-mata, em empate)
  const [penaltis, setPenaltis] = useState<Record<number, number | null>>(() => {
    const r: Record<number, number | null> = {};
    palpitesIniciais.forEach((p) => (r[p.jogo_id] = p.avanca_penaltis ?? null));
    return r;
  });
  const [salvosPenaltis, setSalvosPenaltis] = useState<Record<number, number | null>>(() => {
    const r: Record<number, number | null> = {};
    palpitesIniciais.forEach((p) => (r[p.jogo_id] = p.avanca_penaltis ?? null));
    return r;
  });

  const [salvando, setSalvando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function ajustar(jogoId: number, lado: 'casa' | 'fora', delta: number) {
    setPlacares((p) => {
      const atual = p[jogoId] || { casa: 0, fora: 0 };
      const novo = Math.max(0, Math.min(20, atual[lado] + delta));
      return { ...p, [jogoId]: { ...atual, [lado]: novo } };
    });
  }

  function escolherPenalti(jogoId: number, timeId: number) {
    setPenaltis((p) => ({ ...p, [jogoId]: timeId }));
  }

  function nomeTime(id: number | null | undefined) {
    if (!id) return 'A definir';
    return mapaTimes.get(id)?.nome || '—';
  }

  async function salvar(jogo: Jogo, ehMata: boolean) {
    if (jogoComecou(jogo.inicio)) return;
    const pronto = !!jogo.time_casa && !!jogo.time_fora;
    if (ehMata && !pronto) return;
    const placar = placares[jogo.id];
    if (!placar) return;

    const ehEmpate = placar.casa === placar.fora;
    const penaltiPick = ehMata && ehEmpate ? penaltis[jogo.id] ?? null : null;
    if (ehMata && ehEmpate && !penaltiPick) {
      setErro('Empate: escolha quem passa nos pênaltis antes de salvar.');
      return;
    }

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
          avanca_penaltis: penaltiPick,
        },
        { onConflict: 'usuario_id,jogo_id' }
      );

    setSalvando(null);
    if (error) {
      console.error('[salvar palpite]', error);
      const { data: perfil } = await supabase
        .from('perfis').select('status').eq('id', usuarioId).single();
      if (perfil?.status !== 'aprovado') {
        setErro('Sua participação ainda não foi aprovada — peça ao admin para liberar seu acesso.');
      } else {
        setErro('Não foi possível salvar. O horário cadastrado no banco pode estar errado — peça ao admin para verificar o horário do jogo.');
      }
    } else {
      setSalvos((s) => new Set(s).add(jogo.id));
      setSalvosPlacares((prev) => ({ ...prev, [jogo.id]: { ...placar } }));
      setSalvosPenaltis((prev) => ({ ...prev, [jogo.id]: penaltiPick }));
    }
  }

  // ---------- Card de um jogo ----------
  // Os estilos do card ficam AQUI dentro (mesmo escopo do styled-jsx), senão
  // não são aplicados aos elementos renderizados por esta função.
  function renderJogo(jogo: Jogo, ehMata: boolean) {
    const casa = jogo.time_casa ? mapaTimes.get(jogo.time_casa) : null;
    const fora = jogo.time_fora ? mapaTimes.get(jogo.time_fora) : null;
    const pronto = !!jogo.time_casa && !!jogo.time_fora;
    const comecou = jogoComecou(jogo.inicio);
    const bloqueado = comecou || !pronto; // não dá pra mexer nos steppers
    const placar = placares[jogo.id];
    const temPalpite = salvos.has(jogo.id);
    const oficial = jogo.gols_casa != null && jogo.gols_fora != null;

    const ehEmpate = !!placar && placar.casa === placar.fora;
    const penaltiAtual = penaltis[jogo.id] ?? null;
    const penaltiSalvo = salvosPenaltis[jogo.id] ?? null;

    let ptsJogo = 0;
    let bonusPen = 0;
    if (oficial && temPalpite && placar) {
      ptsJogo = pontosDoPalpite(placar.casa, placar.fora, jogo.gols_casa, jogo.gols_fora);
      if (
        ehMata &&
        jogo.gols_casa === jogo.gols_fora &&
        jogo.vencedor_penaltis != null &&
        placar.casa === placar.fora &&
        penaltiSalvo === jogo.vencedor_penaltis
      ) {
        bonusPen = 3;
      }
    }

    const salvoAtual = salvosPlacares[jogo.id];
    const mudouPlacar =
      !!placar &&
      (!salvoAtual || salvoAtual.casa !== placar.casa || salvoAtual.fora !== placar.fora);
    const mudouPenalti = ehMata && ehEmpate && penaltiAtual !== penaltiSalvo;
    const mudou = mudouPlacar || mudouPenalti;
    const faltaPenalti = ehMata && ehEmpate && pronto && !comecou && !penaltiAtual;

    return (
      <div key={jogo.id} className={`jogo ${bloqueado ? 'travado' : ''}`}>
        <div className="jogo-topo">
          <span className="jogo-data mono">{formatarData(jogo.inicio)}</span>
          {!pronto ? (
            <span className="tag tag-dim">⏳ A definir</span>
          ) : comecou ? (
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
              travado={bloqueado}
              onMais={() => ajustar(jogo.id, 'casa', 1)}
              onMenos={() => ajustar(jogo.id, 'casa', -1)}
            />
            <span className="x mono">×</span>
            <Stepper
              valor={placar?.fora ?? 0}
              travado={bloqueado}
              onMais={() => ajustar(jogo.id, 'fora', 1)}
              onMenos={() => ajustar(jogo.id, 'fora', -1)}
            />
          </div>

          <div className="lado">
            <Bandeira emoji={fora?.bandeira} tamanho={30} />
            <span className="time-nome">{fora?.nome || 'A definir'}</span>
          </div>
        </div>

        {/* seletor de quem passa nos pênaltis (mata-mata, empate, em aberto) */}
        {ehMata && pronto && !comecou && ehEmpate && (
          <div className="pen">
            <span className="pen-lbl">⚖️ Empate — quem passa nos pênaltis?</span>
            <div className="pen-opts">
              <button
                className={`pen-opt ${penaltiAtual === jogo.time_casa ? 'sel' : ''}`}
                onClick={() => escolherPenalti(jogo.id, jogo.time_casa!)}
              >
                {casa?.nome || 'Casa'}
              </button>
              <button
                className={`pen-opt ${penaltiAtual === jogo.time_fora ? 'sel' : ''}`}
                onClick={() => escolherPenalti(jogo.id, jogo.time_fora!)}
              >
                {fora?.nome || 'Fora'}
              </button>
            </div>
          </div>
        )}

        {oficial && (
          <div className={`oficial ${ptsJogo + bonusPen > 0 ? 'cravou' : ''}`}>
            Resultado oficial: <b>{jogo.gols_casa} × {jogo.gols_fora}</b>
            {ehMata && jogo.gols_casa === jogo.gols_fora && jogo.vencedor_penaltis != null && (
              <> · nos pênaltis passou <b>{nomeTime(jogo.vencedor_penaltis)}</b></>
            )}
            {temPalpite && (
              <>
                {ptsJogo === 4 ? ' · você cravou o empate! +4 🔥'
                  : ptsJogo === 3 ? ' · você cravou o placar! +3 🎯'
                  : ptsJogo === 1 ? ' · acertou o resultado! +1 ✅'
                  : ' · não foi dessa vez'}
                {bonusPen > 0 && ' +3 nos pênaltis! 🎯'}
              </>
            )}
          </div>
        )}

        {!bloqueado && (
          <div className="jogo-rodape">
            <span className="status">
              {temPalpite && !mudou ? (
                <span className="ok">
                  ✓ palpite salvo: {placar?.casa} × {placar?.fora}
                  {ehMata && penaltiSalvo ? ` · passa: ${nomeTime(penaltiSalvo)}` : ''}
                </span>
              ) : faltaPenalti ? (
                <span className="pend">escolha quem passa nos pênaltis</span>
              ) : placar ? (
                <span className="pend">palpite não salvo</span>
              ) : (
                <span className="pend">defina o placar</span>
              )}
            </span>
            <button
              className="btn btn-primary btn-salvar"
              disabled={!placar || !mudou || salvando === jogo.id || faltaPenalti}
              onClick={() => salvar(jogo, ehMata)}
            >
              {salvando === jogo.id ? 'salvando…' : temPalpite ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        )}

        {bloqueado && !pronto && (
          <div className="jogo-rodape">
            <span className="status"><span className="pend">aguardando definição dos times</span></span>
          </div>
        )}
        {bloqueado && pronto && temPalpite && (
          <div className="jogo-rodape">
            <span className="status">
              <span className="trav">
                seu palpite: {placar?.casa} × {placar?.fora}
                {ehMata && penaltiSalvo ? ` · passa: ${nomeTime(penaltiSalvo)}` : ''}
              </span>
            </span>
          </div>
        )}
        {bloqueado && pronto && !temPalpite && (
          <div className="jogo-rodape">
            <span className="status"><span className="pend">você não palpitou</span></span>
          </div>
        )}

        <style jsx>{`
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
          .time-nome {
            font-size: 13px; font-weight: 700; text-align: center; line-height: 1.15;
          }
          .placar { display: flex; align-items: center; gap: 8px; justify-content: center; }
          .x { font-size: 20px; color: var(--text-faint); font-weight: 700; }
          .pen {
            margin-top: 12px; padding: 10px 12px; border-radius: 10px;
            background: rgba(244,196,48,0.08); border: 1px solid var(--gold-deep);
          }
          .pen-lbl { font-size: 12px; color: var(--gold); font-weight: 700; }
          .pen-opts { display: flex; gap: 8px; margin-top: 8px; }
          .pen-opt {
            flex: 1; padding: 9px 8px; border-radius: 9px;
            background: var(--bg-2); border: 1px solid var(--line);
            color: var(--text); font-size: 13px; font-weight: 700;
            transition: all 0.12s; line-height: 1.1;
          }
          .pen-opt:hover { border-color: var(--gold); }
          .pen-opt.sel {
            background: rgba(244,196,48,0.18); border-color: var(--gold);
            color: var(--gold);
          }
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

  if (jogos.length === 0 && jogosMata.length === 0) {
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

  // grupos: agrupados por rodada
  const grupos = new Map<string, Jogo[]>();
  jogos.forEach((j) => {
    const chave = j.rodada || 'Fase de Grupos';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(j);
  });

  // mata-mata: agrupado por etapa (qualquer fase != grupos), na ordem do calendário
  const secoesMata = new Map<string, Jogo[]>();
  jogosMata.forEach((j) => {
    const chave = tituloMata(j);
    if (!secoesMata.has(chave)) secoesMata.set(chave, []);
    secoesMata.get(chave)!.push(j);
  });

  return (
    <div>
      {erro && <div className="erro-flutua">{erro}</div>}

      {Array.from(grupos.entries()).map(([titulo, lista]) => (
        <section key={titulo} style={{ marginBottom: 26 }}>
          <h3 className="secao-titulo mono">{titulo}</h3>
          <div className="jogos">{lista.map((jogo) => renderJogo(jogo, false))}</div>
        </section>
      ))}

      {secoesMata.size > 0 && (
        <div className="mata-bloco">
          <h2 className="display" style={{ fontSize: 20, marginBottom: 4 }}>🏆 Mata-mata</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
            Palpite o placar de cada jogo do mata-mata, igual aos grupos. Empate? Diga quem
            passa nos pênaltis (+3 se acertar). Cada jogo trava no apito.
          </p>
          {Array.from(secoesMata.entries()).map(([titulo, lista]) => (
            <section key={titulo} style={{ marginBottom: 26 }}>
              <h3 className="secao-titulo mono">{titulo}</h3>
              <div className="jogos">{lista.map((jogo) => renderJogo(jogo, true))}</div>
            </section>
          ))}
        </div>
      )}

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
        .mata-bloco { margin-top: 30px; padding-top: 24px; border-top: 2px solid var(--line); }
        .jogos { display: flex; flex-direction: column; gap: 12px; }
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
