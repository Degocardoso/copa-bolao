-- ============================================================
--  BOLÃO DA COPA DO MUNDO — Estrutura do Banco de Dados
--  Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run
--  Regra: acertou o PLACAR EXATO = 3 pontos. Caso contrário = 0.
-- ============================================================

-- ---------- LIMPEZA (caso rode novamente) ----------
drop view if exists ranking cascade;
drop table if exists sync_resultados cascade;
drop table if exists importacoes cascade;
drop table if exists palpites cascade;
drop table if exists jogos cascade;
drop table if exists times cascade;
drop table if exists perfis cascade;

-- ============================================================
--  TABELA: perfis
-- ============================================================
create table perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  avatar_url  text,
  -- aprovação: 'pendente' (acabou de logar), 'aprovado' (pode palpitar), 'bloqueado'
  status      text not null default 'pendente' check (status in ('pendente','aprovado','bloqueado')),
  criado_em   timestamptz default now()
);

-- ============================================================
--  TABELA: times
-- ============================================================
create table times (
  id            bigint generated always as identity primary key,
  nome          text not null,
  bandeira      text,
  grupo         text,
  chave_externa text unique   -- usado pela importação para não duplicar
);

-- ============================================================
--  TABELA: jogos
-- ============================================================
create table jogos (
  id            bigint generated always as identity primary key,
  fase          text not null default 'grupos',
  rodada        text,
  time_casa     bigint references times(id),
  time_fora     bigint references times(id),
  inicio        timestamptz not null,
  gols_casa     smallint check (gols_casa >= 0),
  gols_fora     smallint check (gols_fora >= 0),
  chave_externa text unique,   -- usado pela importação para não duplicar
  id_externo    bigint,        -- id do jogo na API de resultados (Football-Data)
  criado_em     timestamptz default now()
);

-- ============================================================
--  TABELA: importacoes  (histórico de cada importação automática)
-- ============================================================
create table importacoes (
  id         bigint generated always as identity primary key,
  fonte      text,
  qtd_times  int,
  qtd_jogos  int,
  quando     timestamptz default now()
);

-- ============================================================
--  TABELA: sync_resultados  (controle do cache da API de placares)
--  Guarda quando foi a última vez que buscamos resultados na API,
--  para respeitar o limite de requisições (cache no banco).
-- ============================================================
create table sync_resultados (
  id            int primary key default 1,
  ultima_sync   timestamptz,
  ultimo_status text,
  check (id = 1)   -- linha única
);
insert into sync_resultados (id, ultima_sync) values (1, null)
  on conflict (id) do nothing;

-- ============================================================
--  TABELA: palpites
-- ============================================================
create table palpites (
  id            bigint generated always as identity primary key,
  usuario_id    uuid not null references perfis(id) on delete cascade,
  jogo_id       bigint not null references jogos(id) on delete cascade,
  gols_casa     smallint not null check (gols_casa >= 0),
  gols_fora     smallint not null check (gols_fora >= 0),
  atualizado_em timestamptz default now(),
  unique (usuario_id, jogo_id)
);

-- ============================================================
--  ÍNDICES
-- ============================================================
create index idx_palpites_usuario on palpites(usuario_id);
create index idx_palpites_jogo on palpites(jogo_id);
create index idx_jogos_inicio on jogos(inicio);

-- ============================================================
--  GATILHO: cria o perfil automaticamente no primeiro login
-- ============================================================
--  TABELA: admins  (emails que entram já aprovados e com poderes)
--  Coloque aqui o MESMO email do Google que você usa para logar.
-- ============================================================
create table if not exists admins (
  email text primary key
);
-- 👉 TROQUE pelo seu email de admin antes de rodar (pode adicionar vários):
insert into admins (email) values ('seu-email@gmail.com')
  on conflict (email) do nothing;

-- ============================================================
create or replace function public.criar_perfil()
returns trigger as $$
declare
  eh_admin boolean;
begin
  -- admin (email cadastrado em 'admins') entra já aprovado
  select exists (select 1 from public.admins a where lower(a.email) = lower(new.email))
    into eh_admin;

  insert into public.perfis (id, nome, email, avatar_url, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    case when eh_admin then 'aprovado' else 'pendente' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Atualiza 'atualizado_em' sempre que um palpite é alterado
-- (serve de prova pública de que o palpite foi feito antes do jogo).
create or replace function public.marcar_atualizacao()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ao_mexer_palpite on palpites;
create trigger ao_mexer_palpite
  before insert or update on palpites
  for each row execute function public.marcar_atualizacao();


-- ============================================================
--  VIEW: ranking  (3 pontos por placar exato cravado)
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
      -- errou: 0
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

-- ============================================================
--  SEGURANÇA (Row Level Security)
-- ============================================================
alter table perfis      enable row level security;
alter table times       enable row level security;
alter table jogos       enable row level security;
alter table palpites    enable row level security;
alter table importacoes enable row level security;
alter table sync_resultados enable row level security;
alter table admins enable row level security;
-- 'admins' não tem policy de leitura: só o servidor (service role) e o
-- gatilho (security definer) acessam. Pelo cliente, fica invisível.

create policy "sync: leitura para logados"
  on sync_resultados for select to authenticated using (true);

create policy "importacoes: leitura para logados"
  on importacoes for select to authenticated using (true);

create policy "perfis: leitura para logados"
  on perfis for select to authenticated using (true);
create policy "perfis: edita o proprio"
  on perfis for update to authenticated using (auth.uid() = id);

create policy "times: leitura para logados"
  on times for select to authenticated using (true);

create policy "jogos: leitura para logados"
  on jogos for select to authenticated using (true);

-- Helper: o usuário logado está aprovado?
create or replace function public.esta_aprovado()
returns boolean as $$
  select exists (
    select 1 from perfis
    where id = auth.uid() and status = 'aprovado'
  );
$$ language sql security definer stable;

-- LEITURA dos palpites:
--  - você sempre vê os SEUS;
--  - os dos OUTROS só depois que o jogo daquele palpite começou
--    (transparência justa: ninguém copia palpite antes do apito).
create policy "palpites: leitura propria e publica pos-jogo"
  on palpites for select to authenticated
  using (
    auth.uid() = usuario_id
    or (select inicio from jogos where jogos.id = jogo_id) <= now()
  );

-- INSERIR: só APROVADOS, nos seus próprios palpites, e antes do jogo.
create policy "palpites: inserir aprovado antes do jogo"
  on palpites for insert to authenticated
  with check (
    auth.uid() = usuario_id
    and public.esta_aprovado()
    and (select inicio from jogos where jogos.id = jogo_id) > now()
  );

-- EDITAR: idem.
create policy "palpites: editar aprovado antes do jogo"
  on palpites for update to authenticated
  using (
    auth.uid() = usuario_id
    and public.esta_aprovado()
    and (select inicio from jogos where jogos.id = jogo_id) > now()
  );

-- ============================================================
--  APROVA ADMINS QUE JÁ EXISTEM
--  Se você já tinha logado antes (nos testes), seu perfil foi criado
--  como 'pendente'. Esta linha aprova automaticamente todo perfil cujo
--  email esteja na tabela 'admins'. Roda sempre que você executa o schema.
-- ============================================================
update perfis p
  set status = 'aprovado'
  from admins a
  where lower(p.email) = lower(a.email)
    and p.status <> 'aprovado';

-- ============================================================
--  FIM. 🎉
-- ============================================================
