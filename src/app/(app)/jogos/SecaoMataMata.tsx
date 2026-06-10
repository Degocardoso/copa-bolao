'use client';

import { useMemo, useState } from 'react';
import Bandeira from '@/components/Bandeira';
import type { Time, PalpiteMataSalvo } from '@/lib/tipos';
import type { Jogo } from '@/lib/tipos';
import { calcularGrupos, type Palpitinho } from '@/lib/simulador-grupos';
import { montarAvos, proximoConfronto, type Confronto } from '@/lib/simulador-chave';
import { salvarMataMata, type PalpiteMataInput } from './acoes-mata';

type Placar = { casa: number; fora: number };
type PalpiteMata = { vencedor: number | null; golsA: number; golsB: number };

export default function SecaoMataMata({
  jogos,
  times,
  placaresGrupo,
  totalGrupo,
  palpitadosGrupo,
  salvosGrupo,
  palpitesMataIniciais,
  mataComecou,
  primeiroMata,
}: {
  jogos: Jogo[];
  times: Time[];
  placaresGrupo: Record<number, Placar>;
  totalGrupo: number;
  palpitadosGrupo: number;
  salvosGrupo: number;
  palpitesMataIniciais: PalpiteMataSalvo[];
  mataComecou: boolean;
  primeiroMata: string | null;
}) {
  const mapaTimes = useMemo(() => {
    const m = new Map<number, Time>();
    times.forEach((t) => m.set(t.id, t));
    return m;
  }, [times]);

  // palpites de mata-mata em edição, por confronto
  const [palpites, setPalpites] = useState<Record<string, PalpiteMata>>(() => {
    const r: Record<string, PalpiteMata> = {};
    palpitesMataIniciais.forEach((p) => {
      r[p.confronto] = {
        vencedor: p.vencedor,
        golsA: p.gols_a ?? 0,
        golsB: p.gols_b ?? 0,
      };
    });
    return r;
  });
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // só libera o mata-mata com todos os grupos SALVOS no banco
  const gruposCompletos = totalGrupo > 0 && salvosGrupo >= totalGrupo;

  // calcula a chave a partir dos placares de grupo atuais (produz os avos)
  const avos = useMemo(() => {
    if (!gruposCompletos) return [];
    const palpitinhos: Palpitinho[] = Object.entries(placaresGrupo).map(
      ([jogoId, pl]) => ({ jogo_id: Number(jogoId), gols_casa: pl.casa, gols_fora: pl.fora })
    );
    const classif = calcularGrupos(jogos, times, palpitinhos);
    return montarAvos(classif, mapaTimes);
  }, [gruposCompletos, placaresGrupo, jogos, times, mapaTimes]);

  // monta a árvore completa: avos (fixos) + oitavas + quartas + semi + final
  const arvore = useMemo(() => {
    if (avos.length === 0) return null;

    const confrontos = new Map<string, Confronto>();
    avos.forEach((c) => confrontos.set(c.id, { ...c }));

    // cria estrutura vazia das fases seguintes
    const qtdAvos = avos.length;
    const fases: { fase: Confronto['fase']; n: number }[] = [
      { fase: 'oitavas', n: Math.floor(qtdAvos / 2) },
      { fase: 'quartas', n: Math.floor(qtdAvos / 4) },
      { fase: 'semi',    n: Math.floor(qtdAvos / 8) },
      { fase: 'final',   n: 1 },
    ];
    fases.forEach(({ fase, n }) => {
      for (let i = 1; i <= n; i++) {
        confrontos.set(`${fase}-${i}`, {
          id: `${fase}-${i}`, fase, ordem: i, timeA: null, timeB: null,
        });
      }
    });

    // propaga vencedores fase a fase
    const propagar = (lista: Confronto[]) => {
      lista.forEach((c) => {
        const pal = palpites[c.id];
        if (pal?.vencedor) {
          const prox = proximoConfronto(c.fase, c.ordem);
          if (prox) {
            const alvo = confrontos.get(`${prox.fase}-${prox.ordem}`);
            if (alvo) {
              if (prox.lado === 'A') alvo.timeA = pal.vencedor;
              else alvo.timeB = pal.vencedor;
            }
          }
        }
      });
    };

    const listarFase = (fase: string, n: number) =>
      Array.from({ length: n }, (_, i) => confrontos.get(`${fase}-${i + 1}`)).filter(Boolean) as Confronto[];

    propagar(avos);
    propagar(listarFase('oitavas', Math.floor(qtdAvos / 2)));
    propagar(listarFase('quartas', Math.floor(qtdAvos / 4)));
    propagar(listarFase('semi',    Math.floor(qtdAvos / 8)));

    return confrontos;
  }, [avos, palpites]);

  function nomeTime(id: number | null) {
    if (!id) return { nome: 'A definir', bandeira: '⏳' };
    const t = mapaTimes.get(id);
    return { nome: t?.nome || '—', bandeira: t?.bandeira || '🏳️' };
  }

  function ajustarGol(conf: Confronto, lado: 'A' | 'B', delta: number) {
    if (mataComecou) return;
    setPalpites((prev) => {
      const atual = prev[conf.id] || { vencedor: null, golsA: 0, golsB: 0 };
      const campo = lado === 'A' ? 'golsA' : 'golsB';
      const novoVal = Math.max(0, Math.min(20, atual[campo] + delta));
      const novo = { ...atual, [campo]: novoVal };
      // vencedor sai do placar (empate no mata-mata não decide; deixa null)
      novo.vencedor =
        novo.golsA > novo.golsB ? conf.timeA :
        novo.golsB > novo.golsA ? conf.timeB : null;
      return { ...prev, [conf.id]: novo };
    });
  }

  async function salvarTudo() {
    if (!arvore) return;
    setSalvando(true);
    setMsg(null);
    const lista: PalpiteMataInput[] = [];
    arvore.forEach((c) => {
      const pal = palpites[c.id];
      if (c.timeA && c.timeB && pal) {
        lista.push({
          confronto: c.id, fase: c.fase,
          time_a: c.timeA, time_b: c.timeB,
          vencedor: pal.vencedor,
          gols_a: pal.golsA, gols_b: pal.golsB,
        });
      }
    });
    const r = await salvarMataMata(lista);
    setSalvando(false);
    setMsg(r.msg);
  }

  // ---------- Renderização ----------

  if (!gruposCompletos) {
    return (
      <div className="trava">
        <div className="trava-emoji">🔒</div>
        <p className="trava-tit">Mata-mata bloqueado</p>
        <p className="trava-txt">
          Para liberar o mata-mata, salve seu palpite em <b>todos os {totalGrupo} jogos
          da fase de grupos</b>. Você já salvou <b>{salvosGrupo}</b>.
          {palpitadosGrupo > salvosGrupo &&
            ' (Você tem placares preenchidos que ainda não salvou — clique em Salvar neles.)'}
        </p>
        <style jsx>{`
          .trava {
            text-align: center; padding: 32px 22px; margin-top: 14px;
            background: var(--panel); border: 1px dashed var(--line); border-radius: 16px;
          }
          .trava-emoji { font-size: 38px; opacity: 0.8; }
          .trava-tit { font-weight: 800; font-size: 17px; margin: 8px 0 6px; }
          .trava-txt { font-size: 13.5px; color: var(--text-dim); line-height: 1.55; max-width: 420px; margin: 0 auto; }
          .trava-txt b { color: var(--text); }
        `}</style>
      </div>
    );
  }

  const fasesOrdem: { fase: Confronto['fase']; titulo: string }[] = [
    { fase: 'avos',    titulo: '32 AVOS DE FINAL' },
    { fase: 'oitavas', titulo: 'OITAVAS DE FINAL' },
    { fase: 'quartas', titulo: 'QUARTAS DE FINAL' },
    { fase: 'semi',    titulo: 'SEMIFINAIS' },
    { fase: 'final',   titulo: 'FINAL' },
  ];

  const todosConfrontos = arvore ? Array.from(arvore.values()) : [];
  const campeao = (() => {
    const finalConf = arvore?.get('final-1');
    if (!finalConf) return null;
    const pal = palpites['final-1'];
    return pal?.vencedor ? nomeTime(pal.vencedor) : null;
  })();

  return (
    <div className="mata">
      <div className="mata-head">
        <h3 className="display" style={{ fontSize: 20 }}>🏆 Seu Mata-mata</h3>
        {mataComecou ? (
          <span className="tag tag-locked">🔒 Fechado</span>
        ) : (
          <span className="tag tag-grass">Aberto</span>
        )}
      </div>
      <p className="mata-sub">
        Definа o placar de cada confronto da SUA chave. Quem vence avança sozinho
        para a próxima fase.
      </p>

      {campeao && (
        <div className="campeao-box">
          <span className="cb-lbl">SEU CAMPEÃO</span>
          <span className="cb-time">
            <Bandeira emoji={campeao.bandeira} tamanho={22} /> <b>{campeao.nome}</b>
          </span>
        </div>
      )}

      {fasesOrdem.map(({ fase, titulo }) => {
        const conf = todosConfrontos.filter((c) => c.fase === fase).sort((a, b) => a.ordem - b.ordem);
        if (conf.length === 0) return null;
        return (
          <div key={fase} className="fase-bloco">
            <h4 className="fase-tit mono">{titulo}</h4>
            <div className="confrontos">
              {conf.map((c) => {
                const a = nomeTime(c.timeA);
                const b = nomeTime(c.timeB);
                const pal = palpites[c.id] || { vencedor: null, golsA: 0, golsB: 0 };
                const pronto = !!c.timeA && !!c.timeB;
                return (
                  <div key={c.id} className={`mconf ${!pronto ? 'aguardando' : ''}`}>
                    <div className={`mlado ${pal.vencedor === c.timeA && c.timeA ? 'venceu' : ''}`}>
                      <Bandeira emoji={a.bandeira} tamanho={16} />
                      <span className="mnome">{a.nome}</span>
                    </div>
                    <div className="mplacar">
                      <Mini valor={pal.golsA} travado={mataComecou || !pronto}
                        onMais={() => ajustarGol(c, 'A', 1)} onMenos={() => ajustarGol(c, 'A', -1)} />
                      <span className="mx">×</span>
                      <Mini valor={pal.golsB} travado={mataComecou || !pronto}
                        onMais={() => ajustarGol(c, 'B', 1)} onMenos={() => ajustarGol(c, 'B', -1)} />
                    </div>
                    <div className={`mlado dir ${pal.vencedor === c.timeB && c.timeB ? 'venceu' : ''}`}>
                      <span className="mnome">{b.nome}</span>
                      <Bandeira emoji={b.bandeira} tamanho={16} />
                    </div>
                    {pronto && pal.golsA === pal.golsB && (
                      <div className="empate-aviso">defina um vencedor (sem empate no mata-mata)</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {!mataComecou && (
        <div className="salvar-barra">
          <button className="btn btn-primary btn-block" onClick={salvarTudo} disabled={salvando}>
            {salvando ? 'Salvando…' : '💾 Salvar meu mata-mata'}
          </button>
          {msg && <p className="salvar-msg">{msg}</p>}
        </div>
      )}

      <style jsx>{`
        .mata { margin-top: 30px; padding-top: 24px; border-top: 2px solid var(--line); }
        .mata-head { display: flex; align-items: center; justify-content: space-between; }
        .mata-sub { color: var(--text-dim); font-size: 13px; margin: 4px 0 16px; line-height: 1.5; }
        .campeao-box {
          background: linear-gradient(135deg, rgba(244,196,48,0.16), rgba(29,185,84,0.1));
          border: 1px solid var(--gold); border-radius: 14px; padding: 14px 18px;
          margin-bottom: 20px; display: flex; flex-direction: column; gap: 4px; align-items: center;
        }
        .cb-lbl { font-size: 11px; letter-spacing: 0.15em; color: var(--gold); font-weight: 700; }
        .cb-time { font-size: 18px; display: flex; align-items: center; gap: 8px; }
        .fase-bloco { margin-bottom: 20px; }
        .fase-tit { font-size: 12px; letter-spacing: 0.16em; color: var(--gold); margin-bottom: 10px; }
        .confrontos { display: flex; flex-direction: column; gap: 9px; }
        .mconf {
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 8px; position: relative;
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 12px; padding: 12px;
        }
        .mconf.aguardando { opacity: 0.5; }
        .mlado { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }
        .mlado.dir { justify-content: flex-end; }
        .mlado.venceu { color: var(--grass-bright); }
        .mlado.venceu .mnome { font-weight: 800; }
        .mnome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mplacar { display: flex; align-items: center; gap: 6px; }
        .mx { color: var(--text-faint); font-weight: 700; font-size: 13px; }
        .empate-aviso {
          grid-column: 1 / -1; text-align: center; font-size: 10.5px;
          color: var(--red); margin-top: 2px;
        }
        .salvar-barra { margin-top: 8px; position: sticky; bottom: 12px; }
        .salvar-msg { text-align: center; font-size: 13px; color: var(--grass-bright); margin-top: 8px; }
      `}</style>
    </div>
  );
}

function Mini({
  valor, travado, onMais, onMenos,
}: { valor: number; travado: boolean; onMais: () => void; onMenos: () => void }) {
  return (
    <div className="mini">
      <button className="mb" disabled={travado} onClick={onMais} aria-label="mais">+</button>
      <span className="mn mono">{valor}</span>
      <button className="mb" disabled={travado} onClick={onMenos} aria-label="menos">−</button>
      <style jsx>{`
        .mini { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .mn { font-size: 20px; font-weight: 700; color: var(--white); min-width: 24px; text-align: center; line-height: 1; }
        .mb {
          width: 26px; height: 22px; border-radius: 7px; background: var(--bg-2);
          border: 1px solid var(--line); color: var(--grass-bright); font-size: 15px;
          font-weight: 700; display: flex; align-items: center; justify-content: center; line-height: 1;
        }
        .mb:not(:disabled):active { transform: scale(0.9); }
        .mb:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
