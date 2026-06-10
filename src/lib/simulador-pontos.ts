// ============================================================
//  SIMULADOR — Pontuação do mata-mata (regra mista)
//
//  Copa 2026: avos → oitavas → quartas → semi → final
//
//  Por cada time que o usuário colocou nos avos e chegou lá: +1
//  Por quem avança (vencedor chegou à fase seguinte):
//    oitavas +1 · quartas +2 · semi +3 · final/vice +5 · campeão +10
//  Bônus de placar: +3 se o confronto ocorreu na MESMA FASE e cravou o placar.
// ============================================================

export const PONTOS_FASE: Record<string, number> = {
  oitavas: 1,   // avançou dos avos para as oitavas
  quartas: 2,   // avançou das oitavas para as quartas
  semi: 3,      // avançou das quartas para a semi
  final: 5,     // chegou à final (vice-campeão)
  campeao: 10,  // campeão
};

export type PalpiteMata = {
  confronto: string;
  fase: string;
  time_a: number | null;
  time_b: number | null;
  vencedor: number | null;
  gols_a: number | null;
  gols_b: number | null;
};

export type RealidadeMata = {
  alcancou: Record<string, Set<number>>; // 'avos' | 'oitavas' | 'quartas' | 'semi' | 'final' | 'campeao'
  placares: Map<string, { a: number; b: number; timeA: number; timeB: number }>;
};

function chavePar(t1: number, t2: number): string {
  return [t1, t2].sort((a, b) => a - b).join('-');
}

export function pontosMataMata(
  palpites: PalpiteMata[],
  real: RealidadeMata
): { total: number; detalhes: string[] } {
  let total = 0;
  const detalhes: string[] = [];

  // 1a) +1 para cada time que o usuário colocou nos avos e chegou lá de verdade.
  palpites.filter((p) => p.fase === 'avos').forEach((p) => {
    const chegouAvos = real.alcancou['avos'];
    if (!chegouAvos) return;
    if (p.time_a && chegouAvos.has(p.time_a)) {
      total += 1;
      detalhes.push('avos time_a: +1');
    }
    if (p.time_b && chegouAvos.has(p.time_b)) {
      total += 1;
      detalhes.push('avos time_b: +1');
    }
  });

  // 1b) Pontos por quem avança (vencedor levado à próxima fase).
  const proximaFase: Record<string, string> = {
    avos: 'oitavas',
    oitavas: 'quartas',
    quartas: 'semi',
    semi: 'final',
    final: 'campeao',
  };

  palpites.forEach((p) => {
    if (!p.vencedor) return;
    const faseAlcancada = proximaFase[p.fase];
    if (!faseAlcancada) return;
    const chegou = real.alcancou[faseAlcancada];
    if (chegou && chegou.has(p.vencedor)) {
      const pts = PONTOS_FASE[faseAlcancada] || 0;
      total += pts;
      detalhes.push(`${faseAlcancada}: +${pts}`);
    }
  });

  // 2) Bônus de placar: confronto imaginado aconteceu NA MESMA FASE e cravou o placar.
  palpites.forEach((p) => {
    if (p.time_a == null || p.time_b == null) return;
    if (p.gols_a == null || p.gols_b == null) return;
    const real_ = real.placares.get(`${p.fase}-${chavePar(p.time_a, p.time_b)}`);
    if (!real_) return;
    let golsRealA: number, golsRealB: number;
    if (real_.timeA === p.time_a) {
      golsRealA = real_.a; golsRealB = real_.b;
    } else {
      golsRealA = real_.b; golsRealB = real_.a;
    }
    if (p.gols_a === golsRealA && p.gols_b === golsRealB) {
      total += 3;
      detalhes.push('bônus placar: +3');
    }
  });

  return { total, detalhes };
}
