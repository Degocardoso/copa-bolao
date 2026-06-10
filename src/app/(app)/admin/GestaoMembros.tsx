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
  return nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function GestaoMembros({ membros }: { membros: Membro[] }) {
  const pendentes = membros.filter((m) => m.status === 'pendente');
  const aprovados = membros.filter((m) => m.status === 'aprovado');
  const bloqueados = membros.filter((m) => m.status === 'bloqueado');

  function Linha({ m }: { m: Membro }) {
    return (
      <div className={`m-row m-row-${m.status}`}>
        {/* Avatar */}
        <div className="avatar">{iniciais(m.nome)}</div>

        {/* Nome + email — ocupa o espaço livre */}
        <div className="m-info">
          <span className="m-nome">{m.nome}</span>
          <span className="m-email mono">{m.email}</span>
        </div>

        {/* Badge + botões — coluna direita, alinhada */}
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
      {/* Resumo */}
      <div className="resumo">
        {[
          { label: 'aguardando', num: pendentes.length, cls: 'pend' },
          { label: 'aprovados',  num: aprovados.length,  cls: 'ok'   },
          { label: 'bloqueados', num: bloqueados.length, cls: 'blo'  },
        ].map(({ label, num, cls }) => (
          <div key={label} className={`resumo-item ${cls}`}>
            <span className="resumo-num">{num}</span>
            <span className="resumo-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Pendentes */}
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
        .membros-wrap { display: flex; flex-direction: column; }

        /* ── Resumo ── */
        .resumo { display: flex; gap: 10px; margin-bottom: 18px; }
        .resumo-item {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          padding: 12px 8px; border-radius: 12px; border: 1px solid var(--line);
          background: var(--bg-2);
        }
        .resumo-num  { font-size: 22px; font-weight: 800; line-height: 1; }
        .resumo-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; font-weight: 600; }
        .pend .resumo-num, .pend .resumo-label { color: var(--gold); }
        .ok   .resumo-num, .ok   .resumo-label { color: var(--grass-bright); }
        .blo  .resumo-num, .blo  .resumo-label { color: var(--red); }

        /* ── Grupos ── */
        .grupo { margin-bottom: 16px; }
        .grupo-pend {
          background: rgba(244,196,48,0.05); border: 1px solid rgba(244,196,48,0.25);
          border-radius: 13px; padding: 12px;
        }
        .grupo-tit {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; margin-bottom: 10px;
        }
        .grupo-tit.pend { color: var(--gold); }
        .grupo-tit.ok   { color: var(--grass-bright); }
        .grupo-tit.blo  { color: var(--red); }

        /* ── Linha de membro ── */
        .m-row {
          display: grid;
          grid-template-columns: 38px 1fr auto;
          align-items: center;
          gap: 12px;
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 12px; padding: 12px 14px; margin-bottom: 8px;
        }
        .m-row:last-child { margin-bottom: 0; }
        .m-row-pendente { border-color: rgba(244,196,48,0.35); }

        /* Avatar */
        .avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--grass-deep); color: #04140a;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 14px;
        }

        /* Info */
        .m-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .m-nome  { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .m-email { font-size: 11px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Coluna direita: badge em cima, botões embaixo */
        .m-side {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 8px; flex-shrink: 0;
        }
        .badge {
          font-size: 9px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.06em; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
        }
        .badge-pendente { background: rgba(244,196,48,0.15); color: var(--gold); }
        .badge-aprovado { background: rgba(29,185,84,0.14);  color: var(--grass-bright); }
        .badge-bloqueado { background: rgba(255,91,91,0.13); color: var(--red); }

        .acoes { display: flex; gap: 6px; }
        .mini { padding: 7px 13px; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .btn-danger {
          background: rgba(255,91,91,0.1); border: 1px solid rgba(255,91,91,0.3);
          color: var(--red); border-radius: 10px; cursor: pointer; font-weight: 700;
        }
        .btn-danger:hover { background: rgba(255,91,91,0.2); }
      `}</style>
    </div>
  );
}
