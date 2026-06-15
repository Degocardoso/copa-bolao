'use server';

import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin } from '@/lib/supabase-admin';

// Prazo para palpites de craque: 15/jun/2026 às 23:59 (Brasília = UTC-3)
const PRAZO_CRAQUE = new Date('2026-06-16T02:59:59Z');

function craqueFechado(): boolean {
  return new Date() > PRAZO_CRAQUE;
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

  if (craqueFechado()) {
    return { ok: false, msg: 'O prazo para palpites de craque encerrou.' };
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
