'use client';

import { useMemo } from 'react';
import Bandeira from '@/components/Bandeira';
import type { ClassificacaoGrupo } from '@/lib/simulador-grupos';
import type { Confronto } from '@/lib/simulador-chave';

type TimeSimples = { id: number; nome: string; bandeira: string | null; grupo: string | null };

export default function VisaoChave({
  classificacoes,
  oitavas,
  times,
  palpitadosGrupo,
  totalGrupo,
}: {
  classificacoes: ClassificacaoGrupo[];
  oitavas: Confronto[];
  times: TimeSimples[];
  palpitadosGrupo: number;
  totalGrupo: number;
}) {
  const timePorId = useMemo(() => {
    const m = new Map<number, TimeSimples>();
    times.forEach((t) => m.set(t.id, t));
    return m;
  }, [times]);

  const faltam = totalGrupo - palpitadosGrupo;
  const completo = totalGrupo > 0 && faltam <= 0;

  function nomeTime(id: number | null) {
    if (!id) return { nome: 'A definir', bandeira: '⏳' };
    const t = timePorId.get(id);
    return { nome: t?.nome || '—', bandeira: t?.bandeira || '🏳️' };
  }

  if (totalGrupo === 0) {
    return (
      <div className="card vazio">
        <div style={{ fontSize: 38 }}>📊</div>
        <p>Os jogos da fase de grupos ainda não foram cadastrados.</p>
        <style jsx>{`
          .vazio { text-align: center; padding: 36px 20px; color: var(--text-dim); }
          .vazio p { font-weight: 700; color: var(--text); margin-top: 10px; }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {/* aviso de progresso */}
      <div className={`progresso ${completo ? 'ok' : ''}`}>
        {completo ? (
          <>✅ Você palpitou todos os {totalGrupo} jogos de grupo. Sua chave está completa!</>
        ) : (
          <>
            📝 Você palpitou <b>{palpitadosGrupo}</b> de <b>{totalGrupo}</b> jogos de grupo.
            Faltam <b>{faltam}</b> — a chave abaixo é uma prévia e vai mudando conforme você palpita.
          </>
        )}
      </div>

      {/* classificação dos grupos */}
      <h3 className="bloco-tit mono">CLASSIFICAÇÃO DOS GRUPOS</h3>
      <p className="legenda">
        <span className="dot v" /> 1º e 2º vão direto · <span className="dot t" /> 3º pode ir (melhores terceiros)
      </p>
      <div className="grid-grupos">
        {classificacoes.map((c) => (
          <div key={c.grupo} className="grupo-card">
            <div className="grupo-head">Grupo {c.grupo}</div>
            {c.posicoes.map((linha, i) => {
              const t = nomeTime(linha.timeId);
              const classe = i < 2 ? 'classificado' : i === 2 ? 'terceiro' : 'fora';
              return (
                <div key={linha.timeId} className={`linha-time ${classe}`}>
                  <span className="pos">{i + 1}</span>
                  <Bandeira emoji={t.bandeira} tamanho={14} />
                  <span className="tnome">{t.nome}</span>
                  <span className="tpts">{linha.pontos}pt</span>
                  <span className="tsaldo">{linha.saldo >= 0 ? '+' : ''}{linha.saldo}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* oitavas */}
      <h3 className="bloco-tit mono" style={{ marginTop: 26 }}>OITAVAS DE FINAL</h3>
      <div className="oitavas">
        {oitavas.map((c) => {
          const a = nomeTime(c.timeA);
          const b = nomeTime(c.timeB);
          return (
            <div key={c.id} className="confronto">
              <span className="conf-n mono">{c.ordem}</span>
              <div className="conf-times">
                <div className="ct">
                  <Bandeira emoji={a.bandeira} tamanho={15} />
                  <span>{a.nome}</span>
                </div>
                <div className="ct-vs mono">x</div>
                <div className="ct">
                  <Bandeira emoji={b.bandeira} tamanho={15} />
                  <span>{b.nome}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="rodape-nota">
        🔜 Em breve: palpitar quem vence cada confronto, avançando até o campeão.
      </p>

      <style jsx>{`
        .progresso {
          background: rgba(244,196,48,0.1); border: 1px solid var(--gold-deep);
          color: var(--gold); border-radius: 12px; padding: 12px 15px;
          font-size: 13px; line-height: 1.5; margin-bottom: 22px;
        }
        .progresso.ok {
          background: rgba(29,185,84,0.12); border-color: var(--grass-bright);
          color: var(--grass-bright);
        }
        .progresso b { font-weight: 800; }
        .bloco-tit {
          font-size: 12px; letter-spacing: 0.16em; color: var(--gold);
          margin-bottom: 8px;
        }
        .legenda {
          font-size: 11px; color: var(--text-faint); margin-bottom: 14px;
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
        .dot.v { background: var(--grass-bright); }
        .dot.t { background: var(--gold); }
        .grid-grupos {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
        }
        .grupo-card {
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 12px; padding: 10px 12px;
        }
        .grupo-head {
          font-size: 12px; font-weight: 800; color: var(--text-dim);
          text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;
        }
        .linha-time {
          display: flex; align-items: center; gap: 7px;
          font-size: 12.5px; padding: 4px 0;
        }
        .pos {
          width: 16px; text-align: center; font-weight: 700;
          color: var(--text-faint); font-size: 11px;
        }
        .tnome { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tpts { font-weight: 700; font-size: 11px; color: var(--text-dim); }
        .tsaldo { font-size: 10px; color: var(--text-faint); width: 26px; text-align: right; }
        .linha-time.classificado .tnome { color: var(--grass-bright); }
        .linha-time.terceiro .tnome { color: var(--gold); }
        .linha-time.fora { opacity: 0.45; }
        .oitavas {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
        }
        .confronto {
          display: flex; align-items: center; gap: 9px;
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 11px; padding: 9px 11px;
        }
        .conf-n {
          width: 18px; height: 18px; flex-shrink: 0;
          background: var(--bg-2); border-radius: 5px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; color: var(--text-faint);
        }
        .conf-times { flex: 1; display: flex; flex-direction: column; gap: 3px; }
        .ct { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; }
        .ct span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ct-vs { font-size: 10px; color: var(--text-faint); padding-left: 22px; }
        .rodape-nota {
          margin-top: 20px; text-align: center; font-size: 12px;
          color: var(--text-faint); font-style: italic;
        }
        @media (max-width: 560px) {
          .grid-grupos, .oitavas { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
