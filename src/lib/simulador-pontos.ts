// ============================================================
//  SIMULADOR — Pontuação do mata-mata (regra mista)
//
//  Por quem avança (a seleção que a pessoa levou à fase chegou lá de verdade):
//    oitavas 1 · quartas 2 · semi 3 · final/vice 5 · campeão 10
//  Bônus de placar: +3 quando o confronto imaginado aconteceu na vida real
//    e a pessoa cravou o placar.
// ============================================================

export const PONTOS_FASE: Record<string, number> = {
  oitavas: 1,   // chegar às oitavas
  quartas: 2,   // chegar às quartas
  semi: 3,      // chegar à semi
  final: 5,     // chegar à final (vice)
  campeao: 10,  // ser campeão
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

// Quem REALMENTE chegou a cada fase na vida real, e o campeão real.
// Derivado dos jogos de mata-mata oficiais (vindos da API).
export type RealidadeMata = {
  // conjunto de timeIds que alcançaram cada fase
  alcancou: Record<string, Set<number>>; // 'oitavas' | 'quartas' | 'semi' | 'final' | 'campeao'
  // resultados reais por "par de times" para o bônus de placar:
  // chave "menorId-maiorId" -> { golsMenor, golsMaior }
  placares: Map<string, { a: number; b: number; timeA: number; timeB: number }>;
};

function chavePar(t1: number, t2: number): string {
  return [t1, t2].sort((a, b) => a - b).join('-');
}

// Calcula os pontos de mata-mata de UMA pessoa.
export function pontosMataMata(
  palpites: PalpiteMata[],
  real: RealidadeMata
): { total: number; detalhes: string[] } {
  let total = 0;
  const detalhes: string[] = [];

  // 1) Pontos por quem avança.
  // Para cada confronto palpitado, o "vencedor" que a pessoa escolheu
  // representa um time que ela levou para a PRÓXIMA fase.
  // A fase alcançada pelo vencedor depende de qual confronto era.
  const proximaFase: Record<string, string> = {
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

  // 2) Bônus de placar: confronto imaginado aconteceu e cravou o placar.
  palpites.forEach((p) => {
    if (p.time_a == null || p.time_b == null) return;
    if (p.gols_a == null || p.gols_b == null) return;
    const real_ = real.placares.get(chavePar(p.time_a, p.time_b));
    if (!real_) return; // esse confronto não aconteceu na vida real
    // alinha os gols ao mesmo lado dos times
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
