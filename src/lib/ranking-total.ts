import type { SupabaseClient } from '@supabase/supabase-js';
import { pontosMataMata, type PalpiteMata, type RealidadeMata } from './simulador-pontos';
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

export async function calcularRankingTotal(supabase: SupabaseClient): Promise<LinhaRankingTotal[]> {
  const [
    { data: grupos },
    { data: pMata },
    { data: jogosMata },
    { data: pCraque },
    { data: jogadores },
  ] = await Promise.all([
    supabase.from('ranking').select('*'),
    supabase.from('palpites_mata').select('usuario_id, confronto, fase, time_a, time_b, vencedor, gols_a, gols_b'),
    supabase.from('jogos').select('fase, time_casa, time_fora, gols_casa, gols_fora').neq('fase', 'grupos'),
    supabase.from('palpites_craque').select('usuario_id, tipo, posicao, jogador_id, qtd'),
    supabase.from('jogadores').select('id, pos_artilheiro, gols_real, pos_assistencia, assist_real'),
  ]);

  const realMata = buildRealidade(jogosMata || []);

  const mataByUser = new Map<string, PalpiteMata[]>();
  for (const p of (pMata || [])) {
    if (!mataByUser.has(p.usuario_id)) mataByUser.set(p.usuario_id, []);
    mataByUser.get(p.usuario_id)!.push(p as PalpiteMata);
  }

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
    const pMataTotal = mataByUser.has(uid)
      ? pontosMataMata(mataByUser.get(uid)!, realMata).total
      : 0;
    const cr = craqueByUser.get(uid);
    const pGols = cr ? pontosCraque(cr.gols, podioGols) : 0;
    const pAssist = cr ? pontosCraque(cr.assist, podioAssist) : 0;

    return {
      usuario_id: uid,
      nome: g.nome as string,
      avatar_url: (g.avatar_url as string | null) ?? null,
      pontos_grupos: pontosGrupos,
      pontos_mata: pMataTotal,
      pontos_gols: pGols,
      pontos_assist: pAssist,
      pontos: pontosGrupos + pMataTotal + pGols + pAssist,
      placares_cravados: (g.placares_cravados as number) ?? 0,
      jogos_avaliados: (g.jogos_avaliados as number) ?? 0,
    };
  });
}

function buildRealidade(jogos: Record<string, unknown>[]): RealidadeMata {
  const alcancou: Record<string, Set<number>> = {
    oitavas: new Set(),
    quartas: new Set(),
    semi: new Set(),
    final: new Set(),
    campeao: new Set(),
  };
  const placares = new Map<string, { a: number; b: number; timeA: number; timeB: number }>();

  for (const j of jogos) {
    const fase = j.fase as string;
    const casa = j.time_casa as number | null;
    const fora = j.time_fora as number | null;
    if (!casa || !fora) continue;

    if (alcancou[fase]) {
      alcancou[fase].add(casa);
      alcancou[fase].add(fora);
    }

    const gc = j.gols_casa as number | null;
    const gf = j.gols_fora as number | null;
    if (gc != null && gf != null) {
      const key = [casa, fora].sort((a, b) => a - b).join('-');
      placares.set(key, { a: gc, b: gf, timeA: casa, timeB: fora });

      if (fase === 'final') {
        if (gc > gf) alcancou.campeao.add(casa);
        else if (gf > gc) alcancou.campeao.add(fora);
      }
    }
  }

  return { alcancou, placares };
}
