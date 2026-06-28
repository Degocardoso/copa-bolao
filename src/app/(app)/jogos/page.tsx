import { criarClienteServidor } from '@/lib/supabase-server';
import type { Jogo, Time, Palpite } from '@/lib/tipos';
import ListaJogos from './ListaJogos';

export const dynamic = 'force-dynamic';

export default async function PaginaJogos() {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const usuarioId = userData!.user!.id;

  const [
    { data: jogosGrupo },
    { data: jogosMata },
    { data: times },
    { data: palpites },
  ] = await Promise.all([
    supabase.from('jogos').select('*').eq('fase', 'grupos').order('inicio', { ascending: true }),
    supabase.from('jogos').select('*').neq('fase', 'grupos').order('inicio', { ascending: true }),
    supabase.from('times').select('*'),
    supabase.from('palpites').select('*').eq('usuario_id', usuarioId),
  ]);

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Os Jogos</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>
        Defina o placar de cada jogo. Trava no apito inicial. ⏱️
      </p>
      <ListaJogos
        jogos={(jogosGrupo as Jogo[]) || []}
        jogosMata={(jogosMata as Jogo[]) || []}
        times={(times as Time[]) || []}
        palpitesIniciais={(palpites as Palpite[]) || []}
        usuarioId={usuarioId}
      />
    </main>
  );
}
