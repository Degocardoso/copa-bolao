import { criarClienteServidor } from '@/lib/supabase-server';
import type { LinhaRanking } from '@/lib/tipos';
import DispararSync from '@/components/DispararSync';

export const dynamic = 'force-dynamic';

export default async function PaginaRanking() {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const meuId = userData!.user!.id;

  const { data } = await supabase.from('ranking').select('*');
  const linhas = ((data as LinhaRanking[]) || []).sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.placares_cravados !== a.placares_cravados)
      return b.placares_cravados - a.placares_cravados;
    return a.nome.localeCompare(b.nome);
  });

  const medalhas = ['🥇', '🥈', '🥉'];

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <DispararSync />
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Ranking</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>
        Placar exato vale 3 pontos, acertar o resultado vale 1. Quem manda no bolão? 🏆
      </p>

      {linhas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36, color: 'var(--text-dim)' }}>
          Ninguém pontuou ainda. Assim que os jogos tiverem resultado, o ranking aparece aqui.
        </div>
      ) : (
        <div className="rank">
          {linhas.map((l, i) => {
            const eu = l.usuario_id === meuId;
            return (
              <div key={l.usuario_id} className={`rk ${eu ? 'rk-eu' : ''} ${i < 3 ? 'rk-top' : ''}`}>
                <div className="rk-pos">
                  {i < 3 ? <span className="medalha">{medalhas[i]}</span> : <span className="mono num">{i + 1}</span>}
                </div>
                <div className="rk-nome">
                  {l.nome}
                  {eu && <span className="voce">você</span>}
                  <span className="rk-sub">{l.placares_cravados} cravados · {l.jogos_avaliados} avaliados</span>
                </div>
                <div className="rk-pts">
                  <span className="pts display">{l.pontos}</span>
                  <span className="pts-lbl">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .rank { display: flex; flex-direction: column; gap: 8px; }
        .rk {
          display: flex; align-items: center; gap: 14px;
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 13px; padding: 13px 16px;
        }
        .rk-top { border-color: var(--gold-deep); }
        .rk-eu {
          background: rgba(29,185,84,0.1);
          border-color: var(--grass-bright);
        }
        .rk-pos { width: 32px; display: flex; justify-content: center; }
        .medalha { font-size: 24px; }
        .num { font-size: 16px; font-weight: 700; color: var(--text-faint); }
        .rk-nome {
          flex: 1; font-weight: 700; font-size: 15px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .voce {
          display: inline-block; width: fit-content;
          font-size: 10px; background: var(--grass-bright); color: #04140a;
          padding: 1px 7px; border-radius: 999px; font-weight: 800;
          text-transform: uppercase; margin-top: 2px;
        }
        .rk-sub { font-size: 11px; color: var(--text-faint); font-weight: 500; }
        .rk-pts { display: flex; align-items: baseline; gap: 4px; }
        .pts { font-size: 26px; color: var(--gold); }
        .pts-lbl { font-size: 12px; color: var(--text-dim); }
      `}</style>
    </main>
  );
}
