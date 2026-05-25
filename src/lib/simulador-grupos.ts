// ============================================================
//  SIMULADOR — Cálculo da classificação dos grupos
//  A partir dos palpites de PLACAR de uma pessoa nos jogos de
//  grupo, calcula a tabela de cada grupo (pontos, saldo, gols).
// ============================================================

import type { Jogo, Time } from './tipos';

export type Palpitinho = {
  jogo_id: number;
  gols_casa: number;
  gols_fora: number;
};

export type LinhaGrupo = {
  timeId: number;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
  jogos: number;
};

export type ClassificacaoGrupo = {
  grupo: string;
  // ordenado: índice 0 = 1º colocado, 1 = 2º, etc.
  posicoes: LinhaGrupo[];
};

// Calcula a classificação de TODOS os grupos para um conjunto de palpites.
// Só usa jogos da fase de grupos. Jogos sem palpite contam como não disputados.
export function calcularGrupos(
  jogos: Jogo[],
  times: Time[],
  palpites: Palpitinho[]
): ClassificacaoGrupo[] {
  const palpitePorJogo = new Map<number, Palpitinho>();
  palpites.forEach((p) => palpitePorJogo.set(p.jogo_id, p));

  const timePorId = new Map<number, Time>();
  times.forEach((t) => timePorId.set(t.id, t));

  // inicializa uma linha por time que tem grupo definido
  const linhas = new Map<number, LinhaGrupo>();
  const gruposSet = new Set<string>();
  times.forEach((t) => {
    if (t.grupo) {
      gruposSet.add(t.grupo);
      linhas.set(t.id, {
        timeId: t.id,
        pontos: 0, vitorias: 0, empates: 0, derrotas: 0,
        golsPro: 0, golsContra: 0, saldo: 0, jogos: 0,
      });
    }
  });

  // processa cada jogo de grupo que tem palpite
  jogos
    .filter((j) => j.fase === 'grupos' && j.time_casa && j.time_fora)
    .forEach((j) => {
      const pal = palpitePorJogo.get(j.id);
      if (!pal) return; // sem palpite, não conta
      const casa = linhas.get(j.time_casa!);
      const fora = linhas.get(j.time_fora!);
      if (!casa || !fora) return;

      const gc = pal.gols_casa;
      const gf = pal.gols_fora;
      casa.golsPro += gc; casa.golsContra += gf; casa.jogos += 1;
      fora.golsPro += gf; fora.golsContra += gc; fora.jogos += 1;

      if (gc > gf) {
        casa.pontos += 3; casa.vitorias += 1; fora.derrotas += 1;
      } else if (gf > gc) {
        fora.pontos += 3; fora.vitorias += 1; casa.derrotas += 1;
      } else {
        casa.pontos += 1; fora.pontos += 1; casa.empates += 1; fora.empates += 1;
      }
    });

  // recalcula saldo
  linhas.forEach((l) => { l.saldo = l.golsPro - l.golsContra; });

  // monta a classificação por grupo, já ordenada
  const grupos = Array.from(gruposSet).sort();
  return grupos.map((grupo) => {
    const doGrupo = Array.from(linhas.values()).filter(
      (l) => timePorId.get(l.timeId)?.grupo === grupo
    );
    doGrupo.sort((a, b) => compararTimes(a, b, timePorId));
    return { grupo, posicoes: doGrupo };
  });
}

// Critérios de desempate (ordem FIFA simplificada e estável):
// 1) pontos, 2) saldo, 3) gols pró, 4) nome (estável, evita empate ambíguo)
function compararTimes(
  a: LinhaGrupo,
  b: LinhaGrupo,
  timePorId: Map<number, Time>
): number {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos;
  if (b.saldo !== a.saldo) return b.saldo - a.saldo;
  if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;
  const na = timePorId.get(a.timeId)?.nome || '';
  const nb = timePorId.get(b.timeId)?.nome || '';
  return na.localeCompare(nb);
}

// Retorna os N melhores 3º colocados entre todos os grupos.
// Usado no formato de 48 seleções (2026): os 8 melhores terceiros avançam.
export function melhoresTerceiros(
  classificacoes: ClassificacaoGrupo[],
  quantos: number,
  timePorId: Map<number, Time>
): LinhaGrupo[] {
  const terceiros = classificacoes
    .map((c) => c.posicoes[2])
    .filter((l): l is LinhaGrupo => !!l);
  terceiros.sort((a, b) => compararTimes(a, b, timePorId));
  return terceiros.slice(0, quantos);
}
