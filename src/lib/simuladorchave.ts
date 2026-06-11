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

const QTD_MELHORES_TERCEIROS = 8;

// Chaveamento oficial FIFA 2026 — 8 confrontos fixos dos 16 avos de final
// [posA, grupoA, posB, grupoB]  (pos: 1=1º, 2=2º colocado)
type AvosFixo = { posA: number; grupoA: string; posB: number; grupoB: string };

const AVOS_FIXOS: AvosFixo[] = [
  { posA: 2, grupoA: 'A', posB: 2, grupoB: 'B' },
  { posA: 2, grupoA: 'K', posB: 2, grupoB: 'L' },
  { posA: 2, grupoA: 'E', posB: 2, grupoB: 'I' },
  { posA: 2, grupoA: 'D', posB: 2, grupoB: 'G' },
  { posA: 1, grupoA: 'F', posB: 2, grupoB: 'C' },
  { posA: 1, grupoA: 'C', posB: 2, grupoB: 'F' },
  { posA: 1, grupoA: 'H', posB: 2, grupoB: 'J' },
  { posA: 1, grupoA: 'J', posB: 2, grupoB: 'H' },
];

// 8 confrontos variáveis: 1º colocado vs melhor 3º colocado elegível
// elegiveis: quais grupos podem fornecer o adversário 3º colocado (Anexo C FIFA)
type AvosTerceiro = { grupo: string; elegiveis: string[] };

const AVOS_COM_TERCEIROS: AvosTerceiro[] = [
  { grupo: 'A', elegiveis: ['C', 'E', 'F', 'H', 'I'] },
  { grupo: 'B', elegiveis: ['E', 'F', 'G', 'I', 'J'] },
  { grupo: 'D', elegiveis: ['B', 'E', 'F', 'I', 'J'] },
  { grupo: 'E', elegiveis: ['A', 'B', 'C', 'D', 'F'] },
  { grupo: 'G', elegiveis: ['A', 'E', 'H', 'I', 'J'] },
  { grupo: 'I', elegiveis: ['C', 'D', 'F', 'G', 'H'] },
  { grupo: 'K', elegiveis: ['D', 'E', 'I', 'J', 'L'] },
  { grupo: 'L', elegiveis: ['E', 'H', 'I', 'J', 'K'] },
];

// Atribui os 8 terceiros qualificados aos 8 slots variáveis.
// Usa backtracking com heurística "mais restrito primeiro" para garantir
// atribuição válida respeitando os grupos elegíveis de cada slot.
function atribuirTerceiros(
  slots: AvosTerceiro[],
  terceiros: LinhaGrupo[],
  timePorId: Map<number, Time>
): (number | null)[] {
  const terceirosPorGrupo = new Map<string, number>();
  terceiros.forEach((t) => {
    const g = timePorId.get(t.timeId)?.grupo;
    if (g) terceirosPorGrupo.set(g, t.timeId);
  });

  const resultado: (number | null)[] = new Array(slots.length).fill(null);

  // Ordena índices de slots pelo número de candidatos elegíveis (mais restrito primeiro)
  const ordemSlots = slots
    .map((s, i) => ({ i, candidatos: s.elegiveis.filter((g) => terceirosPorGrupo.has(g)) }))
    .sort((a, b) => a.candidatos.length - b.candidatos.length);

  function bt(pos: number, usados: Set<string>): boolean {
    if (pos >= ordemSlots.length) return true;
    const { i, candidatos } = ordemSlots[pos];
    const disponiveis = candidatos.filter((g) => !usados.has(g));

    if (disponiveis.length === 0) {
      resultado[i] = null;
      return bt(pos + 1, usados);
    }

    for (const g of disponiveis) {
      usados.add(g);
      resultado[i] = terceirosPorGrupo.get(g)!;
      if (bt(pos + 1, usados)) return true;
      usados.delete(g);
    }
    return false;
  }

  bt(0, new Set());
  return resultado;
}

// Monta os 16 confrontos dos avos de final segundo o chaveamento oficial FIFA 2026.
// 8 confrontos fixos (1º vs 2º e 2º vs 2º predefinidos por grupo)
// 8 confrontos variáveis (1º vs melhor 3º elegível, via Anexo C FIFA)
export function montarAvos(
  classificacoes: ClassificacaoGrupo[],
  timePorId: Map<number, Time>
): Confronto[] {
  const classifPorGrupo = new Map<string, ClassificacaoGrupo>();
  classificacoes.forEach((c) => classifPorGrupo.set(c.grupo, c));

  const getTime = (pos: number, grupo: string): number | null =>
    classifPorGrupo.get(grupo)?.posicoes[pos - 1]?.timeId ?? null;

  const confrontos: Confronto[] = [];

  // 8 confrontos fixos (posição e grupo já definidos)
  AVOS_FIXOS.forEach(({ posA, grupoA, posB, grupoB }, i) => {
    confrontos.push({
      id: `avos-${i + 1}`,
      fase: 'avos',
      ordem: i + 1,
      timeA: getTime(posA, grupoA),
      timeB: getTime(posB, grupoB),
    });
  });

  // 8 confrontos variáveis (1º vs 3º elegível)
  const terceiros = melhoresTerceiros(classificacoes, QTD_MELHORES_TERCEIROS, timePorId);
  const atribuicoes = atribuirTerceiros(AVOS_COM_TERCEIROS, terceiros, timePorId);

  AVOS_COM_TERCEIROS.forEach(({ grupo }, i) => {
    confrontos.push({
      id: `avos-${9 + i}`,
      fase: 'avos',
      ordem: 9 + i,
      timeA: getTime(1, grupo),
      timeB: atribuicoes[i],
    });
  });

  return confrontos;
}

// Mantém o alias para compatibilidade com imports existentes
export const montarOitavas = montarAvos;

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
