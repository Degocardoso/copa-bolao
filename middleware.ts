'use client';

import { useRouter } from 'next/navigation';

export default function TelaEspera({
  nome,
  bloqueado,
}: {
  nome: string;
  bloqueado: boolean;
}) {
  const router = useRouter();

  return (
    <main className="espera">
      <div className="card-espera rise">
        <div className="emoji">{bloqueado ? '🚫' : '⏳'}</div>
        <h1 className="display titulo">
          {bloqueado ? 'Acesso não liberado' : 'Quase lá!'}
        </h1>
        <p className="texto">
          {bloqueado ? (
            <>Olá, {nome.split(' ')[0]}. Seu acesso a este bolão não está liberado.
            Se acha que é um engano, fale com o organizador.</>
          ) : (
            <>Olá, {nome.split(' ')[0]}! Você entrou com sucesso. 🎉<br /><br />
            Agora é só aguardar o organizador <b>aprovar a sua entrada</b> no bolão.
            Assim que ele liberar, você já poderá dar seus palpites. Pode fechar
            esta página e voltar mais tarde.</>
          )}
        </p>
        <button className="btn btn-ghost" onClick={() => router.refresh()}>
          🔄 Verificar de novo
        </button>
      </div>

      <style jsx>{`
        .espera {
          min-height: 70vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px 18px;
        }
        .card-espera {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 40px 30px;
          max-width: 420px;
          text-align: center;
          box-shadow: var(--shadow);
        }
        .emoji { font-size: 54px; }
        .titulo { font-size: 28px; margin-top: 12px; color: var(--white); }
        .texto {
          color: var(--text-dim);
          font-size: 15px;
          line-height: 1.6;
          margin: 18px 0 26px;
        }
        .texto b { color: var(--text); }
      `}</style>
    </main>
  );
}
