'use client';

import { definirStatusUsuario } from './acoes';

type Membro = {
  id: string;
  nome: string;
  email: string;
  status: string;
  criado_em: string;
};

function iniciais(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function AvatarLetra({ nome }: { nome: string }) {
  return (
    <div
      style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: 'var(--grass-deep)', color: '#04140a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 14,
      }}
    >
      {iniciais(nome)}
    </div>
  );
}

export default function GestaoMembros({ membros }: { membros: Membro[] }) {
  const pendentes = membros.filter((m) => m.status === 'pendente');
  const aprovados = membros.filter((m) => m.status === 'aprovado');
  const bloqueados = membros.filter((m) => m.status === 'bloqueado');

  function Linha({ m }: { m: Membro }) {
    return (
      <div className={`m-row m-row-${m.status}`}>
        <AvatarLetra nome={m.nome} />
        <div className="m-info">
          <span className="m-nome">{m.nome}</span>
          <span className="m-email mono">{m.email}</span>
        </div>
        <div className="m-side">
          <span className={`badge badge-${m.status}`}>
            {m.status === 'pendente' ? 'Pendente' : m.status === 'aprovado' ? 'Aprovado' : 'Bloqueado'}
          </span>
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
                <button className="btn-danger mini">Bloquear</button>
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
        </div>
      </div>
    );
  }

  return (
    <div className="membros-wrap">
      {/* Resumo rápido */}
      <div className="resumo">
        <div className="resumo-item pend">
          <span className="resumo-num">{pendentes.length}</span>
          <span className="resumo-label">aguardando</span>
        </div>
        <div className="resumo-item ok">
          <span className="resumo-num">{aprovados.length}</span>
          <span className="resumo-label">aprovados</span>
        </div>
        <div className="resumo-item blo">
          <span className="resumo-num">{bloqueados.length}</span>
          <span className="resumo-label">bloqueados</span>
        </div>
      </div>

      {/* Pendentes em destaque */}
      {pendentes.length > 0 && (
        <div className="grupo grupo-pend">
          <div className="grupo-tit pend">⏳ Aguardando aprovação ({pendentes.length})</div>
          {pendentes.map((m) => <Linha key={m.id} m={m} />)}
        </div>
      )}

      {/* Aprovados */}
      {aprovados.length > 0 && (
        <div className="grupo">
          <div className="grupo-tit ok">✓ Aprovados ({aprovados.length})</div>
          {aprovados.map((m) => <Linha key={m.id} m={m} />)}
        </div>
      )}

      {/* Bloqueados */}
      {bloqueados.length > 0 && (
        <div className="grupo">
          <div className="grupo-tit blo">🚫 Bloqueados ({bloqueados.length})</div>
          {bloqueados.map((m) => <Linha key={m.id} m={m} />)}
        </div>
      )}

      {membros.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '20px 0' }}>
          Nenhum membro cadastrado ainda.
        </p>
      )}

      <style jsx>{`
        .membros-wrap { display: flex; flex-direction: column; gap: 0; }

        .resumo {
          display: flex; gap: 10px; margin-bottom: 18px;
        }
        .resumo-item {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          padding: 12px 8px; border-radius: 12px; border: 1px solid var(--line);
          background: var(--bg-2);
        }
        .resumo-num { font-size: 22px; font-weight: 800; line-height: 1; }
        .resumo-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; font-weight: 600; }
        .resumo-item.pend .resumo-num { color: var(--gold); }
        .resumo-item.pend .resumo-label { color: var(--gold); opacity: 0.7; }
        .resumo-item.ok .resumo-num { color: var(--grass-bright); }
        .resumo-item.ok .resumo-label { color: var(--grass-bright); opacity: 0.7; }
        .resumo-item.blo .resumo-num { color: var(--red); }
        .resumo-item.blo .resumo-label { color: var(--red); opacity: 0.7; }

        .grupo { margin-bottom: 16px; }
        .grupo-pend {
          background: rgba(244,196,48,0.05);
          border: 1px solid rgba(244,196,48,0.2);
          border-radius: 13px; padding: 12px;
        }
        .grupo-tit {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; margin-bottom: 10px;
        }
        .grupo-tit.pend { color: var(--gold); }
        .grupo-tit.ok { color: var(--grass-bright); }
        .grupo-tit.blo { color: var(--red); }

        .m-row {
          display: flex; align-items: center; gap: 12px;
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 12px; padding: 13px 14px; margin-bottom: 8px;
        }
        .m-row:last-child { margin-bottom: 0; }
        .m-row-pendente { border-color: rgba(244,196,48,0.3); }
        .m-info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .m-nome { font-weight: 700; font-size: 14.5px; line-height: 1.2; }
        .m-email { font-size: 11px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .m-side {
          display: flex; flex-direction: column; align-items: flex-end;
          gap: 8px; flex-shrink: 0;
        }
        .badge {
          font-size: 9px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.06em; padding: 3px 9px; border-radius: 999px;
          white-space: nowrap;
        }
        .badge-pendente { background: rgba(244,196,48,0.15); color: var(--gold); }
        .badge-aprovado { background: rgba(29,185,84,0.14); color: var(--grass-bright); }
        .badge-bloqueado { background: rgba(255,91,91,0.13); color: var(--red); }

        .acoes { display: flex; gap: 6px; }
        .mini { padding: 7px 13px; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .btn-danger {
          background: rgba(255,91,91,0.1); border: 1px solid rgba(255,91,91,0.3);
          color: var(--red); border-radius: 10px; cursor: pointer;
        }
        .btn-danger:hover { background: rgba(255,91,91,0.2); }

        @media (max-width: 460px) {
          .m-row { flex-wrap: wrap; }
          .m-side { width: 100%; flex-direction: row; align-items: center;
            justify-content: space-between; padding-left: 50px; }
        }
      `}</style>
    </div>
  );
}
