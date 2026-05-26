-- ============================================================
--  ARTILHEIROS & ASSISTÊNCIAS  (sem apagar nada)
--
--  Cria a tabela de jogadores (cacheada da API-Football) e a de
--  palpites de top 3 (artilheiros e assistências) de cada pessoa.
--
--  Cole no Supabase: SQL Editor > New query > Run
-- ============================================================

-- Jogadores candidatos (cacheados da API-Football).
create table if not exists jogadores (
  id          bigint primary key,          -- id do jogador na API-Football
  nome        text not null,
  time_nome   text,                        -- seleção (ex: 'França')
  bandeira    text,                        -- emoji da bandeira da seleção
  foto        text,                        -- url da foto (opcional)
  -- estatísticas reais (preenchidas ao fim da Copa, da API):
  gols_real   smallint,
  assist_real smallint,
  -- posição real no ranking (1,2,3...) quando a Copa acabar:
  pos_artilheiro smallint,
  pos_assistencia smallint
);

-- Palpites de top 3. tipo = 'gols' (artilheiros) ou 'assist' (assistências).
-- Cada pessoa tem 3 linhas por tipo (posicao 1, 2, 3).
create table if not exists palpites_craque (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references perfis(id) on delete cascade,
  tipo        text not null check (tipo in ('gols','assist')),
  posicao     smallint not null check (posicao in (1,2,3)),
  jogador_id  bigint references jogadores(id),
  qtd         smallint check (qtd >= 0),   -- gols/assistências previstos
  atualizado_em timestamptz default now(),
  unique (usuario_id, tipo, posicao)
);

create index if not exists idx_craque_usuario on palpites_craque(usuario_id);

-- atualiza 'atualizado_em'
create or replace function public.marcar_atualizacao_craque()
returns trigger as $$
begin new.atualizado_em = now(); return new; end;
$$ language plpgsql;

drop trigger if exists ao_mexer_craque on palpites_craque;
create trigger ao_mexer_craque
  before insert or update on palpites_craque
  for each row execute function public.marcar_atualizacao_craque();

-- ============================================================
--  SEGURANÇA (RLS)
-- ============================================================
alter table jogadores enable row level security;
alter table palpites_craque enable row level security;

-- jogadores: todos logados leem (a lista é pública)
drop policy if exists "jogadores: leitura" on jogadores;
create policy "jogadores: leitura"
  on jogadores for select to authenticated using (true);

-- palpites de craque: leitura pública (transparência), escrita só do próprio aprovado
drop policy if exists "craque: leitura" on palpites_craque;
create policy "craque: leitura"
  on palpites_craque for select to authenticated using (true);

drop policy if exists "craque: inserir" on palpites_craque;
create policy "craque: inserir"
  on palpites_craque for insert to authenticated
  with check (auth.uid() = usuario_id and public.esta_aprovado());

drop policy if exists "craque: editar" on palpites_craque;
create policy "craque: editar"
  on palpites_craque for update to authenticated
  using (auth.uid() = usuario_id and public.esta_aprovado());

-- Pronto! Tabelas de artilheiros/assistências criadas. 🎉
