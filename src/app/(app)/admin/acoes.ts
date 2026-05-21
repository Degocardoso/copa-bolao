'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin, ehAdmin } from '@/lib/supabase-admin';
import { buscarJogosOpenFootball } from '@/lib/importador';

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

  // 1) Reúne todos os times reais (ignora marcadores "a definir")
  const timesUnicos = new Map<string, { nome: string; bandeira: string }>();
  for (const j of jogos) {
    if (j.time1_bandeira !== '⏳') timesUnicos.set(j.time1_nome, { nome: j.time1_nome, bandeira: j.time1_bandeira });
    if (j.time2_bandeira !== '⏳') timesUnicos.set(j.time2_nome, { nome: j.time2_nome, bandeira: j.time2_bandeira });
  }

  // 2) Garante os times no banco (sem duplicar, casando por chave_externa = nome)
  for (const t of timesUnicos.values()) {
    await admin
      .from('times')
      .upsert(
        { nome: t.nome, bandeira: t.bandeira, chave_externa: t.nome },
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
