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
  // datetime-local vem sem fuso; tratamos como horario local do Brasil
  const inicio = new Date(inicioLocal).toISOString();
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
