'use server';

import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin } from '@/lib/supabase-admin';

// A Copa já começou? (trava dos palpites de craque = antes do 1º jogo da Copa)
async function copaComecou(): Promise<boolean> {
  const admin = criarClienteAdmin();
  const agoraISO = new Date().toISOString();
  // o primeiro jogo de todos (qualquer fase) que já passou
  const { data } = await admin
    .from('jogos')
    .select('id')
    .lte('inicio', agoraISO)
    .limit(1);
  return !!(data && data.length > 0);
}

export type EscolhaCraque = {
  tipo: 'gols' | 'assist';
  posicao: number;          // 1, 2, 3
  jogador_id: number | null;
  qtd: number | null;
};

export async function salvarCraques(escolhas: EscolhaCraque[]) {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const usuarioId = userData?.user?.id;
  if (!usuarioId) return { ok: false, msg: 'Você precisa estar logado.' };

  const { data: perfil } = await supabase
    .from('perfis').select('status').eq('id', usuarioId).single();
  if (perfil?.status !== 'aprovado') {
    return { ok: false, msg: 'Sua participação ainda não foi aprovada.' };
  }

  if (await copaComecou()) {
    return { ok: false, msg: 'A Copa já começou — os palpites de craque estão fechados.' };
  }

  const admin = criarClienteAdmin();
  const linhas = escolhas.map((e) => ({
    usuario_id: usuarioId,
    tipo: e.tipo,
    posicao: e.posicao,
    jogador_id: e.jogador_id,
    qtd: e.qtd,
  }));

  const { error } = await admin
    .from('palpites_craque')
    .upsert(linhas, { onConflict: 'usuario_id,tipo,posicao' });

  if (error) return { ok: false, msg: 'Não foi possível salvar. Tente de novo.' };
  return { ok: true, msg: 'Palpites de craque salvos!' };
}
