'use client';

import { definirStatusUsuario } from './acoes';

type Membro = {
  id: string;
  nome: string;
  email: string;
  status: string;
  criado_em: string;
};

export default function GestaoMembros({ membros }: { membros: Membro[] }) {
  const pendentes = membros.filter((m) => m.status === 'pendente');
  const aprovados = membros.filter((m) => m.status === 'aprovado');
  const bloqueados = membros.filter((m) => m.status === 'bloqueado');

  function botoes(m: Membro) {
    return (
      <div className="acoes">
        {m.status !== 'aprovado' && (
          <form action={definirStatusUsuario}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="status" value="aprovado" />
            <button className="btn btn-primary mini">✓ Aprovar</button>
          </form>
        )}
        {m.status !== 'bloqueado' && (
          <form action={definirStatusUsuario}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="status" value="bloqueado" />
            <button className="btn btn-ghost mini">Bloquear</button>
          </form>
        )}
        {m.status === 'bloqueado' && (
          <form action={definirStatusUsuario}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="status" value="pendente" />
            <button className="btn btn-ghost mini">Reverter</button>
          </form>
        )}
      </div>
    );
  }

  function linha(m: Membro) {
    return (
      <div key={m.id} className="m-row">
        <div className="m-info">
          <span className="m-nome">{m.nome}</span>
          <span className="m-email mono">{m.email}</span>
        </div>
        {botoes(m)}
      </div>
    );
  }

  return (
    <div>
      {pendentes.length > 0 && (
        <div className="grupo">
          <div className="grupo-tit pend">
            ⏳ Aguardando aprovação ({pendentes.length})
          </div>
          {pendentes.map(linha)}
        </div>
      )}

      <div className="grupo">
        <div className="grupo-tit ok">✓ Aprovados ({aprovados.length})</div>
        {aprovados.length === 0 ? (
          <p className="vazio">Ninguém aprovado ainda.</p>
        ) : (
          aprovados.map(linha)
        )}
      </div>

      {bloqueados.length > 0 && (
        <div className="grupo">
          <div className="grupo-tit blo">🚫 Bloqueados ({bloqueados.length})</div>
          {bloqueados.map(linha)}
        </div>
      )}

      <style jsx>{`
        .grupo { margin-bottom: 18px; }
        .grupo-tit {
          font-size: 12px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; margin-bottom: 10px;
        }
        .grupo-tit.pend { color: var(--gold); }
        .grupo-tit.ok { color: var(--grass-bright); }
        .grupo-tit.blo { color: var(--red); }
        .vazio { font-size: 13px; color: var(--text-faint); }
        .m-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 12px; padding: 12px 14px; margin-bottom: 8px;
        }
        .m-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .m-nome { font-weight: 700; font-size: 14px; }
        .m-email { font-size: 11px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; }
        .acoes { display: flex; gap: 6px; flex-shrink: 0; }
        .mini { padding: 7px 12px; font-size: 12px; }
      `}</style>
    </div>
  );
}
