'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin, ehAdmin } from '@/lib/supabase-admin';
import { buscarJogosOpenFootball, resolverSelecao } from '@/lib/importador';
import { buscarJogadoresCopa } from '@/lib/api-football';

// Garante que quem chamou é admin de verdade (checa a sessão no servidor)
async function exigirAdmin() {
  const supabase = criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!ehAdmin(data?.user?.email)) {
    throw new Error('Acesso negado: apenas administradores.');
  }
}

export async function criarTime(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const nome = String(formData.get('nome') || '').trim();
  const bandeira = String(formData.get('bandeira') || '').trim() || null;
  const grupo = String(formData.get('grupo') || '').trim() || null;
  if (!nome) return;
  await admin.from('times').insert({ nome, bandeira, grupo });
  revalidatePath('/admin');
  revalidatePath('/jogos');
}

export async function apagarTime(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const id = Number(formData.get('id'));
  await admin.from('times').delete().eq('id', id);
  revalidatePath('/admin');
}

export async function criarJogo(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const fase = String(formData.get('fase') || 'grupos');
  const rodada = String(formData.get('rodada') || '').trim() || null;
  const time_casa = Number(formData.get('time_casa')) || null;
  const time_fora = Number(formData.get('time_fora')) || null;
  const inicioLocal = String(formData.get('inicio') || '');
  if (!inicioLocal) return;
  // datetime-local chega sem fuso (ex: "2026-06-18T19:00"); anexamos "-03:00"
  // para que o horário seja interpretado como Brasília (UTC-3), não como UTC.
  const inicio = new Date(inicioLocal + ':00-03:00').toISOString();
  await admin.from('jogos').insert({ fase, rodada, time_casa, time_fora, inicio });
  revalidatePath('/admin');
  revalidatePath('/jogos');
}

export async function apagarJogo(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const id = Number(formData.get('id'));
  await admin.from('jogos').delete().eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/jogos');
}

export async function lancarPlacar(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const id = Number(formData.get('id'));
  const gols_casa = Number(formData.get('gols_casa'));
  const gols_fora = Number(formData.get('gols_fora'));
  await admin.from('jogos').update({ gols_casa, gols_fora }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/jogos');
  revalidatePath('/ranking');
  revalidatePath('/meus-palpites');
}

export async function limparPlacar(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const id = Number(formData.get('id'));
  await admin.from('jogos').update({ gols_casa: null, gols_fora: null }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/ranking');
}

// ============================================================
//  IMPORTAÇÃO automática dos jogos da Copa (openfootball)
// ============================================================

export async function importarDaCopa() {
  await exigirAdmin();
  const admin = criarClienteAdmin();

  const jogos = await buscarJogosOpenFootball();

  // 1) Reúne todos os times reais (ignora marcadores "a definir"),
  //    guardando o grupo de cada um (vem dos jogos de fase de grupos).
  const timesUnicos = new Map<string, { nome: string; bandeira: string; grupo: string | null }>();
  for (const j of jogos) {
    if (j.time1_bandeira !== '⏳') {
      const ex = timesUnicos.get(j.time1_nome);
      timesUnicos.set(j.time1_nome, { nome: j.time1_nome, bandeira: j.time1_bandeira, grupo: j.grupo ?? ex?.grupo ?? null });
    }
    if (j.time2_bandeira !== '⏳') {
      const ex = timesUnicos.get(j.time2_nome);
      timesUnicos.set(j.time2_nome, { nome: j.time2_nome, bandeira: j.time2_bandeira, grupo: j.grupo ?? ex?.grupo ?? null });
    }
  }

  // 2) Garante os times no banco (sem duplicar, casando por chave_externa = nome)
  for (const t of timesUnicos.values()) {
    await admin
      .from('times')
      .upsert(
        { nome: t.nome, bandeira: t.bandeira, grupo: t.grupo, chave_externa: t.nome },
        { onConflict: 'chave_externa' }
      );
  }

  // 3) Mapa nome -> id
  const { data: timesDb } = await admin.from('times').select('id, nome');
  const idPorNome = new Map<string, number>();
  (timesDb || []).forEach((t: { id: number; nome: string }) => idPorNome.set(t.nome, t.id));

  // 4) Insere/atualiza os jogos (sem duplicar, casando por chave_externa).
  //    NÃO importamos placares: o resultado oficial é sempre lançado por você,
  //    no painel, para valer ponto. Assim dados de exemplo da fonte não bagunçam.
  let qtdJogos = 0;
  for (const j of jogos) {
    const casaId = idPorNome.get(j.time1_nome) ?? null;
    const foraId = idPorNome.get(j.time2_nome) ?? null;
    const { error } = await admin.from('jogos').upsert(
      {
        chave_externa: j.chave_externa,
        fase: j.fase,
        rodada: j.rodada,
        time_casa: casaId,
        time_fora: foraId,
        inicio: j.inicio,
      },
      { onConflict: 'chave_externa' }
    );
    if (!error) qtdJogos++;
  }

  // 5) Registra a importação
  await admin.from('importacoes').insert({
    fonte: 'openfootball/worldcup.json 2026',
    qtd_times: timesUnicos.size,
    qtd_jogos: qtdJogos,
  });

  revalidatePath('/admin');
  revalidatePath('/jogos');
  revalidatePath('/ranking');
  revalidatePath('/meus-palpites');
}

// ============================================================
//  APROVAÇÃO DE MEMBROS
// ============================================================

export async function definirStatusUsuario(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || '');
  if (!id || !['pendente', 'aprovado', 'bloqueado'].includes(status)) return;
  await admin.from('perfis').update({ status }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/ranking');
  revalidatePath('/transparencia');
}

// ============================================================
//  IMPORTAR JOGADORES (API-Football) — para a tela de Craques
// ============================================================
export async function importarJogadores() {
  await exigirAdmin();
  const token = process.env.API_FOOTBALL_KEY || '';
  if (!token) {
    return { ok: false, msg: 'Configure a variável API_FOOTBALL_KEY na Vercel primeiro.' };
  }

  let jogadores;
  try {
    jogadores = await buscarJogadoresCopa(token);
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'Erro ao buscar jogadores.' };
  }
  if (jogadores.length === 0) {
    return { ok: false, msg: 'A API não retornou jogadores ainda (a lista sai perto da Copa).' };
  }

  const admin = criarClienteAdmin();
  const linhas = jogadores.map((j) => {
    const sel = resolverSelecao(j.selecao);
    return {
      id: j.id,
      nome: j.nome,
      time_nome: sel.nome,
      bandeira: sel.bandeira,
      foto: j.foto,
    };
  });

  // grava em lotes (upsert por id)
  const { error } = await admin.from('jogadores').upsert(linhas, { onConflict: 'id' });
  if (error) {
    return { ok: false, msg: 'Erro ao salvar jogadores no banco.' };
  }

  revalidatePath('/craques');
  return { ok: true, msg: `${linhas.length} jogador(es) importado(s) com sucesso!` };
}

// ============================================================
//  CADASTRO MANUAL DE JOGADORES (até a API ter os convocados)
// ============================================================

export async function criarJogadorManual(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const nome = String(formData.get('nome') || '').trim();
  const time_nome = String(formData.get('time_nome') || '').trim();
  const bandeira = String(formData.get('bandeira') || '').trim() || null;
  if (!nome || !time_nome) return { ok: false, msg: 'Preencha nome e seleção.' };

  // gera um ID local negativo (IDs da API são positivos, então não conflitam)
  const { data: menor } = await admin
    .from('jogadores').select('id').order('id', { ascending: true }).limit(1);
  const proximoId = menor && menor[0] && menor[0].id < 0 ? menor[0].id - 1 : -1;

  const { error } = await admin.from('jogadores').insert({
    id: proximoId,
    nome,
    time_nome,
    bandeira,
    foto: null,
  });

  if (error) return { ok: false, msg: 'Não foi possível adicionar.' };
  revalidatePath('/admin');
  revalidatePath('/craques');
  return { ok: true, msg: `${nome} adicionado!` };
}

export async function apagarJogadorManual(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const id = Number(formData.get('id'));
  // só permite apagar jogadores manuais (ID negativo), nunca os da API
  if (id >= 0) return;
  await admin.from('jogadores').delete().eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/craques');
}

// ============================================================
//  IMPORTAR LISTA DE JOGADORES POR TXT  (em lote)
//  Formato por linha: "Nome do Jogador ; Nome da Seleção"
//  Linhas com # no início (comentário) ou vazias são ignoradas.
// ============================================================
// ============================================================
//  LANÇAR PÓDIO REAL (artilheiro / assistências)
// ============================================================

export async function lancarPodio(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const tipo = String(formData.get('tipo') || ''); // 'gols' | 'assist'
  const posicao = Number(formData.get('posicao'));
  const jogador_id = Number(formData.get('jogador_id'));
  const qtd = Number(formData.get('qtd'));

  if (!['gols', 'assist'].includes(tipo) || ![1, 2, 3].includes(posicao) || !jogador_id) return;

  if (tipo === 'gols') {
    await admin
      .from('jogadores')
      .update({ pos_artilheiro: posicao, gols_real: qtd })
      .eq('id', jogador_id);
  } else {
    await admin
      .from('jogadores')
      .update({ pos_assistencia: posicao, assist_real: qtd })
      .eq('id', jogador_id);
  }
  revalidatePath('/admin');
  revalidatePath('/ranking');
}

export async function limparPodio(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const tipo = String(formData.get('tipo') || '');
  const posicao = Number(formData.get('posicao'));

  if (!['gols', 'assist'].includes(tipo) || ![1, 2, 3].includes(posicao)) return;

  const campo = tipo === 'gols'
    ? { pos_artilheiro: null as null, gols_real: null as null }
    : { pos_assistencia: null as null, assist_real: null as null };

  const colunaPosicao = tipo === 'gols' ? 'pos_artilheiro' : 'pos_assistencia';
  await admin.from('jogadores').update(campo).eq(colunaPosicao, posicao);

  revalidatePath('/admin');
  revalidatePath('/ranking');
}

// ============================================================
//  EDITAR CONFRONTO DO MATA-MATA REAL (oitavas/quartas/semi/final)
// ============================================================

export async function editarConfronto(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const id = Number(formData.get('id'));
  const time_casa = Number(formData.get('time_casa')) || null;
  const time_fora = Number(formData.get('time_fora')) || null;
  if (!id) return;
  await admin.from('jogos').update({ time_casa, time_fora }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/ranking');
}

export async function importarJogadoresTxt(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const texto = String(formData.get('texto') || '');
  if (!texto.trim()) return { ok: false, msg: 'Cole o texto com a lista.' };

  // tabela de bandeiras por nome de seleção (vem dos times já cadastrados)
  const { data: timesData } = await admin.from('times').select('nome, bandeira');
  const bandeiraPorTime = new Map<string, string | null>();
  (timesData || []).forEach((t: { nome: string; bandeira: string | null }) => {
    bandeiraPorTime.set(t.nome, t.bandeira);
  });

  // parse das linhas: separador ; ou tab
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  // pega o menor ID negativo já existente pra continuar a numeração
  const { data: menor } = await admin
    .from('jogadores').select('id').order('id', { ascending: true }).limit(1);
  let proximoId = menor && menor[0] && menor[0].id < 0 ? menor[0].id - 1 : -1;

  const adicionados: string[] = [];
  const ignorados: string[] = [];
  const novos: { id: number; nome: string; time_nome: string; bandeira: string | null; foto: null }[] = [];

  for (const linha of linhas) {
    const partes = linha.split(/\s*[;\t]\s*/);
    if (partes.length < 2) { ignorados.push(linha); continue; }
    const nome = partes[0].trim();
    const time = partes[1].trim();
    if (!nome || !time) { ignorados.push(linha); continue; }
    if (!bandeiraPorTime.has(time)) {
      // seleção não cadastrada — ignora e avisa
      ignorados.push(`${linha}  (seleção "${time}" não cadastrada)`);
      continue;
    }
    novos.push({
      id: proximoId--,
      nome,
      time_nome: time,
      bandeira: bandeiraPorTime.get(time) || null,
      foto: null,
    });
    adicionados.push(nome);
  }

  if (novos.length === 0) {
    return { ok: false, msg: `Nenhum jogador novo. ${ignorados.length} linha(s) ignorada(s).` };
  }

  const { error } = await admin.from('jogadores').insert(novos);
  if (error) return { ok: false, msg: 'Erro ao salvar no banco.' };

  revalidatePath('/admin');
  revalidatePath('/craques');
  const detalhe = ignorados.length > 0 ? ` (${ignorados.length} linha(s) ignorada(s))` : '';
  return { ok: true, msg: `${adicionados.length} jogador(es) adicionado(s)${detalhe}.` };
}
