import { NextResponse } from 'next/server';
import { criarClienteAdmin } from '@/lib/supabase-admin';
import { buscarPartidasCopa, placarFinal } from '@/lib/football-data';
import { resolverSelecao } from '@/lib/importador';

// Intervalo mínimo entre sincronizações (cache). Respeita o limite da API.
const INTERVALO_MIN_SEGUNDOS = 60;

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = criarClienteAdmin();
  const token = process.env.FOOTBALL_DATA_TOKEN || '';

  if (!token) {
    return NextResponse.json(
      { ok: false, msg: 'Token da API não configurado (FOOTBALL_DATA_TOKEN).' },
      { status: 200 }
    );
  }

  // 1) Checa o cache: já sincronizou há pouco?
  const { data: sync } = await admin
    .from('sync_resultados')
    .select('ultima_sync')
    .eq('id', 1)
    .single();

  const agora = Date.now();
  const ultima = sync?.ultima_sync ? new Date(sync.ultima_sync).getTime() : 0;
  const segDesde = (agora - ultima) / 1000;

  if (segDesde < INTERVALO_MIN_SEGUNDOS) {
    return NextResponse.json({
      ok: true,
      cache: true,
      msg: `Resultados recentes (sincronizado há ${Math.round(segDesde)}s).`,
      proxima_em: Math.ceil(INTERVALO_MIN_SEGUNDOS - segDesde),
    });
  }

  // 2) Busca na API
  let partidas;
  try {
    partidas = await buscarPartidasCopa(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao consultar a API.';
    await admin.from('sync_resultados').update({ ultimo_status: `erro: ${msg}` }).eq('id', 1);
    return NextResponse.json({ ok: false, msg }, { status: 200 });
  }

  // 3) Carrega os jogos do banco para casar
  const { data: jogosDb } = await admin
    .from('jogos')
    .select('id, time_casa, time_fora, inicio, id_externo, gols_casa, gols_fora');
  const { data: timesDb } = await admin.from('times').select('id, nome');
  const nomePorId = new Map<number, string>();
  (timesDb || []).forEach((t: { id: number; nome: string }) => nomePorId.set(t.id, t.nome));

  // chave de casamento: "nomeCasaPT|nomeForaPT|AAAA-MM-DD"
  function chaveJogoDb(j: { time_casa: number | null; time_fora: number | null; inicio: string }) {
    const c = j.time_casa ? nomePorId.get(j.time_casa) : '';
    const f = j.time_fora ? nomePorId.get(j.time_fora) : '';
    return `${c}|${f}|${j.inicio.slice(0, 10)}`;
  }
  type JogoDb = {
    id: number;
    time_casa: number | null;
    time_fora: number | null;
    inicio: string;
    id_externo: number | null;
    gols_casa: number | null;
    gols_fora: number | null;
  };
  const jogoPorChave = new Map<string, JogoDb>();
  const jogoPorIdExterno = new Map<number, JogoDb>();
  (jogosDb || []).forEach((j: JogoDb) => {
    jogoPorChave.set(chaveJogoDb(j), j);
    if (j.id_externo) jogoPorIdExterno.set(j.id_externo, j);
  });

  // 4) Para cada partida finalizada, encontra o jogo e atualiza o placar
  let atualizados = 0;
  for (const p of partidas) {
    const placar = placarFinal(p);
    if (!placar) continue;

    // tenta casar primeiro por id_externo já memorizado, senão por nome+data
    let jogo = jogoPorIdExterno.get(p.id);
    if (!jogo) {
      const casaPT = resolverSelecao(p.homeTeam.name).nome;
      const foraPT = resolverSelecao(p.awayTeam.name).nome;
      const chave = `${casaPT}|${foraPT}|${p.utcDate.slice(0, 10)}`;
      jogo = jogoPorChave.get(chave);
    }
    if (!jogo) continue;

    // só atualiza se o placar mudou (evita escrita à toa)
    if (jogo.gols_casa === placar.casa && jogo.gols_fora === placar.fora && jogo.id_externo === p.id) {
      continue;
    }
    const { error } = await admin
      .from('jogos')
      .update({ gols_casa: placar.casa, gols_fora: placar.fora, id_externo: p.id })
      .eq('id', jogo.id);
    if (!error) atualizados++;
  }

  // 5) Registra a sincronização
  await admin
    .from('sync_resultados')
    .update({ ultima_sync: new Date().toISOString(), ultimo_status: `ok: ${atualizados} atualizados` })
    .eq('id', 1);

  return NextResponse.json({
    ok: true,
    cache: false,
    msg: `Sincronizado: ${atualizados} resultado(s) atualizado(s).`,
  });
}
