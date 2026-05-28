'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { criarClienteNavegador } from '@/lib/supabase-browser';

const abas = [
  { href: '/jogos', label: 'Jogos', icone: '⚽' },
  { href: '/meus-palpites', label: 'Palpites', icone: '🎯' },
  { href: '/simulador', label: 'Chave', icone: '🔮' },
  { href: '/craques', label: 'Craques', icone: '⭐' },
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
  const [menuAberto, setMenuAberto] = useState(false);

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
            {/* botão hambúrguer (só no mobile) */}
            <button
              className="hamburger"
              onClick={() => setMenuAberto((v) => !v)}
              aria-label="Menu"
              aria-expanded={menuAberto}
            >
              {menuAberto ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* barra de abas — desktop */}
      <nav className="navbar">
        <div className="container navbar-inner">
          {todasAbas.map((aba) => {
            const ativo = pathname === aba.href || pathname.startsWith(aba.href + '/');
            return (
              <a key={aba.href} href={aba.href} className={`nav-item ${ativo ? 'nav-ativo' : ''}`}>
                <span className="nav-icone">{aba.icone}</span>
                <span className="nav-label">{aba.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* menu deslizante — mobile */}
      {menuAberto && <div className="overlay" onClick={() => setMenuAberto(false)} />}
      <nav className={`menu-mobile ${menuAberto ? 'aberto' : ''}`}>
        {todasAbas.map((aba) => {
          const ativo = pathname === aba.href || pathname.startsWith(aba.href + '/');
          return (
            <a
              key={aba.href}
              href={aba.href}
              className={`mm-item ${ativo ? 'mm-ativo' : ''}`}
              onClick={() => setMenuAberto(false)}
            >
              <span className="mm-icone">{aba.icone}</span>
              <span>{aba.label}</span>
            </a>
          );
        })}
        <button className="mm-item mm-sair" onClick={() => { setMenuAberto(false); sair(); }}>
          <span className="mm-icone">🚪</span>
          <span>Sair</span>
        </button>
      </nav>

      <style jsx>{`
        .topo {
          position: sticky; top: 0; z-index: 30;
          background: rgba(10, 20, 16, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--line);
        }
        .topo-inner {
          display: flex; align-items: center; justify-content: space-between; height: 64px;
        }
        .marca { display: flex; align-items: center; gap: 11px; }
        .marca-bola { font-size: 26px; filter: drop-shadow(0 0 10px rgba(46, 232, 107, 0.5)); }
        .marca-titulo { font-size: 19px; color: var(--white); }
        .marca-sub { font-size: 10px; letter-spacing: 0.22em; color: var(--grass-bright); margin-top: 1px; }
        .topo-dir { display: flex; align-items: center; gap: 12px; }
        .ola { font-size: 13px; color: var(--text-dim); }
        .ola b { color: var(--text); }
        .btn-sair { padding: 8px 14px; font-size: 13px; }

        /* hambúrguer escondido no desktop */
        .hamburger {
          display: none;
          background: var(--panel); border: 1px solid var(--line);
          color: var(--text); border-radius: 10px;
          width: 42px; height: 42px; font-size: 20px;
          align-items: center; justify-content: center;
        }

        .navbar {
          position: sticky; top: 64px; z-index: 19;
          background: var(--bg-2); border-bottom: 1px solid var(--line);
        }
        .navbar-inner { display: flex; gap: 4px; }
        .nav-item {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 13px 8px; font-size: 14px; font-weight: 600; color: var(--text-faint);
          border-bottom: 2px solid transparent; transition: color 0.2s, border-color 0.2s;
        }
        .nav-item:hover { color: var(--text-dim); }
        .nav-ativo { color: var(--grass-bright); border-bottom-color: var(--grass-bright); }
        .nav-icone { font-size: 16px; }

        /* menu mobile (escondido no desktop) */
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 25;
        }
        .menu-mobile {
          display: none;
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 26;
          width: 75%; max-width: 280px;
          background: var(--bg-2); border-left: 1px solid var(--line);
          flex-direction: column; padding: 78px 14px 20px;
          transform: translateX(100%); transition: transform 0.25s ease;
          box-shadow: -10px 0 40px rgba(0,0,0,0.4);
        }
        .menu-mobile.aberto { transform: translateX(0); }
        .mm-item {
          display: flex; align-items: center; gap: 13px;
          padding: 15px 16px; border-radius: 12px; font-size: 16px; font-weight: 600;
          color: var(--text-dim); background: transparent; border: none; text-align: left; width: 100%;
        }
        .mm-item:hover { background: var(--panel); }
        .mm-ativo { background: rgba(29,185,84,0.14); color: var(--grass-bright); }
        .mm-icone { font-size: 22px; width: 26px; text-align: center; }
        .mm-sair { margin-top: auto; color: var(--red); cursor: pointer; }

        @media (max-width: 640px) {
          .ola { display: none; }
          .btn-sair { display: none; }     /* sair vai pro menu mobile */
          .hamburger { display: flex; }
          .navbar { display: none; }        /* esconde a barra de abas */
          .menu-mobile { display: flex; }
        }
      `}</style>
    </>
  );
}
