import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin } from '@/lib/supabase-admin';
import TelaCraques from './TelaCraques';

export const dynamic = 'force-dynamic';

export default async function PaginaCraques() {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const usuarioId = userData!.user!.id;

  const admin = criarClienteAdmin();

  const [{ data: jogadores }, { data: meusPalpites }, { data: primeiros }] =
    await Promise.all([
      admin.from('jogadores').select('id, nome, time_nome, bandeira').order('time_nome'),
      admin.from('palpites_craque').select('tipo, posicao, jogador_id, qtd').eq('usuario_id', usuarioId),
      admin.from('jogos').select('inicio').order('inicio').limit(1),
    ]);

  // Prazo: 15/jun/2026 às 23:59 (Brasília = UTC-3 → 16/jun 02:59 UTC)
  const PRAZO_CRAQUE = new Date('2026-06-16T02:59:59Z');
  const travado = new Date() > PRAZO_CRAQUE;
  const primeiroJogo = primeiros && primeiros[0]?.inicio;

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Craques ⚽🅰️</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>
        Monte seu top 3 de artilheiros e de garçons, com quantos gols/assistências
        cada um faz. Encerra 15/jun às 23h59.
      </p>
      <TelaCraques
        jogadores={jogadores || []}
        meusPalpites={meusPalpites || []}
        travado={travado}
        primeiroJogo={primeiroJogo || null}
      />
    </main>
  );
}
