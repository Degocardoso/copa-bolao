import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase-server';
import { ehAdmin, criarClienteAdmin } from '@/lib/supabase-admin';
import type { Jogo, Time } from '@/lib/tipos';
import { formatarData } from '@/lib/tipos';
import { criarTime, apagarTime, criarJogo, apagarJogo, lancarPlacar, limparPlacar } from './acoes';
import BotaoImportar from './BotaoImportar';
import BotaoJogadores from './BotaoJogadores';
import GestaoJogadores from './GestaoJogadores';
import GestaoMembros from './GestaoMembros';

export const dynamic = 'force-dynamic';

export default async function PaginaAdmin() {
  const supabase = criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!ehAdmin(data?.user?.email)) redirect('/jogos');

  const [{ data: times }, { data: jogos }, { data: imp }] = await Promise.all([
    supabase.from('times').select('*').order('grupo').order('nome'),
    supabase.from('jogos').select('*').order('inicio'),
    supabase.from('importacoes').select('*').order('quando', { ascending: false }).limit(1),
  ]);
  const ultimaImp = (imp && imp[0]) || null;
  const listaTimes = (times as Time[]) || [];
  const listaJogos = (jogos as Jogo[]) || [];
  const mapaTimes = new Map<number, Time>();
  listaTimes.forEach((t) => mapaTimes.set(t.id, t));

  // Membros (todos os perfis), via service role para enxergar pendentes
  const admin = criarClienteAdmin();
  const { data: membros } = await admin
    .from('perfis')
    .select('id, nome, email, status, criado_em')
    .order('criado_em', { ascending: true });
  const listaMembros = membros || [];
  const qtdPendentes = listaMembros.filter((m) => m.status === 'pendente').length;

  // Jogadores cadastrados (manuais e/ou vindos da API) para a Gestão de Craques
  const { data: jogadoresData } = await admin
    .from('jogadores')
    .select('id, nome, time_nome, bandeira')
    .order('time_nome')
    .order('nome');
  const listaJogadores = jogadoresData || [];
  const timesSimples = listaTimes
    .filter((t) => t.nome)
    .map((t) => ({ nome: t.nome, bandeira: t.bandeira }));

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Painel do Admin ⚙️</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 22 }}>
        Cadastre times, jogos e lance os placares oficiais.
      </p>

      {/* IMPORTAÇÃO AUTOMÁTICA */}
      <BotaoImportar ultima={ultimaImp} />

      {/* IMPORTAR JOGADORES (CRAQUES) */}
      <section className="bloco">
        <h3 className="bloco-tit">⭐ Jogadores (tela de Craques)</h3>
        <BotaoJogadores />
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed var(--line)' }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10, fontWeight: 700 }}>
            ✍️ Cadastro manual (até a API ter os convocados)
          </h4>
          <GestaoJogadores jogadores={listaJogadores} times={timesSimples} />
        </div>
      </section>

      {/* MEMBROS */}
      <section className="bloco">
        <h3 className="bloco-tit">
          👥 Membros{qtdPendentes > 0 ? ` · ${qtdPendentes} aguardando` : ''}
        </h3>
        <GestaoMembros membros={listaMembros} />
      </section>

      {/* CADASTRAR TIME */}
      <section className="bloco">
        <h3 className="bloco-tit">➕ Novo time</h3>
        <form action={criarTime} className="form-linha">
          <input name="bandeira" placeholder="🇧🇷" className="inp inp-bandeira" maxLength={4} />
          <input name="nome" placeholder="Nome do time" className="inp" required />
          <input name="grupo" placeholder="Grupo (A)" className="inp inp-grupo" maxLength={2} />
          <button className="btn btn-primary">Adicionar</button>
        </form>
        {listaTimes.length > 0 && (
          <div className="chips">
            {listaTimes.map((t) => (
              <form action={apagarTime} key={t.id} className="chip">
                <input type="hidden" name="id" value={t.id} />
                <span>{t.bandeira} {t.nome} {t.grupo ? `(${t.grupo})` : ''}</span>
                <button className="chip-x" title="Remover">✕</button>
              </form>
            ))}
          </div>
        )}
      </section>

      {/* CADASTRAR JOGO */}
      <section className="bloco">
        <h3 className="bloco-tit">➕ Novo jogo</h3>
        <form action={criarJogo} className="form-jogo">
          <div className="fg">
            <label>Fase</label>
            <select name="fase" className="inp">
              <option value="grupos">Fase de grupos</option>
              <option value="mata-mata">Mata-mata</option>
            </select>
          </div>
          <div className="fg">
            <label>Rodada / etapa</label>
            <input name="rodada" placeholder="Rodada 1 / Oitavas / Final" className="inp" />
          </div>
          <div className="fg">
            <label>Time da casa</label>
            <select name="time_casa" className="inp" required>
              <option value="">—</option>
              {listaTimes.map((t) => <option key={t.id} value={t.id}>{t.bandeira} {t.nome}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Time visitante</label>
            <select name="time_fora" className="inp" required>
              <option value="">—</option>
              {listaTimes.map((t) => <option key={t.id} value={t.id}>{t.bandeira} {t.nome}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Início (trava aqui)</label>
            <input type="datetime-local" name="inicio" className="inp" required />
          </div>
          <button className="btn btn-primary btn-block">Cadastrar jogo</button>
        </form>
      </section>

      {/* LANÇAR PLACARES */}
      <section className="bloco">
        <h3 className="bloco-tit">🏁 Jogos & placares ({listaJogos.length})</h3>
        {listaJogos.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Nenhum jogo cadastrado ainda.</p>
        ) : (
          <div className="jlista">
            {listaJogos.map((j) => {
              const casa = j.time_casa ? mapaTimes.get(j.time_casa) : null;
              const fora = j.time_fora ? mapaTimes.get(j.time_fora) : null;
              const oficial = j.gols_casa != null && j.gols_fora != null;
              return (
                <div key={j.id} className="jrow">
                  <div className="jrow-top">
                    <span className="jrow-times">
                      {casa?.bandeira} {casa?.nome || '—'} <b>×</b> {fora?.nome || '—'} {fora?.bandeira}
                    </span>
                    <form action={apagarJogo}>
                      <input type="hidden" name="id" value={j.id} />
                      <button className="chip-x" title="Apagar jogo">✕</button>
                    </form>
                  </div>
                  <div className="jrow-meta mono">
                    {formatarData(j.inicio)} · {j.rodada || j.fase}
                    {oficial && <span className="oficial-tag"> · oficial: {j.gols_casa} × {j.gols_fora}</span>}
                  </div>
                  <form action={lancarPlacar} className="placar-form">
                    <input type="hidden" name="id" value={j.id} />
                    <input type="number" name="gols_casa" min={0} max={20}
                      defaultValue={j.gols_casa ?? ''} placeholder="0" className="inp inp-gol" required />
                    <span className="x">×</span>
                    <input type="number" name="gols_fora" min={0} max={20}
                      defaultValue={j.gols_fora ?? ''} placeholder="0" className="inp inp-gol" required />
                    <button className="btn btn-gold btn-lancar">{oficial ? 'Atualizar' : 'Lançar'}</button>
                    {oficial && (
                      <button formAction={limparPlacar} className="btn btn-ghost btn-lancar">Limpar</button>
                    )}
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .bloco {
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 16px; padding: 18px; margin-bottom: 16px;
        }
        .bloco-destaque {
          border-color: var(--gold-deep);
          background: linear-gradient(180deg, rgba(244,196,48,0.06), var(--panel));
        }
        .bloco-tit { font-size: 15px; margin-bottom: 14px; }
        .inp {
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 10px; padding: 11px 13px; color: var(--text);
          font-size: 14px; width: 100%;
        }
        .inp:focus { outline: none; border-color: var(--grass-bright); }
        .form-linha { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .form-linha .inp { flex: 1; min-width: 120px; }
        .inp-bandeira { flex: 0 0 60px !important; min-width: 60px !important; text-align: center; }
        .inp-grupo { flex: 0 0 80px !important; min-width: 80px !important; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
        .chip {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 999px; padding: 6px 8px 6px 13px; font-size: 13px;
        }
        .chip-x {
          background: transparent; border: none; color: var(--red);
          font-size: 13px; padding: 2px 5px; border-radius: 6px;
        }
        .chip-x:hover { background: rgba(255,91,91,0.12); }
        .form-jogo {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        .fg { display: flex; flex-direction: column; gap: 6px; }
        .fg label { font-size: 12px; color: var(--text-dim); font-weight: 600; }
        .form-jogo .btn-block { grid-column: 1 / -1; margin-top: 4px; }
        .jlista { display: flex; flex-direction: column; gap: 10px; }
        .jrow {
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 12px; padding: 13px;
        }
        .jrow-top { display: flex; justify-content: space-between; align-items: center; }
        .jrow-times { font-size: 14px; font-weight: 700; }
        .jrow-meta { font-size: 11px; color: var(--text-faint); margin: 5px 0 11px; }
        .oficial-tag { color: var(--gold); }
        .placar-form { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .inp-gol { width: 64px !important; flex: 0 0 64px; text-align: center; font-size: 17px; font-weight: 700; }
        .placar-form .x { color: var(--text-faint); font-weight: 700; }
        .btn-lancar { padding: 9px 16px; font-size: 13px; }
        @media (max-width: 480px) {
          .form-jogo { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
