export type Time = {
  id: number;
  nome: string;
  bandeira: string | null;
  grupo: string | null;
  chave_externa?: string | null;
};

export type Jogo = {
  id: number;
  fase: string;
  rodada: string | null;
  time_casa: number | null;
  time_fora: number | null;
  inicio: string;
  gols_casa: number | null;
  gols_fora: number | null;
  chave_externa?: string | null;
};

export type Palpite = {
  id?: number;
  usuario_id: string;
  jogo_id: number;
  gols_casa: number;
  gols_fora: number;
};

export type LinhaRanking = {
  usuario_id: string;
  nome: string;
  avatar_url: string | null;
  pontos: number;
  jogos_avaliados: number;
  placares_cravados: number;
};

// Formata data/hora no padrão brasileiro (timezone fixo para evitar mismatch server/client)
export function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function jogoComecou(inicio: string): boolean {
  return new Date(inicio).getTime() <= Date.now();
}

// Jogo real do mata-mata (fase != 'grupos'), usado para travar cada
// confronto da chave simulada individualmente, no apito daquele jogo.
export type ConfrontoReal = {
  fase: string;
  time_casa: number | null;
  time_fora: number | null;
  inicio: string;
};

// Acha, entre os jogos reais do mata-mata, o que tem os mesmos dois times
// na mesma fase — e diz se ele já comecou. Trava só ESSE confronto da
// chave simulada (cada um no seu próprio apito), não a chave inteira.
export function confrontoComecou(
  fase: string,
  timeA: number | null,
  timeB: number | null,
  jogosReais: ConfrontoReal[]
): boolean {
  if (!timeA || !timeB) return false;
  const real = jogosReais.find(
    (j) =>
      j.fase === fase &&
      ((j.time_casa === timeA && j.time_fora === timeB) ||
        (j.time_casa === timeB && j.time_fora === timeA))
  );
  return !!real && jogoComecou(real.inicio);
}

// Deriva o resultado (vitoria/empate) a partir do placar
export function resultadoDoPlacar(gc: number, gf: number): 'casa' | 'fora' | 'empate' {
  if (gc > gf) return 'casa';
  if (gf > gc) return 'fora';
  return 'empate';
}

// Calcula os pontos de um palpite contra o resultado oficial.
// Regra:
//   • empate com placar exato (ex: 2x2 e deu 2x2) ... 4 pontos
//   • vitória com placar exato (ex: 2x1 e deu 2x1) ... 3 pontos
//   • acertou só o resultado (quem ganhou ou que era empate) ... 1 ponto
//   • errou ... 0
export function pontosDoPalpite(
  palpiteCasa: number,
  palpiteFora: number,
  realCasa: number | null,
  realFora: number | null
): number {
  if (realCasa == null || realFora == null) return 0;
  const cravou = palpiteCasa === realCasa && palpiteFora === realFora;
  if (cravou) {
    // empate cravado vale mais
    return palpiteCasa === palpiteFora ? 4 : 3;
  }
  const sinal = (a: number, b: number) => Math.sign(a - b);
  if (sinal(palpiteCasa, palpiteFora) === sinal(realCasa, realFora)) return 1;
  return 0;
}

export type PalpiteMataSalvo = {
  confronto: string;
  fase: string;
  time_a: number | null;
  time_b: number | null;
  vencedor: number | null;
  gols_a: number | null;
  gols_b: number | null;
  atualizado_em?: string;
};
