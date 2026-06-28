-- ============================================================
--  MATA-MATA POR JOGO — palpite de placar igual aos grupos
--
--  Muda o mata-mata: em vez de cada pessoa montar a própria
--  chave, agora todo mundo palpita o PLACAR de cada jogo REAL
--  do mata-mata (avos, oitavas, quartas, semi, final), valendo
--  a mesma pontuação dos grupos (4/3/1) + bônus de pênaltis.
--
--  Cole no Supabase: SQL Editor > New query > Run.
--  NÃO apaga nada: só adiciona 2 colunas e recria a view ranking.
-- ============================================================

-- 1) Palpite: quem a pessoa acha que passa nos pênaltis (só em empate).
alter table palpites
  add column if not exists avanca_penaltis bigint references times(id);

-- 2) Resultado real: quem venceu nos pênaltis (admin preenche no painel,
--    só quando o jogo do mata-mata termina empatado e vai pra disputa).
alter table jogos
  add column if not exists vencedor_penaltis bigint references times(id);

-- 3) A view 'ranking' volta a contar SÓ os jogos de grupos aqui.
--    Os pontos do mata-mata (placar 4/3/1 + bônus de pênaltis) são
--    somados pelo app (lib/ranking-total.ts), pois o bônus depende de
--    cruzar o palpite "quem passa" com "quem venceu nos pênaltis".
create or replace view ranking as
select
  p.id            as usuario_id,
  p.nome,
  p.avatar_url,
  coalesce(sum(
    case
      when j.fase <> 'grupos' then 0
      when j.gols_casa is null or j.gols_fora is null then 0
      when pl.gols_casa = j.gols_casa and pl.gols_fora = j.gols_fora then
        case when j.gols_casa = j.gols_fora then 4   -- empate cravado
             else 3 end                              -- vitória cravada
      when sign(pl.gols_casa - pl.gols_fora) = sign(j.gols_casa - j.gols_fora) then 1
      else 0
    end
  ), 0) as pontos,
  count(pl.id) filter (
    where j.fase = 'grupos' and j.gols_casa is not null and j.gols_fora is not null
  ) as jogos_avaliados,
  count(pl.id) filter (
    where j.fase = 'grupos' and j.gols_casa is not null and j.gols_fora is not null
      and pl.gols_casa = j.gols_casa and pl.gols_fora = j.gols_fora
  ) as placares_cravados
from perfis p
left join palpites pl on pl.usuario_id = p.id
left join jogos j on j.id = pl.jogo_id
where p.status = 'aprovado'
group by p.id, p.nome, p.avatar_url;

-- Pronto! Agora é só palpitar os placares do mata-mata na tela de Jogos. 🏆
-- Obs: a tabela antiga 'palpites_mata' (chave por usuário) não é mais usada
-- para pontuar, mas continua no banco — nada é apagado.
