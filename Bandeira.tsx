'use client';

import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase-browser';

export default function Login() {
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [email, setEmail] = useState('');
  const [enviandoLink, setEnviandoLink] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrarGoogle() {
    setCarregandoGoogle(true);
    setErro(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) {
      setCarregandoGoogle(false);
      setErro('Não foi possível entrar com o Google. Tente de novo.');
    }
  }

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !emailLimpo.includes('@')) {
      setErro('Digite um email válido.');
      return;
    }
    setEnviandoLink(true);
    setErro(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email: emailLimpo,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    setEnviandoLink(false);
    if (error) {
      setErro('Não foi possível enviar o link. Confira o email e tente de novo.');
    } else {
      setLinkEnviado(true);
    }
  }

  if (linkEnviado) {
    return (
      <div className="enviado">
        <div className="env-emoji">📨</div>
        <p className="env-tit">Link enviado!</p>
        <p className="env-txt">
          Mandamos um link de acesso para <b>{email.trim().toLowerCase()}</b>.
          Abra seu email e clique no link para entrar. (Confira o spam, por via das dúvidas.)
        </p>
        <button className="btn btn-ghost" onClick={() => { setLinkEnviado(false); setEmail(''); }}>
          Usar outro email
        </button>
        <style jsx>{`
          .enviado { text-align: center; }
          .env-emoji { font-size: 44px; }
          .env-tit { font-weight: 800; font-size: 18px; color: var(--text); margin: 8px 0 6px; }
          .env-txt { font-size: 14px; color: var(--text-dim); line-height: 1.55; margin-bottom: 18px; }
          .env-txt b { color: var(--text); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-box">
      <button className="btn btn-block google" onClick={entrarGoogle} disabled={carregandoGoogle}>
        {!carregandoGoogle && (
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        <span>{carregandoGoogle ? 'Conectando…' : 'Entrar com Google'}</span>
      </button>

      <div className="divisor"><span>ou com seu email</span></div>

      <form onSubmit={enviarLink} className="form-email">
        <input
          type="email"
          className="inp-email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          disabled={enviandoLink}
        />
        <button type="submit" className="btn btn-block link-btn" disabled={enviandoLink}>
          {enviandoLink ? 'Enviando…' : '✉️ Receber link de acesso'}
        </button>
      </form>

      {erro && <p className="erro">{erro}</p>}

      <style jsx>{`
        .login-box { width: 100%; }
        .google { background: var(--white); color: #1f1f1f; font-weight: 700; font-size: 15px; padding: 14px; }
        .google:hover { filter: brightness(0.96); }
        .divisor {
          display: flex; align-items: center; gap: 12px;
          margin: 18px 0; color: var(--text-faint); font-size: 12px;
        }
        .divisor::before, .divisor::after {
          content: ''; flex: 1; height: 1px; background: var(--line);
        }
        .form-email { display: flex; flex-direction: column; gap: 9px; }
        .inp-email {
          width: 100%; background: var(--bg-2); border: 1px solid var(--line);
          border-radius: 12px; padding: 13px 15px; color: var(--text); font-size: 15px;
          text-align: center;
        }
        .inp-email:focus { outline: none; border-color: var(--grass-bright); }
        .link-btn {
          background: var(--panel); color: var(--text); border: 1px solid var(--line);
          font-weight: 700; font-size: 14px; padding: 13px;
        }
        .link-btn:hover { background: var(--panel-2); border-color: var(--grass-deep); }
        .erro { color: var(--red); font-size: 13px; text-align: center; margin-top: 12px; }
      `}</style>
    </div>
  );
}
