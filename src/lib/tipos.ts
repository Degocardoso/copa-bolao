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

// Formata data/hora no padrão brasileiro
export function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function jogoComecou(inicio: string): boolean {
  return new Date(inicio).getTime() <= Date.now();
}

// Deriva o resultado (vitoria/empate) a partir do placar
export function resultadoDoPlacar(gc: number, gf: number): 'casa' | 'fora' | 'empate' {
  if (gc > gf) return 'casa';
  if (gf > gc) return 'fora';
  return 'empate';
}
