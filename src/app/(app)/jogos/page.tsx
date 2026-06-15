import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin } from '@/lib/supabase-admin';
import type { Jogo, Time, Palpite } from '@/lib/tipos';
import ListaJogos from './ListaJogos';

export const dynamic = 'force-dynamic';

export default async function PaginaJogos() {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const usuarioId = userData!.user!.id;

  const admin = criarClienteAdmin();

  const [
    { data: jogosGrupo },
    { data: times },
    { data: palpites },
    { data: jogosMataReais },
    { data: palpitesMata },
  ] = await Promise.all([
    supabase.from('jogos').select('*').eq('fase', 'grupos').order('inicio', { ascending: true }),
    supabase.from('times').select('*'),
    supabase.from('palpites').select('*').eq('usuario_id', usuarioId),
    admin.from('jogos').select('id, inicio, fase').neq('fase', 'grupos').order('inicio'),
    admin.from('palpites_mata').select('*').eq('usuario_id', usuarioId),
  ]);

  // Prazo: 15/jun/2026 às 23:59 (Brasília = UTC-3 → 16/jun 02:59 UTC)
  const PRAZO_MATA = new Date('2026-06-16T02:59:59Z');
  const mataComecou = new Date() > PRAZO_MATA;
  const primeiroMata = (jogosMataReais || [])[0]?.inicio || null;

  const listaJogosGrupo = (jogosGrupo as Jogo[]) || [];
  const totalGrupo = listaJogosGrupo.length;
  const idsGrupo = new Set(listaJogosGrupo.map((j) => j.id));
  const palpitadosGrupo = ((palpites as Palpite[]) || []).filter((p) =>
    idsGrupo.has(p.jogo_id)
  ).length;

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Os Jogos</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>
        Defina o placar de cada jogo. Trava no apito inicial. ⏱️
      </p>
      <ListaJogos
        jogos={listaJogosGrupo}
        times={(times as Time[]) || []}
        palpitesIniciais={(palpites as Palpite[]) || []}
        usuarioId={usuarioId}
        totalGrupo={totalGrupo}
        palpitadosGrupo={palpitadosGrupo}
        palpitesMataIniciais={palpitesMata || []}
        mataComecou={mataComecou}
        primeiroMata={primeiroMata}
      />
    </main>
  );
}
