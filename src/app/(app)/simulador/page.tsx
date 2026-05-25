import { criarClienteServidor } from '@/lib/supabase-server';
import type { Jogo, Time } from '@/lib/tipos';
import { calcularGrupos } from '@/lib/simulador-grupos';
import { montarOitavas } from '@/lib/simulador-chave';
import VisaoChave from './VisaoChave';

export const dynamic = 'force-dynamic';

export default async function PaginaSimulador() {
  const supabase = criarClienteServidor();
  const { data: userData } = await supabase.auth.getUser();
  const usuarioId = userData!.user!.id;

  const [{ data: jogos }, { data: times }, { data: palpites }] = await Promise.all([
    supabase.from('jogos').select('*').order('inicio', { ascending: true }),
    supabase.from('times').select('*'),
    supabase.from('palpites').select('jogo_id, gols_casa, gols_fora').eq('usuario_id', usuarioId),
  ]);

  const listaJogos = (jogos as Jogo[]) || [];
  const listaTimes = (times as Time[]) || [];
  const listaPalpites = palpites || [];

  const timePorId = new Map<number, Time>();
  listaTimes.forEach((t) => timePorId.set(t.id, t));

  // quantos jogos de grupo existem e quantos a pessoa já palpitou
  const jogosGrupo = listaJogos.filter((j) => j.fase === 'grupos');
  const idsGrupo = new Set(jogosGrupo.map((j) => j.id));
  const palpitadosGrupo = listaPalpites.filter((p) => idsGrupo.has(p.jogo_id)).length;
  const totalGrupo = jogosGrupo.length;

  // calcula classificação e oitavas
  const classificacoes = calcularGrupos(listaJogos, listaTimes, listaPalpites);
  const oitavas = montarOitavas(classificacoes, timePorId);

  // serializa os times para o cliente (id -> nome/bandeira)
  const timesSimples = listaTimes.map((t) => ({
    id: t.id, nome: t.nome, bandeira: t.bandeira, grupo: t.grupo,
  }));

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Simulador 🔮</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>
        Sua chave de mata-mata, montada a partir dos seus palpites da fase de grupos.
      </p>

      <VisaoChave
        classificacoes={classificacoes}
        oitavas={oitavas}
        times={timesSimples}
        palpitadosGrupo={palpitadosGrupo}
        totalGrupo={totalGrupo}
      />
    </main>
  );
}
