-- ============================================================
--  SIMULADOR — Tabela de palpites do MATA-MATA  (sem apagar nada)
--
--  Cada pessoa monta a própria chave (a partir dos palpites de grupo)
--  e palpita quem vence cada confronto, com placar. Guardamos aqui.
--
--  Este script SÓ CRIA a tabela nova e suas regras. NÃO mexe em
--  jogos, times, perfis nem nos palpites de grupo já existentes.
--
--  Cole no Supabase: SQL Editor > New query > Run
-- ============================================================

create table if not exists palpites_mata (
  id            bigint generated always as identity primary key,
  usuario_id    uuid not null references perfis(id) on delete cascade,
  -- identificador do confronto na chave da pessoa (ex: 'oitavas-1', 'final')
  confronto     text not null,
  fase          text not null,   -- 'oitavas','quartas','semi','final'
  -- os dois times daquele confronto (como a chave da pessoa gerou)
  time_a        bigint references times(id),
  time_b        bigint references times(id),
  -- palpite da pessoa:
  vencedor      bigint references times(id),   -- quem ela acha que avança
  gols_a        smallint check (gols_a >= 0),  -- placar (para o bônus)
  gols_b        smallint check (gols_b >= 0),
  atualizado_em timestamptz default now(),
  unique (usuario_id, confronto)
);

create index if not exists idx_palpites_mata_usuario on palpites_mata(usuario_id);

-- atualiza 'atualizado_em' a cada alteração
create or replace function public.marcar_atualizacao_mata()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ao_mexer_palpite_mata on palpites_mata;
create trigger ao_mexer_palpite_mata
  before insert or update on palpites_mata
  for each row execute function public.marcar_atualizacao_mata();

-- ============================================================
--  SEGURANÇA (RLS)
-- ============================================================
alter table palpites_mata enable row level security;

-- helper que checa se o usuário está aprovado (já existe no schema principal,
-- mas recriamos aqui por garantia, sem efeito colateral)
create or replace function public.esta_aprovado()
returns boolean as $$
  select exists (
    select 1 from perfis where id = auth.uid() and status = 'aprovado'
  );
$$ language sql security definer stable;

-- LEITURA: você sempre vê os seus; os dos outros são públicos
-- (o mata-mata é palpitado antes dos jogos, mas como cada um tem a própria
--  chave, não há o problema de "copiar" — e a transparência é bem-vinda).
drop policy if exists "mata: leitura" on palpites_mata;
create policy "mata: leitura"
  on palpites_mata for select to authenticated using (true);

-- INSERIR / EDITAR: só aprovados, só os próprios palpites.
drop policy if exists "mata: inserir" on palpites_mata;
create policy "mata: inserir"
  on palpites_mata for insert to authenticated
  with check (auth.uid() = usuario_id and public.esta_aprovado());

drop policy if exists "mata: editar" on palpites_mata;
create policy "mata: editar"
  on palpites_mata for update to authenticated
  using (auth.uid() = usuario_id and public.esta_aprovado());

-- Pronto! A tabela do mata-mata está criada. 🎉
