'use client';

import { usePathname, useRouter } from 'next/navigation';
import { criarClienteNavegador } from '@/lib/supabase-browser';

const abas = [
  { href: '/jogos', label: 'Jogos', icone: '⚽' },
  { href: '/meus-palpites', label: 'Palpites', icone: '🎯' },
  { href: '/transparencia', label: 'Galera', icone: '👀' },
  { href: '/ranking', label: 'Ranking', icone: '🏆' },
];

export default function Cabecalho({
  nome,
  admin,
}: {
  nome: string;
  admin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    const supabase = criarClienteNavegador();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const todasAbas = admin
    ? [...abas, { href: '/admin', label: 'Admin', icone: '⚙️' }]
    : abas;

  return (
    <>
      <header className="topo">
        <div className="container topo-inner">
          <div className="marca">
            <span className="marca-bola">⚽</span>
            <div>
              <div className="marca-titulo display">BOLÃO</div>
              <div className="marca-sub mono">COPA DO MUNDO</div>
            </div>
          </div>
          <div className="topo-dir">
            <span className="ola">Olá, <b>{nome.split(' ')[0]}</b></span>
            <button className="btn btn-ghost btn-sair" onClick={sair}>Sair</button>
          </div>
        </div>
      </header>

      <nav className="navbar">
        <div className="container navbar-inner">
          {todasAbas.map((aba) => {
            const ativo = pathname === aba.href || pathname.startsWith(aba.href + '/');
            return (
              <a
                key={aba.href}
                href={aba.href}
                className={`nav-item ${ativo ? 'nav-ativo' : ''}`}
              >
                <span className="nav-icone">{aba.icone}</span>
                <span className="nav-label">{aba.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      <style jsx>{`
        .topo {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(10, 20, 16, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--line);
        }
        .topo-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .marca { display: flex; align-items: center; gap: 11px; }
        .marca-bola {
          font-size: 26px;
          filter: drop-shadow(0 0 10px rgba(46, 232, 107, 0.5));
        }
        .marca-titulo {
          font-size: 19px;
          color: var(--white);
        }
        .marca-sub {
          font-size: 10px;
          letter-spacing: 0.22em;
          color: var(--grass-bright);
          margin-top: 1px;
        }
        .topo-dir { display: flex; align-items: center; gap: 12px; }
        .ola { font-size: 13px; color: var(--text-dim); }
        .ola b { color: var(--text); }
        .btn-sair { padding: 8px 14px; font-size: 13px; }

        .navbar {
          position: sticky;
          top: 64px;
          z-index: 19;
          background: var(--bg-2);
          border-bottom: 1px solid var(--line);
        }
        .navbar-inner { display: flex; gap: 4px; }
        .nav-item {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 13px 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-faint);
          border-bottom: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s;
        }
        .nav-item:hover { color: var(--text-dim); }
        .nav-ativo {
          color: var(--grass-bright);
          border-bottom-color: var(--grass-bright);
        }
        .nav-icone { font-size: 16px; }

        @media (max-width: 480px) {
          .ola { display: none; }
          .nav-label { display: none; }
          .nav-icone { font-size: 20px; }
          .nav-item { padding: 14px 8px; }
        }
      `}</style>
    </>
  );
}
