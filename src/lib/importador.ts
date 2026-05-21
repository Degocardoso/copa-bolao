// ============================================================
//  Importador de dados da Copa 2026 — fonte: openfootball
//  Dados públicos (domínio público), sem chave de API.
// ============================================================

const FONTE_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// Tradução EN -> PT + bandeira (emoji). Cobre as 48 seleções da Copa 2026
// e as principais. Times que não estiverem aqui entram com o nome original
// e bandeira branca — você pode ajustar depois no painel.
const TIMES: Record<string, { nome: string; bandeira: string }> = {
  'Argentina': { nome: 'Argentina', bandeira: '🇦🇷' },
  'Brazil': { nome: 'Brasil', bandeira: '🇧🇷' },
  'France': { nome: 'França', bandeira: '🇫🇷' },
  'England': { nome: 'Inglaterra', bandeira: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Spain': { nome: 'Espanha', bandeira: '🇪🇸' },
  'Portugal': { nome: 'Portugal', bandeira: '🇵🇹' },
  'Germany': { nome: 'Alemanha', bandeira: '🇩🇪' },
  'Netherlands': { nome: 'Holanda', bandeira: '🇳🇱' },
  'Belgium': { nome: 'Bélgica', bandeira: '🇧🇪' },
  'Italy': { nome: 'Itália', bandeira: '🇮🇹' },
  'Croatia': { nome: 'Croácia', bandeira: '🇭🇷' },
  'Uruguay': { nome: 'Uruguai', bandeira: '🇺🇾' },
  'Colombia': { nome: 'Colômbia', bandeira: '🇨🇴' },
  'Mexico': { nome: 'México', bandeira: '🇲🇽' },
  'United States': { nome: 'Estados Unidos', bandeira: '🇺🇸' },
  'USA': { nome: 'Estados Unidos', bandeira: '🇺🇸' },
  'Canada': { nome: 'Canadá', bandeira: '🇨🇦' },
  'Japan': { nome: 'Japão', bandeira: '🇯🇵' },
  'South Korea': { nome: 'Coreia do Sul', bandeira: '🇰🇷' },
  'Korea Republic': { nome: 'Coreia do Sul', bandeira: '🇰🇷' },
  'Australia': { nome: 'Austrália', bandeira: '🇦🇺' },
  'Morocco': { nome: 'Marrocos', bandeira: '🇲🇦' },
  'Senegal': { nome: 'Senegal', bandeira: '🇸🇳' },
  'Ghana': { nome: 'Gana', bandeira: '🇬🇭' },
  'Nigeria': { nome: 'Nigéria', bandeira: '🇳🇬' },
  'Cameroon': { nome: 'Camarões', bandeira: '🇨🇲' },
  'Ivory Coast': { nome: 'Costa do Marfim', bandeira: '🇨🇮' },
  'Côte d\'Ivoire': { nome: 'Costa do Marfim', bandeira: '🇨🇮' },
  'Egypt': { nome: 'Egito', bandeira: '🇪🇬' },
  'Algeria': { nome: 'Argélia', bandeira: '🇩🇿' },
  'Tunisia': { nome: 'Tunísia', bandeira: '🇹🇳' },
  'South Africa': { nome: 'África do Sul', bandeira: '🇿🇦' },
  'Switzerland': { nome: 'Suíça', bandeira: '🇨🇭' },
  'Denmark': { nome: 'Dinamarca', bandeira: '🇩🇰' },
  'Sweden': { nome: 'Suécia', bandeira: '🇸🇪' },
  'Norway': { nome: 'Noruega', bandeira: '🇳🇴' },
  'Poland': { nome: 'Polônia', bandeira: '🇵🇱' },
  'Austria': { nome: 'Áustria', bandeira: '🇦🇹' },
  'Serbia': { nome: 'Sérvia', bandeira: '🇷🇸' },
  'Turkey': { nome: 'Turquia', bandeira: '🇹🇷' },
  'Türkiye': { nome: 'Turquia', bandeira: '🇹🇷' },
  'Ukraine': { nome: 'Ucrânia', bandeira: '🇺🇦' },
  'Czech Republic': { nome: 'Tchéquia', bandeira: '🇨🇿' },
  'Czechia': { nome: 'Tchéquia', bandeira: '🇨🇿' },
  'Wales': { nome: 'País de Gales', bandeira: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  'Scotland': { nome: 'Escócia', bandeira: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'Ecuador': { nome: 'Equador', bandeira: '🇪🇨' },
  'Peru': { nome: 'Peru', bandeira: '🇵🇪' },
  'Chile': { nome: 'Chile', bandeira: '🇨🇱' },
  'Paraguay': { nome: 'Paraguai', bandeira: '🇵🇾' },
  'Venezuela': { nome: 'Venezuela', bandeira: '🇻🇪' },
  'Costa Rica': { nome: 'Costa Rica', bandeira: '🇨🇷' },
  'Panama': { nome: 'Panamá', bandeira: '🇵🇦' },
  'Jamaica': { nome: 'Jamaica', bandeira: '🇯🇲' },
  'Honduras': { nome: 'Honduras', bandeira: '🇭🇳' },
  'Saudi Arabia': { nome: 'Arábia Saudita', bandeira: '🇸🇦' },
  'Iran': { nome: 'Irã', bandeira: '🇮🇷' },
  'IR Iran': { nome: 'Irã', bandeira: '🇮🇷' },
  'Qatar': { nome: 'Catar', bandeira: '🇶🇦' },
  'Iraq': { nome: 'Iraque', bandeira: '🇮🇶' },
  'United Arab Emirates': { nome: 'Emirados Árabes', bandeira: '🇦🇪' },
  'Uzbekistan': { nome: 'Uzbequistão', bandeira: '🇺🇿' },
  'Jordan': { nome: 'Jordânia', bandeira: '🇯🇴' },
  'New Zealand': { nome: 'Nova Zelândia', bandeira: '🇳🇿' },
  'Cape Verde': { nome: 'Cabo Verde', bandeira: '🇨🇻' },
};

export type JogoImportado = {
  chave_externa: string;
  fase: string;
  rodada: string | null;
  inicio: string; // ISO
  time1_nome: string;
  time1_bandeira: string;
  time2_nome: string;
  time2_bandeira: string;
  gols_casa: number | null;
  gols_fora: number | null;
  // se algum lado for marcador (W101 etc.), o jogo é "a definir"
  definido: boolean;
};

function traduz(nomeEN: string): { nome: string; bandeira: string; real: boolean } {
  const achou = TIMES[nomeEN];
  if (achou) return { ...achou, real: true };
  // Marcadores tipo "W101", "RU A", "1A", "Winner Group A"... -> não é time real
  const ehMarcador = /^[0-9]?[A-Z]{0,2}[0-9]{0,3}$|winner|runner|loser|^[123][A-Z]$|^W\d+/i.test(
    nomeEN.trim()
  );
  return { nome: nomeEN, bandeira: ehMarcador ? '⏳' : '🏳️', real: !ehMarcador };
}

// Versão pública: traduz um nome de seleção (inglês) para PT + bandeira.
// Usada também ao casar resultados da API com os jogos do banco.
export function resolverSelecao(nomeEN: string): { nome: string; bandeira: string } {
  const { nome, bandeira } = traduz(nomeEN);
  return { nome, bandeira };
}

// Converte "13:00 UTC-6" + "2026-06-11" para um ISO em UTC.
function montarInicio(date: string, time: string): string {
  // time pode vir "20:00 UTC-6" ou só "20:00"
  const m = time.match(/(\d{1,2}):(\d{2})(?:\s*UTC([+-]\d{1,2}))?/);
  if (!m) return new Date(`${date}T12:00:00Z`).toISOString();
  const hh = m[1].padStart(2, '0');
  const mm = m[2];
  const offset = m[3] ? parseInt(m[3], 10) : 0;
  // hora local = UTC + offset  ->  UTC = local - offset
  const base = new Date(`${date}T${hh}:${mm}:00Z`);
  base.setUTCHours(base.getUTCHours() - offset);
  return base.toISOString();
}

type MatchBruto = {
  round?: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  score?: { ft?: [number, number] };
};

export async function buscarJogosOpenFootball(): Promise<JogoImportado[]> {
  const resp = await fetch(FONTE_URL, { cache: 'no-store' });
  if (!resp.ok) throw new Error('Falha ao baixar os dados da Copa (openfootball).');
  const data = (await resp.json()) as { matches: MatchBruto[] };

  return (data.matches || []).map((m, i) => {
    const t1 = traduz(m.team1);
    const t2 = traduz(m.team2);
    const round = m.round || '';
    const ehGrupos = !!m.group || /matchday/i.test(round);
    const ft = m.score?.ft;
    return {
      chave_externa: `wc2026-${i}`,
      fase: ehGrupos ? 'grupos' : 'mata-mata',
      rodada: m.group ? m.group.replace('Group', 'Grupo') : round || null,
      inicio: montarInicio(m.date, m.time),
      time1_nome: t1.nome,
      time1_bandeira: t1.bandeira,
      time2_nome: t2.nome,
      time2_bandeira: t2.bandeira,
      gols_casa: ft ? ft[0] : null,
      gols_fora: ft ? ft[1] : null,
      definido: t1.real && t2.real,
    };
  });
}
