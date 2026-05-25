import { criarClienteServidor } from '@/lib/supabase-server';
import type { Jogo, Time, Palpite } from '@/lib/tipos';
import { formatarData, jogoComecou, resultadoDoPlacar, pontosDoPalpite } from '@/lib/tipos';
import Bandeira from '@/components/Bandeira';

export const dynamic = 'force-dynamic';

export default async function PaginaMeusPalpites() {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const usuarioId = userData!.user!.id;

  const [{ data: jogos }, { data: times }, { data: palpites }] = await Promise.all([
    supabase.from('jogos').select('*').order('inicio', { ascending: true }),
    supabase.from('times').select('*'),
    supabase.from('palpites').select('*').eq('usuario_id', usuarioId),
  ]);

  const mapaTimes = new Map<number, Time>();
  (times as Time[] || []).forEach((t) => mapaTimes.set(t.id, t));
  const mapaPalpite = new Map<number, Palpite>();
  (palpites as Palpite[] || []).forEach((p) => mapaPalpite.set(p.jogo_id, p));

  const listaJogos = (jogos as Jogo[]) || [];
  const comPalpite = listaJogos.filter((j) => mapaPalpite.has(j.id));

  let totalPontos = 0;
  let cravados = 0;
  comPalpite.forEach((j) => {
    if (j.gols_casa != null && j.gols_fora != null) {
      const p = mapaPalpite.get(j.id)!;
      totalPontos += pontosDoPalpite(p.gols_casa, p.gols_fora, j.gols_casa, j.gols_fora);
      if (p.gols_casa === j.gols_casa && p.gols_fora === j.gols_fora) {
        cravados += 1;
      }
    }
  });

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Meus Palpites</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>
        Tudo que você palpitou, em um lugar só.
      </p>

      <div className="resumo">
        <div className="resumo-item">
          <div className="resumo-num display">{totalPontos}</div>
          <div className="resumo-lbl">pontos</div>
        </div>
        <div className="resumo-item">
          <div className="resumo-num display">{cravados}</div>
          <div className="resumo-lbl">placares cravados</div>
        </div>
        <div className="resumo-item">
          <div className="resumo-num display">{comPalpite.length}</div>
          <div className="resumo-lbl">palpites feitos</div>
        </div>
      </div>

      {comPalpite.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 38 }}>🎯</div>
          <p style={{ fontWeight: 700, color: 'var(--text)', margin: '8px 0 4px' }}>
            Você ainda não palpitou
          </p>
          <span style={{ fontSize: 13 }}>Vá em "Jogos" e mande seus palpites.</span>
        </div>
      ) : (
        <div className="lista">
          {comPalpite.map((j) => {
            const casa = j.time_casa ? mapaTimes.get(j.time_casa) : null;
            const fora = j.time_fora ? mapaTimes.get(j.time_fora) : null;
            const p = mapaPalpite.get(j.id)!;
            const travado = jogoComecou(j.inicio);
            const oficial = j.gols_casa != null && j.gols_fora != null;
            const cravou = oficial && p.gols_casa === j.gols_casa && p.gols_fora === j.gols_fora;
            const pts = oficial ? pontosDoPalpite(p.gols_casa, p.gols_fora, j.gols_casa, j.gols_fora) : 0;

            return (
              <div key={j.id} className={`linha ${cravou ? 'linha-cravou' : ''}`}>
                <div className="linha-times">
                  <span className="lt"><Bandeira emoji={casa?.bandeira} tamanho={16} /> {casa?.nome || 'A definir'}</span>
                  <span className="lt-vs">{p.gols_casa} × {p.gols_fora}</span>
                  <span className="lt lt-fim">{fora?.nome || 'A definir'} <Bandeira emoji={fora?.bandeira} tamanho={16} /></span>
                </div>
                <div className="linha-info">
                  <span className="mono data">{formatarData(j.inicio)}</span>
                  {!travado && <span className="tag tag-grass">aberto p/ editar</span>}
                  {travado && !oficial && <span className="tag tag-dim">aguardando jogo</span>}
                  {oficial && (
                    <span className={`tag ${pts >= 3 ? 'tag-grass' : pts === 1 ? 'tag-gold' : 'tag-locked'}`}>
                      oficial {j.gols_casa} × {j.gols_fora} · {pts > 0 ? `+${pts}` : '0'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .resumo {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
          margin-bottom: 22px;
        }
        .resumo-item {
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 14px; padding: 16px 10px; text-align: center;
        }
        .resumo-num { font-size: 30px; color: var(--grass-bright); }
        .resumo-lbl {
          font-size: 11px; color: var(--text-dim); text-transform: uppercase;
          letter-spacing: 0.05em; margin-top: 3px;
        }
        .lista { display: flex; flex-direction: column; gap: 10px; }
        .linha {
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 13px; padding: 13px 15px;
        }
        .linha-cravou { border-color: var(--grass-deep); }
        .linha-times {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; font-size: 14px; font-weight: 700;
        }
        .lt { flex: 1; display: flex; align-items: center; gap: 6px; }
        .lt-fim { justify-content: flex-end; }
        .lt-fim { text-align: right; }
        .lt-vs {
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 8px; padding: 4px 12px; font-weight: 800;
          color: var(--white); white-space: nowrap;
        }
        .linha-info {
          display: flex; align-items: center; gap: 8px; margin-top: 9px;
          flex-wrap: wrap;
        }
        .data { font-size: 11px; color: var(--text-faint); }
      `}</style>
    </main>
  );
}
