import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase-server';
import { ehAdmin, criarClienteAdmin } from '@/lib/supabase-admin';
import Cabecalho from '@/components/Cabecalho';
import TelaEspera from '@/components/TelaEspera';

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect('/');

  const nome =
    (data.user.user_metadata?.full_name as string) ||
    (data.user.user_metadata?.name as string) ||
    data.user.email?.split('@')[0] ||
    'Participante';

  const admin = ehAdmin(data.user.email);

  // Busca o status de aprovação do perfil
  const { data: perfil } = await supabase
    .from('perfis')
    .select('status')
    .eq('id', data.user.id)
    .single();
  let status = perfil?.status || 'pendente';

  // Se é admin mas o perfil ainda não está aprovado no banco, promove agora.
  // Garante que o admin possa palpitar e apareça no ranking/transparência,
  // mesmo que o email não tenha sido cadastrado na tabela 'admins' do SQL.
  if (admin && status !== 'aprovado') {
    const adminClient = criarClienteAdmin();
    await adminClient.from('perfis').update({ status: 'aprovado' }).eq('id', data.user.id);
    status = 'aprovado';
  }

  // Admin sempre entra. Os demais só se aprovados.
  if (!admin && status !== 'aprovado') {
    return (
      <>
        <Cabecalho nome={nome} admin={false} />
        <TelaEspera nome={nome} bloqueado={status === 'bloqueado'} />
      </>
    );
  }

  return (
    <>
      <Cabecalho nome={nome} admin={admin} />
      <div style={{ paddingBottom: 60 }}>{children}</div>
    </>
  );
}
