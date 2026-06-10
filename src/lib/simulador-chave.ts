// ============================================================
//  SIMULADOR — Montagem da chave do mata-mata
//  Copa 2026: 48 times → 32 avançam → estrutura de 5 fases:
//  avos (32→16) · oitavas (16→8) · quartas · semi · final
// ============================================================

import type { Time } from './tipos';
import type { ClassificacaoGrupo, LinhaGrupo } from './simulador-grupos';
import { melhoresTerceiros } from './simulador-grupos';

export type Confronto = {
  id: string;
  fase: 'avos' | 'oitavas' | 'quartas' | 'semi' | 'final' | 'terceiro';
  ordem: number;
  timeA: number | null;
  timeB: number | null;
};

export type Chave = {
  avos: Confronto[];
  oitavas: Confronto[];
  quartas: Confronto[];
  semi: Confronto[];
  final: Confronto[];
};

// Copa 2026: 12 grupos → top 2 + 8 melhores terceiros = 32 times no mata-mata
const QTD_MELHORES_TERCEIROS = 8;

// Monta os 32 AVOS DE FINAL (primeira fase do mata-mata, 16 confrontos).
export function montarAvos(
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

  const ordenarBloco = (arr: LinhaGrupo[]) =>
    [...arr].sort((a, b) =>
      b.pontos - a.pontos || b.saldo - a.saldo || b.golsPro - a.golsPro
    );

  const seeds = [
    ...ordenarBloco(primeiros),
    ...ordenarBloco(segundos),
    ...ordenarBloco(terceiros),
  ];

  const n = seeds.length;
  const ordemBracket = ordemDeChaveamento(n);
  const confrontos: Confronto[] = [];
  const pares = Math.floor(n / 2);
  for (let i = 0; i < pares; i++) {
    const seedA = ordemBracket[i * 2] - 1;
    const seedB = ordemBracket[i * 2 + 1] - 1;
    const a = seeds[seedA];
    const b = seeds[seedB];
    confrontos.push({
      id: `avos-${i + 1}`,
      fase: 'avos',
      ordem: i + 1,
      timeA: a ? a.timeId : null,
      timeB: b ? b.timeId : null,
    });
  }
  return confrontos;
}

// Mantém o alias para compatibilidade com imports existentes
export const montarOitavas = montarAvos;

function ordemDeChaveamento(tamanho: number): number[] {
  let rodada = [1, 2];
  while (rodada.length < tamanho) {
    const n = rodada.length * 2;
    const proxima: number[] = [];
    for (const s of rodada) {
      proxima.push(s);
      proxima.push(n + 1 - s);
    }
    rodada = proxima;
  }
  return rodada;
}

export function estruturaFasesSeguintes(qtdAvos: number): {
  oitavas: Confronto[];
  quartas: Confronto[];
  semi: Confronto[];
  final: Confronto[];
} {
  const fazer = (fase: Confronto['fase'], qtd: number): Confronto[] =>
    Array.from({ length: qtd }, (_, i) => ({
      id: `${fase}-${i + 1}`,
      fase,
      ordem: i + 1,
      timeA: null,
      timeB: null,
    }));

  const qOitavas = Math.floor(qtdAvos / 2);
  const qQuartas = Math.floor(qOitavas / 2);
  const qSemi = Math.floor(qQuartas / 2);
  return {
    oitavas: fazer('oitavas', qOitavas),
    quartas: fazer('quartas', qQuartas),
    semi: fazer('semi', qSemi),
    final: fazer('final', 1),
  };
}

// Cadeia de progressão: avos→oitavas→quartas→semi→final
export function proximoConfronto(
  fase: Confronto['fase'],
  ordem: number
): { fase: Confronto['fase']; ordem: number; lado: 'A' | 'B' } | null {
  if (fase === 'avos') {
    return { fase: 'oitavas', ordem: Math.ceil(ordem / 2), lado: ordem % 2 === 1 ? 'A' : 'B' };
  }
  if (fase === 'oitavas') {
    return { fase: 'quartas', ordem: Math.ceil(ordem / 2), lado: ordem % 2 === 1 ? 'A' : 'B' };
  }
  if (fase === 'quartas') {
    return { fase: 'semi', ordem: Math.ceil(ordem / 2), lado: ordem % 2 === 1 ? 'A' : 'B' };
  }
  if (fase === 'semi') {
    return { fase: 'final', ordem: 1, lado: ordem % 2 === 1 ? 'A' : 'B' };
  }
  return null;
}
