// ============================================================
//  Pontuação de Artilheiros / Assistências (top 3 em ordem)
//
//  Escala (por categoria, igual para gols e assistências):
//   - jogador na POSIÇÃO certa, sem cravar a quantidade ... 2 pts
//   - jogador na POSIÇÃO certa, com a quantidade exata ..... 5 pts
//   - os 3 na posição certa, sem todas as quantidades ...... 8 pts (bônus pódio)
//   - os 3 na posição certa + todas as quantidades exatas .. 15 pts (gabarito)
// ============================================================

export type PalpiteCraque = {
  posicao: number;        // 1, 2 ou 3
  jogador_id: number | null;
  qtd: number | null;     // gols/assistências previstos
};

// O pódio real: posição -> { jogadorId, quantidade }
export type PodioReal = Record<number, { jogadorId: number; qtd: number }>;

export function pontosCraque(
  palpites: PalpiteCraque[],
  real: PodioReal
): number {
  // organiza palpites por posição
  const porPos = new Map<number, PalpiteCraque>();
  palpites.forEach((p) => porPos.set(p.posicao, p));

  let acertosPosicao = 0;        // jogador certo na posição certa
  let acertosPosicaoComQtd = 0;  // + quantidade exata

  for (let pos = 1; pos <= 3; pos++) {
    const pal = porPos.get(pos);
    const r = real[pos];
    if (!pal || !r || pal.jogador_id == null) continue;
    if (pal.jogador_id === r.jogadorId) {
      acertosPosicao += 1;
      if (pal.qtd != null && pal.qtd === r.qtd) {
        acertosPosicaoComQtd += 1;
      }
    }
  }

  // gabarito: 3 na posição + 3 quantidades
  if (acertosPosicao === 3 && acertosPosicaoComQtd === 3) return 15;
  // pódio completo (3 jogadores na posição) mas sem todas as quantidades
  if (acertosPosicao === 3) return 8;
  // caso geral: 5 por jogador com quantidade certa, 2 por jogador só posição
  const comQtd = acertosPosicaoComQtd;
  const soPosicao = acertosPosicao - acertosPosicaoComQtd;
  return comQtd * 5 + soPosicao * 2;
}
