-- ============================================================
--  CORRIGIR GRUPOS DOS TIMES  (sem apagar nada)
--
--  Se os times foram importados sem o campo "grupo" preenchido,
--  o simulador de mata-mata não consegue montar a chave.
--  Este script deduz o grupo de cada time a partir dos jogos
--  da fase de grupos (campo "rodada", ex: "Grupo A").
--
--  Cole no Supabase: SQL Editor > New query > Run
-- ============================================================

-- Atualiza o grupo de cada time com base no jogo de grupo em que ele aparece.
-- Usa a rodada do jogo (ex: "Grupo A") para extrair a letra.
with grupos_dos_times as (
  select t.id as time_id,
         upper(trim(regexp_replace(j.rodada, '(?i)grupo', ''))) as letra
  from times t
  join jogos j
    on (j.time_casa = t.id or j.time_fora = t.id)
   and j.fase = 'grupos'
   and j.rodada ilike '%grupo%'
)
update times t
   set grupo = g.letra
  from grupos_dos_times g
 where g.time_id = t.id
   and (t.grupo is null or t.grupo = '');

-- Confere o resultado (deve listar os times com seus grupos)
-- select nome, grupo from times where grupo is not null order by grupo, nome;

-- Pronto! Agora o simulador consegue montar a chave. 🎉
