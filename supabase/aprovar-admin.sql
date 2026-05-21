-- ============================================================
--  APROVAR-ME COMO ADMIN  (sem apagar nada)
--
--  Use este arquivo se você JÁ rodou o schema.sql antes e só quer
--  se aprovar (ou aprovar outro admin) sem recriar o banco do zero.
--
--  Cole no Supabase: SQL Editor > New query > Run
-- ============================================================

-- 1) Garante que a tabela de admins existe
create table if not exists admins (
  email text primary key
);

-- 2) 👉 TROQUE pelo SEU email do Google (o mesmo com que você loga).
--     Pode rodar várias vezes / adicionar mais de um admin.
insert into admins (email) values ('seu-email@gmail.com')
  on conflict (email) do nothing;

-- 3) Aprova todo perfil cujo email esteja na lista de admins
update perfis p
  set status = 'aprovado'
  from admins a
  where lower(p.email) = lower(a.email)
    and p.status <> 'aprovado';

-- Pronto! Recarregue o site e você já estará aprovado. 🎉
