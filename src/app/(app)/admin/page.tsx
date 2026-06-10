import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase-server';
import { ehAdmin, criarClienteAdmin } from '@/lib/supabase-admin';
import type { Jogo, Time } from '@/lib/tipos';
import { formatarData } from '@/lib/tipos';
import { criarTime, apagarTime, criarJogo, apagarJogo, lancarPlacar, limparPlacar, lancarPodio, limparPodio, editarConfronto } from './acoes';
import BotaoImportar from './BotaoImportar';
import BotaoJogadores from './BotaoJogadores';
import GestaoJogadores from './GestaoJogadores';
import GestaoMembros from './GestaoMembros';

export const dynamic = 'force-dynamic';

type JogadorSimples = { id: number; nome: string; time_nome: string; bandeira: string | null; gols_real: number | null; assist_real: number | null; pos_artilheiro: number | null; pos_assistencia: number | null };

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

  const jogosMata = listaJogos.filter((j) => j.fase !== 'grupos');

  const admin = criarClienteAdmin();
  const { data: membros } = await admin
    .from('perfis')
    .select('id, nome, email, status, criado_em')
    .order('criado_em', { ascending: true });
  const listaMembros = membros || [];
  const qtdPendentes = listaMembros.filter((m) => m.status === 'pendente').length;

  const { data: jogadoresData } = await admin
    .from('jogadores')
    .select('id, nome, time_nome, bandeira, gols_real, assist_real, pos_artilheiro, pos_assistencia')
    .order('time_nome')
    .order('nome');
  const listaJogadores = (jogadoresData || []) as JogadorSimples[];
  const timesSimples = listaTimes
    .filter((t) => t.nome)
    .map((t) => ({ nome: t.nome, bandeira: t.bandeira }));

  // Pódio atual (quem já tem posição definida)
  const podioGols = listaJogadores
    .filter((j) => j.pos_artilheiro != null)
    .sort((a, b) => (a.pos_artilheiro ?? 99) - (b.pos_artilheiro ?? 99));
  const podioAssist = listaJogadores
    .filter((j) => j.pos_assistencia != null)
    .sort((a, b) => (a.pos_assistencia ?? 99) - (b.pos_assistencia ?? 99));

  return (
    <main className="container" style={{ paddingTop: 22 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Painel do Admin ⚙️</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 22 }}>
        Cadastre times, jogos e lance os placares oficiais.
      </p>

      {/* MEMBROS — no topo para aprovação rápida */}
      <section className="bloco" style={qtdPendentes > 0 ? { borderColor: 'rgba(244,196,48,0.4)', background: 'linear-gradient(180deg, rgba(244,196,48,0.04), var(--panel))' } : {}}>
        <h3 className="bloco-tit">
          👥 Membros
          {qtdPendentes > 0 && (
            <span style={{ marginLeft: 8, background: 'var(--gold)', color: '#04140a', fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999 }}>
              {qtdPendentes} aguardando
            </span>
          )}
        </h3>
        <GestaoMembros membros={listaMembros} />
      </section>

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

      {/* PÓDIO REAL — ARTILHEIROS */}
      <section className="bloco bloco-destaque">
        <h3 className="bloco-tit">🥅 Artilheiros reais (top 3)</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
          Preencha ao final da Copa. A posição e os gols são usados para pontuar os palpites de Craques.
        </p>

        {[1, 2, 3].map((pos) => {
          const atual = podioGols.find((j) => j.pos_artilheiro === pos);
          return (
            <div key={pos} className="podio-row">
              <span className="podio-pos">{pos}º</span>
              {atual ? (
                <div className="podio-atual">
                  <span>{atual.bandeira} <strong>{atual.nome}</strong> · {atual.gols_real} gols</span>
                  <form action={limparPodio}>
                    <input type="hidden" name="tipo" value="gols" />
                    <input type="hidden" name="posicao" value={pos} />
                    <button className="chip-x" title="Limpar">✕</button>
                  </form>
                </div>
              ) : (
                <form action={lancarPodio} className="podio-form">
                  <input type="hidden" name="tipo" value="gols" />
                  <input type="hidden" name="posicao" value={pos} />
                  <select name="jogador_id" className="inp inp-select" required>
                    <option value="">Escolher jogador…</option>
                    {listaJogadores.map((j) => (
                      <option key={j.id} value={j.id}>{j.bandeira} {j.nome} ({j.time_nome})</option>
                    ))}
                  </select>
                  <input type="number" name="qtd" min={0} max={50} placeholder="Gols" className="inp inp-qtd" required />
                  <button className="btn btn-gold" style={{ padding: '9px 14px', fontSize: 13 }}>Salvar</button>
                </form>
              )}
            </div>
          );
        })}
      </section>

      {/* PÓDIO REAL — ASSISTÊNCIAS */}
      <section className="bloco bloco-destaque">
        <h3 className="bloco-tit">🎯 Assistências reais (top 3)</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
          Igual ao artilheiro, mas para assistências.
        </p>

        {[1, 2, 3].map((pos) => {
          const atual = podioAssist.find((j) => j.pos_assistencia === pos);
          return (
            <div key={pos} className="podio-row">
              <span className="podio-pos">{pos}º</span>
              {atual ? (
                <div className="podio-atual">
                  <span>{atual.bandeira} <strong>{atual.nome}</strong> · {atual.assist_real} assist.</span>
                  <form action={limparPodio}>
                    <input type="hidden" name="tipo" value="assist" />
                    <input type="hidden" name="posicao" value={pos} />
                    <button className="chip-x" title="Limpar">✕</button>
                  </form>
                </div>
              ) : (
                <form action={lancarPodio} className="podio-form">
                  <input type="hidden" name="tipo" value="assist" />
                  <input type="hidden" name="posicao" value={pos} />
                  <select name="jogador_id" className="inp inp-select" required>
                    <option value="">Escolher jogador…</option>
                    {listaJogadores.map((j) => (
                      <option key={j.id} value={j.id}>{j.bandeira} {j.nome} ({j.time_nome})</option>
                    ))}
                  </select>
                  <input type="number" name="qtd" min={0} max={50} placeholder="Assist." className="inp inp-qtd" required />
                  <button className="btn btn-gold" style={{ padding: '9px 14px', fontSize: 13 }}>Salvar</button>
                </form>
              )}
            </div>
          );
        })}
      </section>

      {/* CONFRONTOS DO MATA-MATA REAL */}
      <section className="bloco">
        <h3 className="bloco-tit">🗓️ Confrontos do mata-mata real</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
          Edite os times quando a FIFA definir os confrontos reais (caso a importação automática demore).
        </p>
        {jogosMata.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Nenhum jogo de mata-mata cadastrado ainda.</p>
        ) : (
          <div className="jlista">
            {jogosMata.map((j) => {
              const casa = j.time_casa ? mapaTimes.get(j.time_casa) : null;
              const fora = j.time_fora ? mapaTimes.get(j.time_fora) : null;
              return (
                <div key={j.id} className="jrow">
                  <div className="jrow-meta mono" style={{ marginBottom: 8 }}>
                    {j.rodada || j.fase} · {formatarData(j.inicio)}
                  </div>
                  <form action={editarConfronto} className="confronto-form">
                    <input type="hidden" name="id" value={j.id} />
                    <select name="time_casa" className="inp" defaultValue={j.time_casa ?? ''}>
                      <option value="">— a definir —</option>
                      {listaTimes.map((t) => <option key={t.id} value={t.id}>{t.bandeira} {t.nome}</option>)}
                    </select>
                    <span style={{ color: 'var(--text-faint)', fontWeight: 700 }}>×</span>
                    <select name="time_fora" className="inp" defaultValue={j.time_fora ?? ''}>
                      <option value="">— a definir —</option>
                      {listaTimes.map((t) => <option key={t.id} value={t.id}>{t.bandeira} {t.nome}</option>)}
                    </select>
                    <button className="btn btn-primary" style={{ padding: '9px 14px', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {casa && fora ? 'Atualizar' : 'Definir'}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
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
              <option value="avos">32 Avos de Final</option>
              <option value="oitavas">Oitavas de Final</option>
              <option value="quartas">Quartas de Final</option>
              <option value="semi">Semifinal</option>
              <option value="final">Final</option>
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
        .podio-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
        }
        .podio-pos {
          font-size: 16px; font-weight: 800; color: var(--gold);
          width: 24px; text-align: center; flex-shrink: 0;
        }
        .podio-atual {
          flex: 1; display: flex; justify-content: space-between; align-items: center;
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 10px; padding: 9px 12px; font-size: 13px;
        }
        .podio-form {
          flex: 1; display: flex; gap: 8px; align-items: center;
        }
        .podio-form .inp-select { flex: 1; }
        .inp-qtd { width: 80px !important; flex: 0 0 80px; text-align: center; }
        .inp-select { flex: 1; }
        .confronto-form {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        }
        .confronto-form .inp { flex: 1; min-width: 140px; }
        @media (max-width: 480px) {
          .form-jogo { grid-template-columns: 1fr; }
          .podio-form { flex-wrap: wrap; }
          .confronto-form { flex-direction: column; }
        }
      `}</style>
    </main>
  );
}
