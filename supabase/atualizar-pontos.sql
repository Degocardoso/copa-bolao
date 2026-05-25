-- ============================================================
--  ATUALIZAR A REGRA DE PONTOS  (sem apagar nada)
--
--  Regra atual:
--    • empate com placar exato (ex: 2x2 e deu 2x2) ... 4 pontos
--    • vitória com placar exato (ex: 2x1 e deu 2x1) ... 3 pontos
--    • acertou só o resultado (vencedor certo OU empate) ... 1 ponto
--    • errou ................................................ 0 ponto
--
--  Só substitui a "view" do ranking. NÃO mexe em jogos, times
--  nem palpites. Pode rodar com tranquilidade.
--
--  Cole no Supabase: SQL Editor > New query > Run
-- ============================================================

create or replace view ranking as
select
  p.id            as usuario_id,
  p.nome,
  p.avatar_url,
  coalesce(sum(
    case
      when j.gols_casa is null or j.gols_fora is null then 0
      -- placar exato:
      when pl.gols_casa = j.gols_casa and pl.gols_fora = j.gols_fora then
        case when j.gols_casa = j.gols_fora then 4   -- empate cravado
             else 3 end                              -- vitória cravada
      -- acertou só o resultado (vencedor certo ou empate certo): 1 ponto
      when sign(pl.gols_casa - pl.gols_fora) = sign(j.gols_casa - j.gols_fora) then 1
      else 0
    end
  ), 0) as pontos,
  count(pl.id) filter (
    where j.gols_casa is not null and j.gols_fora is not null
  ) as jogos_avaliados,
  count(pl.id) filter (
    where j.gols_casa is not null and j.gols_fora is not null
      and pl.gols_casa = j.gols_casa and pl.gols_fora = j.gols_fora
  ) as placares_cravados
from perfis p
left join palpites pl on pl.usuario_id = p.id
left join jogos j on j.id = pl.jogo_id
where p.status = 'aprovado'
group by p.id, p.nome, p.avatar_url;

-- Pronto! A nova regra já vale. O ranking recalcula sozinho. 🎉
