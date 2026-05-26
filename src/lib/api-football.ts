// Cliente da API-Football (api-football.com via host direto ou RapidAPI).
// Plano grátis: ~100 requisições/dia. Por isso cacheamos no banco.
// Usamos o host direto v3.football.api-sports.io com header x-apisports-key.

const BASE = 'https://v3.football.api-sports.io';
const LIGA_COPA = 1;   // FIFA World Cup
const TEMPORADA = 2026;

type JogadorAPI = {
  player: { id: number; name: string; photo?: string };
  statistics?: { team?: { name?: string } }[];
};

// Busca a lista de jogadores da Copa (paginada).
// Retorna nome, seleção e foto de cada um.
export async function buscarJogadoresCopa(
  token: string,
  maxPaginas = 8
): Promise<{ id: number; nome: string; selecao: string; foto: string | null }[]> {
  if (!token) throw new Error('Chave da API-Football não configurada.');
  const out: { id: number; nome: string; selecao: string; foto: string | null }[] = [];

  for (let page = 1; page <= maxPaginas; page++) {
    const resp = await fetch(
      `${BASE}/players?league=${LIGA_COPA}&season=${TEMPORADA}&page=${page}`,
      { headers: { 'x-apisports-key': token }, cache: 'no-store' }
    );
    if (resp.status === 429) throw new Error('Limite de requisições da API atingido. Tente amanhã.');
    if (!resp.ok) throw new Error(`Falha na API de jogadores (HTTP ${resp.status}).`);
    const dados = await resp.json();
    const lista = (dados.response || []) as JogadorAPI[];
    lista.forEach((j) => {
      out.push({
        id: j.player.id,
        nome: j.player.name,
        selecao: j.statistics?.[0]?.team?.name || 'Outros',
        foto: j.player.photo || null,
      });
    });
    const totalPaginas = dados.paging?.total || 1;
    if (page >= totalPaginas) break;
  }
  return out;
}

type ArtilheiroAPI = {
  player: { id: number };
  statistics?: { goals?: { total?: number; assists?: number } }[];
};

// Busca o ranking real de artilheiros (topscorers) ao fim da Copa.
export async function buscarArtilheiros(token: string): Promise<{ id: number; gols: number }[]> {
  const resp = await fetch(
    `${BASE}/players/topscorers?league=${LIGA_COPA}&season=${TEMPORADA}`,
    { headers: { 'x-apisports-key': token }, cache: 'no-store' }
  );
  if (!resp.ok) throw new Error(`Falha ao buscar artilheiros (HTTP ${resp.status}).`);
  const dados = await resp.json();
  return ((dados.response || []) as ArtilheiroAPI[]).map((a) => ({
    id: a.player.id,
    gols: a.statistics?.[0]?.goals?.total || 0,
  }));
}

// Busca o ranking real de assistências (topassists) ao fim da Copa.
export async function buscarAssistencias(token: string): Promise<{ id: number; assist: number }[]> {
  const resp = await fetch(
    `${BASE}/players/topassists?league=${LIGA_COPA}&season=${TEMPORADA}`,
    { headers: { 'x-apisports-key': token }, cache: 'no-store' }
  );
  if (!resp.ok) throw new Error(`Falha ao buscar assistências (HTTP ${resp.status}).`);
  const dados = await resp.json();
  return ((dados.response || []) as ArtilheiroAPI[]).map((a) => ({
    id: a.player.id,
    assist: a.statistics?.[0]?.goals?.assists || 0,
  }));
}
