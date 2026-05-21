import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin } from '@/lib/supabase-admin';
import type { Jogo, Time } from '@/lib/tipos';
import ListaTransparencia from './ListaTransparencia';

export const dynamic = 'force-dynamic';

export default async function PaginaTransparencia() {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const meuId = userData!.user!.id;

  const admin = criarClienteAdmin();

  // jogadores aprovados, jogos, times e todos os palpites
  const [{ data: perfis }, { data: jogos }, { data: times }, { data: palpites }] =
    await Promise.all([
      admin.from('perfis').select('id, nome, avatar_url, status').eq('status', 'aprovado').order('nome'),
      admin.from('jogos').select('*').order('inicio'),
      admin.from('times').select('*'),
      admin.from('palpites').select('usuario_id, jogo_id, gols_casa, gols_fora, atualizado_em'),
    ]);

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Transparência</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>
        Veja os palpites de cada jogador. Os de jogos que ainda não começaram ficam
        ocultos até o apito — assim ninguém copia. 🔒
      </p>
      <ListaTransparencia
        jogadores={perfis || []}
        jogos={(jogos as Jogo[]) || []}
        times={(times as Time[]) || []}
        palpites={palpites || []}
        meuId={meuId}
      />
    </main>
  );
}
