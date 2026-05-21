import './login.css';
import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase-server';
import BotaoGoogle from '@/components/BotaoGoogle';

export default async function PaginaLogin() {
  const supabase = criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (data?.user) redirect('/jogos');

  return (
    <main className="login">
      <div className="brilho" />
      <div className="login-card rise">
        <div className="trofeu">🏆</div>
        <h1 className="display titulo">
          BOLÃO DA<br />
          <span className="destaque">COPA DO MUNDO</span>
        </h1>
        <p className="sub">
          Dê seus palpites em cada jogo, dispute pontos com a galera
          e veja quem manda no futebol. 1 acerto = 1 ponto.
        </p>

        <div className="passos">
          <div className="passo">
            <span className="passo-n mono">01</span>
            <span>Entre com sua conta Google</span>
          </div>
          <div className="passo">
            <span className="passo-n mono">02</span>
            <span>Palpite antes de cada jogo começar</span>
          </div>
          <div className="passo">
            <span className="passo-n mono">03</span>
            <span>Acompanhe o ranking ao vivo</span>
          </div>
        </div>

        <BotaoGoogle />

        <p className="aviso">
          Ao entrar, seu palpite trava automaticamente no apito inicial
          de cada partida. Sem volta atrás. ⏱️
        </p>
      </div>

      <footer className="rodape mono">FAMÍLIA &amp; TRABALHO · COPA 2026</footer>
    </main>
  );
}
