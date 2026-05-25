// ============================================================
//  SIMULADOR — Montagem da chave do mata-mata
//  Pega as classificações dos grupos (1º, 2º e melhores 3ºs) e
//  monta os confrontos das oitavas, de forma consistente e igual
//  para todos. As fases seguintes saem dos palpites da pessoa.
// ============================================================

import type { Time } from './tipos';
import type { ClassificacaoGrupo, LinhaGrupo } from './simulador-grupos';
import { melhoresTerceiros } from './simulador-grupos';

export type Confronto = {
  id: string;          // identificador estável do confronto (ex: 'oitavas-1')
  fase: 'oitavas' | 'quartas' | 'semi' | 'final' | 'terceiro';
  ordem: number;       // posição na fase (1, 2, 3...)
  timeA: number | null;
  timeB: number | null;
};

export type Chave = {
  oitavas: Confronto[];
  quartas: Confronto[];
  semi: Confronto[];
  final: Confronto[];
};

// Quantos times classificam por posição (formato 2026: 32 no mata-mata).
// 12 primeiros + 12 segundos + 8 melhores terceiros = 32.
const QTD_MELHORES_TERCEIROS = 8;

// Monta as OITAVAS a partir das classificações de grupo.
// Estratégia consistente: lista os 32 classificados numa ordem fixa
// (1ºs por grupo, 2ºs por grupo, melhores 3ºs) e cruza extremos
// (1º x 32º, 2º x 31º...), garantindo chave equilibrada e idêntica p/ todos.
export function montarOitavas(
  classificacoes: ClassificacaoGrupo[],
  timePorId: Map<number, Time>
): Confronto[] {
  const primeiros: LinhaGrupo[] = [];
  const segundos: LinhaGrupo[] = [];
  classificacoes.forEach((c) => {
    if (c.posicoes[0]) primeiros.push(c.posicoes[0]);
    if (c.posicoes[1]) segundos.push(c.posicoes[1]);
  });
  const terceiros = melhoresTerceiros(classificacoes, QTD_MELHORES_TERCEIROS, timePorId);

  // ordem de "força": todos os 1ºs, depois 2ºs, depois 3ºs.
  // dentro de cada bloco, ordena por desempenho (pontos/saldo/gols).
  const ordenarBloco = (arr: LinhaGrupo[]) =>
    [...arr].sort((a, b) =>
      b.pontos - a.pontos || b.saldo - a.saldo || b.golsPro - a.golsPro
    );

  const seeds = [
    ...ordenarBloco(primeiros),
    ...ordenarBloco(segundos),
    ...ordenarBloco(terceiros),
  ];

  // forma 16 confrontos cruzando o melhor com o pior (seed 1 x seed 32...)
  const confrontos: Confronto[] = [];
  const n = seeds.length;
  const pares = Math.floor(n / 2);
  for (let i = 0; i < pares; i++) {
    const a = seeds[i];
    const b = seeds[n - 1 - i];
    confrontos.push({
      id: `oitavas-${i + 1}`,
      fase: 'oitavas',
      ordem: i + 1,
      timeA: a ? a.timeId : null,
      timeB: b ? b.timeId : null,
    });
  }
  return confrontos;
}

// Cria os confrontos vazios das fases seguintes (preenchidos pelos
// palpites de quem vence cada jogo). A árvore conecta de forma fixa:
// vencedor de oitavas-1 e oitavas-2 -> quartas-1, e assim por diante.
export function estruturaFasesSeguintes(qtdOitavas: number): {
  quartas: Confronto[];
  semi: Confronto[];
  final: Confronto[];
} {
  const fazer = (
    fase: Confronto['fase'],
    qtd: number
  ): Confronto[] =>
    Array.from({ length: qtd }, (_, i) => ({
      id: `${fase}-${i + 1}`,
      fase,
      ordem: i + 1,
      timeA: null,
      timeB: null,
    }));

  const qQuartas = Math.floor(qtdOitavas / 2);
  const qSemi = Math.floor(qQuartas / 2);
  return {
    quartas: fazer('quartas', qQuartas),
    semi: fazer('semi', qSemi),
    final: fazer('final', 1),
  };
}

// Diz para qual confronto da próxima fase vai o vencedor de um confronto.
// Ex: vencedor de oitavas-1 e oitavas-2 vão para quartas-1.
export function proximoConfronto(
  fase: Confronto['fase'],
  ordem: number
): { fase: Confronto['fase']; ordem: number; lado: 'A' | 'B' } | null {
  if (fase === 'oitavas') {
    return { fase: 'quartas', ordem: Math.ceil(ordem / 2), lado: ordem % 2 === 1 ? 'A' : 'B' };
  }
  if (fase === 'quartas') {
    return { fase: 'semi', ordem: Math.ceil(ordem / 2), lado: ordem % 2 === 1 ? 'A' : 'B' };
  }
  if (fase === 'semi') {
    return { fase: 'final', ordem: 1, lado: ordem % 2 === 1 ? 'A' : 'B' };
  }
  return null; // final não tem próximo
}
