import type { SupabaseClient } from '@supabase/supabase-js';
import { criarClienteAdmin } from './supabase-admin';
import { pontosDoPalpite } from './tipos';
import { pontosCraque, type PalpiteCraque, type PodioReal } from './craque-pontos';

export type LinhaRankingTotal = {
  usuario_id: string;
  nome: string;
  avatar_url: string | null;
  pontos: number;
  pontos_grupos: number;
  pontos_mata: number;
  pontos_gols: number;
  pontos_assist: number;
  placares_cravados: number;
  jogos_avaliados: number;
};

// Bônus por acertar quem passou nos pênaltis (só quando o jogo real
// terminou empatado e foi decidido na disputa).
const BONUS_PENALTIS = 3;

export async function calcularRankingTotal(supabase: SupabaseClient): Promise<LinhaRankingTotal[]> {
  const admin = criarClienteAdmin();

  // jogos reais do mata-mata, com resultado e quem venceu nos pênaltis
  const { data: jogosMataData } = await admin
    .from('jogos')
    .select('id, gols_casa, gols_fora, vencedor_penaltis')
    .neq('fase', 'grupos');
  const jogosMata = jogosMataData || [];
  const idsMata = jogosMata.map((j) => j.id);

  const [
    { data: grupos },
    { data: pCraque },
    { data: jogadores },
  ] = await Promise.all([
    supabase.from('ranking').select('*'),
    supabase.from('palpites_craque').select('usuario_id, tipo, posicao, jogador_id, qtd'),
    supabase.from('jogadores').select('id, pos_artilheiro, gols_real, pos_assistencia, assist_real'),
  ]);

  // palpites das pessoas nos jogos do mata-mata (só busca se houver jogos)
  let palpitesMata: Record<string, unknown>[] = [];
  if (idsMata.length) {
    const { data } = await admin
      .from('palpites')
      .select('usuario_id, jogo_id, gols_casa, gols_fora, avanca_penaltis')
      .in('jogo_id', idsMata);
    palpitesMata = (data as Record<string, unknown>[]) || [];
  }

  // resultado real de cada jogo do mata-mata
  const realMata = new Map<number, { gc: number | null; gf: number | null; vp: number | null }>();
  for (const j of jogosMata) {
    realMata.set(j.id, {
      gc: j.gols_casa as number | null,
      gf: j.gols_fora as number | null,
      vp: j.vencedor_penaltis as number | null,
    });
  }

  // pontos de mata-mata por usuário (placar 4/3/1 + bônus de pênaltis)
  const mataByUser = new Map<string, { pontos: number; cravados: number; avaliados: number }>();
  for (const p of palpitesMata) {
    const jogo = realMata.get(p.jogo_id as number);
    if (!jogo || jogo.gc == null || jogo.gf == null) continue; // sem resultado ainda

    const uid = p.usuario_id as string;
    const pgc = p.gols_casa as number;
    const pgf = p.gols_fora as number;

    const entry = mataByUser.get(uid) || { pontos: 0, cravados: 0, avaliados: 0 };
    entry.avaliados += 1;

    let pts = pontosDoPalpite(pgc, pgf, jogo.gc, jogo.gf);

    // bônus: jogo real empatou (foi pros pênaltis), a pessoa palpitou empate
    // e acertou quem passou.
    const realEmpate = jogo.gc === jogo.gf;
    const palpiteEmpate = pgc === pgf;
    if (
      realEmpate &&
      jogo.vp != null &&
      palpiteEmpate &&
      (p.avanca_penaltis as number | null) === jogo.vp
    ) {
      pts += BONUS_PENALTIS;
    }

    if (pgc === jogo.gc && pgf === jogo.gf) entry.cravados += 1;
    entry.pontos += pts;
    mataByUser.set(uid, entry);
  }

  // pódio real de artilheiro / assistência
  const podioGols: PodioReal = {};
  const podioAssist: PodioReal = {};
  for (const j of (jogadores || [])) {
    if (j.pos_artilheiro != null && j.gols_real != null)
      podioGols[j.pos_artilheiro] = { jogadorId: j.id, qtd: j.gols_real };
    if (j.pos_assistencia != null && j.assist_real != null)
      podioAssist[j.pos_assistencia] = { jogadorId: j.id, qtd: j.assist_real };
  }

  const craqueByUser = new Map<string, { gols: PalpiteCraque[]; assist: PalpiteCraque[] }>();
  for (const p of (pCraque || [])) {
    if (!craqueByUser.has(p.usuario_id)) craqueByUser.set(p.usuario_id, { gols: [], assist: [] });
    const entry = craqueByUser.get(p.usuario_id)!;
    const row: PalpiteCraque = { posicao: p.posicao, jogador_id: p.jogador_id, qtd: p.qtd };
    if (p.tipo === 'gols') entry.gols.push(row);
    else entry.assist.push(row);
  }

  return (grupos || []).map((g: Record<string, unknown>) => {
    const uid = g.usuario_id as string;
    const pontosGrupos = (g.pontos as number) ?? 0;
    const m = mataByUser.get(uid) || { pontos: 0, cravados: 0, avaliados: 0 };
    const cr = craqueByUser.get(uid);
    const pGols = cr ? pontosCraque(cr.gols, podioGols) : 0;
    const pAssist = cr ? pontosCraque(cr.assist, podioAssist) : 0;

    return {
      usuario_id: uid,
      nome: g.nome as string,
      avatar_url: (g.avatar_url as string | null) ?? null,
      pontos_grupos: pontosGrupos,
      pontos_mata: m.pontos,
      pontos_gols: pGols,
      pontos_assist: pAssist,
      pontos: pontosGrupos + m.pontos + pGols + pAssist,
      placares_cravados: ((g.placares_cravados as number) ?? 0) + m.cravados,
      jogos_avaliados: ((g.jogos_avaliados as number) ?? 0) + m.avaliados,
    };
  });
}
