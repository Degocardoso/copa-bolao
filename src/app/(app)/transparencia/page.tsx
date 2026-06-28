import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin } from '@/lib/supabase-admin';
import type { Jogo, Time } from '@/lib/tipos';
import { jogoComecou } from '@/lib/tipos';
import ListaTransparencia from './ListaTransparencia';

export const dynamic = 'force-dynamic';

type PalpiteRow = {
  usuario_id: string;
  jogo_id: number;
  gols_casa: number;
  gols_fora: number;
  avanca_penaltis: number | null;
  atualizado_em: string;
};

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
      admin.from('palpites').select('usuario_id, jogo_id, gols_casa, gols_fora, avanca_penaltis, atualizado_em'),
    ]);

  const jogosArr = (jogos as Jogo[]) || [];
  const palpitesArr = (palpites as PalpiteRow[]) || [];

  // acha o jogo da FINAL (manual fase='final' ou importado com rodada "Final",
  // ignorando semifinal e disputa de 3º lugar)
  const ehFinal = (j: Jogo) =>
    j.fase !== 'grupos' &&
    (j.fase === 'final' ||
      (/final/i.test(j.rodada || '') && !/semi|third|3rd|terceiro|3º|3o/i.test(j.rodada || '')));
  const finalJogo =
    jogosArr
      .filter(ehFinal)
      .sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''))[0] || null;
  const finalComecou = finalJogo ? jogoComecou(finalJogo.inicio) : false;

  // campeão palpitado por cada um (quem ele acha que vence a final)
  const campeaoPorUsuario: Record<string, number | null> = {};
  if (finalJogo) {
    for (const p of palpitesArr) {
      if (p.jogo_id !== finalJogo.id) continue;
      let champ: number | null;
      if (p.gols_casa > p.gols_fora) champ = finalJogo.time_casa;
      else if (p.gols_fora > p.gols_casa) champ = finalJogo.time_fora;
      else champ = p.avanca_penaltis ?? null;
      campeaoPorUsuario[p.usuario_id] = champ;
    }
  }

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Transparência</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>
        Veja os palpites de cada jogador. Os de jogos que ainda não começaram ficam
        ocultos até o apito — assim ninguém copia. 🔒
      </p>
      <ListaTransparencia
        jogadores={perfis || []}
        jogos={jogosArr}
        times={(times as Time[]) || []}
        palpites={palpitesArr}
        meuId={meuId}
        campeaoPorUsuario={campeaoPorUsuario}
        finalComecou={finalComecou}
      />
    </main>
  );
}
