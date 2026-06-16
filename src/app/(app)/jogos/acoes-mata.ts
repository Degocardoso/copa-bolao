'use server';

import { criarClienteServidor } from '@/lib/supabase-server';
import { criarClienteAdmin } from '@/lib/supabase-admin';
import { confrontoComecou, type ConfrontoReal } from '@/lib/tipos';

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
// Recebe a chave inteira, mas cada confronto só é gravado se o jogo real
// correspondente (mesma fase, mesmos dois times) ainda não tiver começado.
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

  const admin = criarClienteAdmin();

  // jogos reais do mata-mata, para travar cada confronto no apito dele
  const { data: jogosReaisData } = await admin
    .from('jogos')
    .select('fase, time_casa, time_fora, inicio')
    .neq('fase', 'grupos');
  const jogosReais = (jogosReaisData || []) as ConfrontoReal[];

  const liberados = palpites.filter(
    (p) => !confrontoComecou(p.fase, p.time_a, p.time_b, jogosReais)
  );
  const travados = palpites.length - liberados.length;

  if (liberados.length === 0) {
    return { ok: false, msg: 'Esses confrontos já começaram — os palpites estão fechados.' };
  }

  // grava cada confronto liberado (upsert por usuario+confronto)
  const linhas = liberados.map((p) => ({
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
  return {
    ok: true,
    msg: travados > 0
      ? `Chave salva! (${travados} confronto(s) já começaram e não foram alterados.)`
      : 'Chave salva!',
  };
}
