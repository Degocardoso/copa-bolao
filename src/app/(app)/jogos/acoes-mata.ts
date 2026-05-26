'use server';

import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin } from '@/lib/supabase-admin';

// Verifica se o mata-mata real já começou (trava global).
// Trava = existe algum jogo de fase != 'grupos' cujo início já passou.
async function mataMataTravado(): Promise<boolean> {
  const admin = criarClienteAdmin();
  const agoraISO = new Date().toISOString();
  const { data } = await admin
    .from('jogos')
    .select('id')
    .neq('fase', 'grupos')
    .lte('inicio', agoraISO)
    .limit(1);
  return !!(data && data.length > 0);
}

export type PalpiteMataInput = {
  confronto: string;
  fase: string;
  time_a: number | null;
  time_b: number | null;
  vencedor: number | null;
  gols_a: number | null;
  gols_b: number | null;
};

// Salva (ou atualiza) os palpites de mata-mata da pessoa.
// Recebe a lista inteira da chave dela e grava de uma vez.
export async function salvarMataMata(palpites: PalpiteMataInput[]) {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const usuarioId = userData?.user?.id;
  if (!usuarioId) return { ok: false, msg: 'Você precisa estar logado.' };

  // checa aprovação
  const { data: perfil } = await supabase
    .from('perfis')
    .select('status')
    .eq('id', usuarioId)
    .single();
  if (perfil?.status !== 'aprovado') {
    return { ok: false, msg: 'Sua participação ainda não foi aprovada.' };
  }

  // checa trava
  if (await mataMataTravado()) {
    return { ok: false, msg: 'O mata-mata já começou — os palpites estão fechados.' };
  }

  const admin = criarClienteAdmin();
  // grava cada confronto (upsert por usuario+confronto)
  const linhas = palpites.map((p) => ({
    usuario_id: usuarioId,
    confronto: p.confronto,
    fase: p.fase,
    time_a: p.time_a,
    time_b: p.time_b,
    vencedor: p.vencedor,
    gols_a: p.gols_a,
    gols_b: p.gols_b,
  }));

  const { error } = await admin
    .from('palpites_mata')
    .upsert(linhas, { onConflict: 'usuario_id,confronto' });

  if (error) {
    return { ok: false, msg: 'Não foi possível salvar. Tente de novo.' };
  }
  return { ok: true, msg: 'Chave salva!' };
}
