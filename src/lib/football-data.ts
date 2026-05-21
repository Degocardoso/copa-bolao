// Cliente da API Football-Data.org (plano grátis cobre a Copa do Mundo).
// Docs: https://www.football-data.org/documentation/quickstart
//
// O código da competição "FIFA World Cup" na Football-Data é 'WC'.
// No plano grátis: 10 requisições/minuto. Por isso fazemos cache no banco
// (ver /api/sync-resultados) e nunca chamamos a API direto do navegador.

const BASE = 'https://api.football-data.org/v4';
const CODIGO_COPA = 'WC';

export type PartidaAPI = {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED...
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    // o tempo normal (sem prorrogação) — é o que usamos para pontuar
    regularTime?: { home: number | null; away: number | null };
  };
};

// Busca todas as partidas da Copa. Lança erro se o token faltar/for inválido.
export async function buscarPartidasCopa(token: string): Promise<PartidaAPI[]> {
  if (!token) throw new Error('Token da Football-Data não configurado.');
  const resp = await fetch(`${BASE}/competitions/${CODIGO_COPA}/matches`, {
    headers: { 'X-Auth-Token': token },
    cache: 'no-store',
  });
  if (resp.status === 429) {
    throw new Error('Limite de requisições atingido. Tente novamente em instantes.');
  }
  if (!resp.ok) {
    throw new Error(`Falha ao consultar a API (HTTP ${resp.status}).`);
  }
  const dados = await resp.json();
  return (dados.matches || []) as PartidaAPI[];
}

// Extrai o placar do tempo normal de uma partida finalizada.
// Retorna null se o jogo ainda não acabou ou não tem placar.
export function placarFinal(p: PartidaAPI): { casa: number; fora: number } | null {
  if (p.status !== 'FINISHED') return null;
  // prioriza o tempo regular (sem prorrogação); cai para fullTime se não houver
  const reg = p.score.regularTime;
  if (reg && reg.home != null && reg.away != null) {
    return { casa: reg.home, fora: reg.away };
  }
  const ft = p.score.fullTime;
  if (ft && ft.home != null && ft.away != null) {
    return { casa: ft.home, fora: ft.away };
  }
  return null;
}
