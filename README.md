# 🏆 Bolão da Copa do Mundo — Guia de Instalação

Site de bolão com login pelo Google, palpites de placar exato e ranking automático.
Tudo roda de graça no **Supabase** (banco + login) + **Vercel** (hospedagem).

**Regra de pontuação:** cravou o placar exato = **3 pontos**. Errou o placar = 0.
**Trava:** cada palpite fecha sozinho no horário de início do jogo. Sem volta.

Você vai seguir 5 etapas. Reserve uns 30–40 minutos. Não precisa saber programar —
é tudo copiar, colar e clicar. Vá com calma.

---

## ✅ Antes de começar

Crie (se ainda não tiver) uma conta em:
- https://supabase.com  (pode entrar com o Google)
- https://vercel.com    (pode entrar com o Google)
- https://github.com    (a Vercel puxa o código daqui)

---

## 1️⃣ Criar o banco de dados no Supabase

1. Entre em https://supabase.com e clique em **New project**.
2. Dê um nome (ex: `bolao-copa`), crie uma senha de banco (guarde-a) e escolha a
   região mais perto (ex: *South America (São Paulo)*). Clique em **Create**.
3. Espere ~2 min até o projeto ficar pronto.
4. No menu lateral, abra **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` deste projeto. **Antes de colar**, ache a
   linha com `'seu-email@gmail.com'` (perto da tabela `admins`) e troque pelo
   **seu email do Google** — o mesmo que você vai usar para entrar. Assim você já
   nasce aprovado e com poderes de admin.
6. Copie **tudo**, cole no editor e clique em **Run**. Deve aparecer "Success".
   ✔️ Isso cria todas as tabelas, o ranking, a importação de jogos, o controle de
   membros e as regras de segurança — tudo de uma vez.

> Não achou a linha do email ou esqueceu de trocar? Sem problema: o site também
> te reconhece como admin pela variável `NEXT_PUBLIC_ADMIN_EMAILS` (passo 5) e te
> aprova sozinho no primeiro acesso.

> **Já tinha logado antes (nos testes) e ficou como "pendente"?** Rode o arquivo
> `supabase/aprovar-admin.sql` (troque o email nele primeiro). Ele só te aprova,
> sem apagar nenhum dado. Ou simplesmente entre no site com seu email de admin —
> a aprovação automática resolve.

---

## 2️⃣ Ativar o login com Google

### a) Criar as credenciais no Google
1. Acesse https://console.cloud.google.com → crie um projeto (qualquer nome).
2. Menu → **APIs e serviços** → **Tela de consentimento OAuth**.
   - Tipo: **Externo** → Criar.
   - Preencha nome do app e seu email. Salve e avance até concluir.
   - Em "Usuários de teste" não precisa adicionar ninguém se você publicar o app,
     mas para começar pode adicionar os emails da galera.
3. Menu → **Credenciais** → **Criar credenciais** → **ID do cliente OAuth**.
   - Tipo: **Aplicativo da Web**.
   - Em **URIs de redirecionamento autorizados**, adicione esta URL (troque pelo
     seu projeto Supabase):
     ```
     https://SEU-PROJETO.supabase.co/auth/v1/callback
     ```
     (o endereço exato aparece no próximo passo, no Supabase.)
   - Clique em **Criar**. Guarde o **Client ID** e o **Client Secret**.

### b) Ligar no Supabase
1. No Supabase: **Authentication** → **Providers** → **Google**.
2. Cole o **Client ID** e o **Client Secret**, ative e **Save**.
3. Logo acima aparece a "Callback URL (for OAuth)". Confira que é a mesma que você
   colou no Google. Se for diferente, ajuste lá no Google.

---

## 3️⃣ Pegar as chaves do Supabase

No Supabase: **Project Settings** (engrenagem) → **API**. Anote três coisas:

| Onde | O que copiar |
|------|--------------|
| Project URL | `https://SEU-PROJETO.supabase.co` |
| Project API keys → `anon` `public` | chave longa pública |
| Project API keys → `service_role` `secret` | chave longa secreta ⚠️ |

⚠️ A `service_role` é uma chave de **administrador total**. Nunca a poste em lugar
público nem mande por mensagem. Ela só vai no painel da Vercel (passo 5).

---

## 4️⃣ Subir o código no GitHub

1. Crie um repositório novo (privado) em https://github.com/new (ex: `bolao-copa`).
2. Suba os arquivos deste projeto. Se você não usa terminal, dá pra arrastar os
   arquivos na opção **"uploading an existing file"** do GitHub. Suba a pasta
   inteira **menos** `node_modules` e `.env.local` (esses não vão).

> Dica: o arquivo `.gitignore` já impede o envio do `.env.local` por segurança.

---

## 5️⃣ Publicar na Vercel

1. Entre em https://vercel.com → **Add New** → **Project**.
2. Importe o repositório do GitHub que você acabou de criar.
3. Antes de clicar em Deploy, abra **Environment Variables** e adicione estas quatro
   (uma por uma):

   | Nome | Valor |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | a Project URL do passo 3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave `anon public` |
   | `SUPABASE_SERVICE_ROLE_KEY` | a chave `service_role secret` |
   | `NEXT_PUBLIC_ADMIN_EMAILS` | **seu** email do Google (você será o admin) |
   | `FOOTBALL_DATA_TOKEN` | token grátis da Football-Data (resultados automáticos) |

   > Pode pôr mais de um admin separando por vírgula:
   > `voce@gmail.com,outro@gmail.com`
   >
   > O `FOOTBALL_DATA_TOKEN` é opcional: sem ele, você lança os placares na mão
   > pelo painel. Para tê-lo, crie conta grátis em
   > https://www.football-data.org/client/register e copie seu token.

4. Clique em **Deploy** e espere ~1 min. A Vercel te dá um endereço tipo
   `https://bolao-copa.vercel.app`. Esse é o link do seu site! 🎉

### Último ajuste (importante)
Depois do deploy, volte no **Supabase → Authentication → URL Configuration** e em
**Site URL** coloque o endereço da Vercel (`https://bolao-copa.vercel.app`).
Em **Redirect URLs** adicione `https://bolao-copa.vercel.app/**`.
Isso garante que o login do Google volte para o seu site certo.

---

## 🎮 Como usar

- **Você (admin):** entre no site, vá na aba **Admin**. Lá você tem:
  - **Importação automática:** já vem com a fonte gratuita da Copa 2026 (projeto
    openfootball). Clique em **"Importar jogos da Copa"** e o sistema cria os times
    e todos os jogos com data e horário, sem digitar nada. Jogos repetidos não
    duplicam e os palpites são preservados. Depois do sorteio oficial, clique de
    novo para trazer os confrontos reais.
  - **Membros:** quando alguém entra com o Google, aparece aqui como *aguardando
    aprovação*. Clique em **Aprovar** para liberar (ou **Bloquear** quem você não
    conhece). Só aprovados conseguem palpitar — então mesmo que o link vaze, ninguém
    de fora entra no bolão. Você já entra aprovado automaticamente.
  - **Jogos & placares:** os resultados chegam **sozinhos** da API (se você
    configurou o `FOOTBALL_DATA_TOKEN`), com o ranking se atualizando sem você fazer
    nada. Se preferir, ou se algum jogo não vier, dá para lançar o placar na mão aqui.
- **A galera:** manda o link pra todo mundo. Cada um entra com o Google e aguarda
  você aprovar. Depois, vai em **Jogos**, define o placar de cada partida e salva
  (pode editar até o jogo começar — depois trava). Acompanham tudo em **Ranking**,
  em **Meus Palpites**, e na aba **Galera** (transparência): clicam num nome e veem
  os palpites da pessoa, com a data/hora de cada um. Palpites de jogos que ainda não
  começaram ficam ocultos (🔒) até o apito, para ninguém copiar.

---

## ❓ Dúvidas comuns

- **"Esqueci de cadastrar um time / errei a data."** Tudo é editável no painel Admin
  enquanto o jogo não começou. Dá pra apagar e refazer.
- **"O bandeirão não aparece."** Use o emoji da bandeira no campo "bandeira"
  (ex: 🇧🇷 🇦🇷 🇫🇷). No celular dá pra pegar no teclado de emojis.
- **"Não consigo entrar como admin."** Confirme que o email em `NEXT_PUBLIC_ADMIN_EMAILS`
  é exatamente o mesmo do Google com que você logou (sem espaços).
- **"Mudei uma variável na Vercel."** Depois de alterar variáveis, clique em
  **Redeploy** no painel da Vercel para valer.

Bom bolão! ⚽🏆
