'use client';

import { definirStatusUsuario } from './acoes';

type Membro = {
  id: string;
  nome: string;
  email: string;
  status: string;
  criado_em: string;
};

const LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  bloqueado: 'Bloqueado',
};

function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function AcaoBtn({ id, status, children, variant }: {
  id: string; status: string; variant: 'aprovar' | 'bloquear' | 'reverter'; children: React.ReactNode;
}) {
  return (
    <form action={definirStatusUsuario}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`acao acao-${variant}`}>{children}</button>
    </form>
  );
}

export default function GestaoMembros({ membros }: { membros: Membro[] }) {
  const pendentes = membros.filter((m) => m.status === 'pendente');
  const aprovados = membros.filter((m) => m.status === 'aprovado');
  const bloqueados = membros.filter((m) => m.status === 'bloqueado');

  function Linha({ m }: { m: Membro }) {
    return (
      <div className={`m-row m-row-${m.status}`}>
        <div className="avatar">{iniciais(m.nome)}</div>

        <div className="m-info">
          <span className="m-nome">{m.nome}</span>
          <span className="m-email mono">{m.email}</span>
        </div>

        <span className={`badge badge-${m.status}`}>{LABEL[m.status]}</span>

        <div className="acoes">
          {m.status !== 'aprovado' && (
            <AcaoBtn id={m.id} status="aprovado" variant="aprovar">✓ Aprovar</AcaoBtn>
          )}
          {m.status !== 'bloqueado' && (
            <AcaoBtn id={m.id} status="bloqueado" variant="bloquear">Bloquear</AcaoBtn>
          )}
          {m.status === 'bloqueado' && (
            <AcaoBtn id={m.id} status="pendente" variant="reverter">Reverter</AcaoBtn>
          )}
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

      {pendentes.length > 0 && (
        <div className="grupo grupo-pend">
          <div className="grupo-tit pend">⏳ Aguardando aprovação ({pendentes.length})</div>
          {pendentes.map((m) => <Linha key={m.id} m={m} />)}
        </div>
      )}

      {aprovados.length > 0 && (
        <div className="grupo">
          <div className="grupo-tit ok">✓ Aprovados ({aprovados.length})</div>
          {aprovados.map((m) => <Linha key={m.id} m={m} />)}
        </div>
      )}

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
        .resumo-num   { font-size: 22px; font-weight: 800; line-height: 1; }
        .resumo-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; font-weight: 600; }
        .pend .resumo-num, .pend .resumo-label { color: var(--gold); }
        .ok   .resumo-num, .ok   .resumo-label { color: var(--grass-bright); }
        .blo  .resumo-num, .blo  .resumo-label { color: var(--red); }

        /* ── Grupos ── */
        .grupo { margin-bottom: 16px; }
        .grupo:last-child { margin-bottom: 0; }
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

        /* ── Linha de membro ──
           flex-wrap: em telas largas tudo numa linha; quando aperta,
           as ações descem sozinhas pra linha de baixo (sem duplicar). */
        .m-row {
          display: flex; align-items: center; flex-wrap: wrap;
          gap: 10px 12px;
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 12px; padding: 12px 14px; margin-bottom: 8px;
        }
        .m-row:last-child { margin-bottom: 0; }
        .m-row-pendente { border-color: rgba(244,196,48,0.35); }

        .avatar {
          width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
          background: var(--grass-deep); color: #04140a;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 14px;
        }

        /* nome/email — ocupa o espaço, encolhe com ellipsis */
        .m-info { flex: 1 1 150px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .m-nome  { font-weight: 700; font-size: 14px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .m-email { font-size: 11.5px; line-height: 1.3; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .badge {
          flex-shrink: 0;
          font-size: 9px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.06em; padding: 4px 10px; border-radius: 999px; white-space: nowrap;
        }
        .badge-pendente  { background: rgba(244,196,48,0.15); color: var(--gold); }
        .badge-aprovado  { background: rgba(29,185,84,0.14);  color: var(--grass-bright); }
        .badge-bloqueado { background: rgba(255,91,91,0.13);  color: var(--red); }

        /* ações: empurra pra direita; quando quebra linha, vira full-width
           dividido igualmente entre os botões */
        .acoes { display: flex; gap: 8px; margin-left: auto; flex-shrink: 0; }

        .acao {
          padding: 8px 16px; font-size: 12.5px; font-weight: 700;
          border-radius: 10px; cursor: pointer; white-space: nowrap;
          border: 1px solid transparent; transition: filter .15s, background .15s;
        }
        .acao-aprovar {
          background: var(--grass-bright); color: #04140a;
        }
        .acao-aprovar:hover { filter: brightness(1.07); }
        .acao-bloquear {
          background: transparent; border-color: rgba(255,91,91,0.4); color: var(--red);
        }
        .acao-bloquear:hover { background: rgba(255,91,91,0.13); }
        .acao-reverter {
          background: var(--panel-2); border-color: var(--line); color: var(--text);
        }
        .acao-reverter:hover { background: var(--bg-2); }

        /* Mobile: a faixa de ações ocupa a largura toda e divide igual */
        @media (max-width: 560px) {
          .acoes { width: 100%; margin-left: 0; }
          .acoes :global(form) { flex: 1; }
          .acao { width: 100%; }
        }
      `}</style>
    </div>
  );
}
