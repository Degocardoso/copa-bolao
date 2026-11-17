# ASA · Landing pages (FECAP)

As 5 landing pages da Área do Sucesso Alvarista, embutidas no CRM via `<iframe srcdoc>`.

> Estes arquivos **não têm relação com o app `copa-bolao`**. Eles moram aqui porque o
> container das sessões é efêmero e o projeto já se perdeu 4 vezes — versionar evita
> ter que reenviar tudo a cada sessão nova.

## As 5 LPs e onde se edita cada uma

| LP | Perfil | Editor |
|---|---|---|
| Guia de Estágio | `estagio` | `estagio/estagio-editor.html` |
| Ingressantes | `ingressantes` | `guias/guias-editor.html` |
| Veteranos | `veteranos` | `guias/guias-editor.html` |
| CC para Graduados (Híbrido) | `contabeis-graduados` | `guias/guias-editor.html` |
| Ingressantes em turmas veteranas | `transferencia-externa` | `guias/guias-editor.html` |

São **dois** editores porque as LPs usam templates diferentes: o do Guia de Estágio tem o
bloco `#estagio-ajustes` (hero roxo, calendário e busca de RA escondidos).

## Pastas

| Pasta | O que é |
|---|---|
| `codigo-crm/` | O bloco gerado para colar no CRM, um por LP. Estado atual publicado. |
| `estagio/` | Modelo, template e editor do Guia de Estágio. |
| `guias/` | Modelo e editor das outras 4 LPs. |
| `build/` | Scripts de extração, build e teste. |

Os `modelo-*.json` são a **fonte da verdade do conteúdo**. Os editores são montados a partir
deles; o template guarda só CSS, fontes e JS, com `__ASA_MODEL__` no lugar do config.

## Fluxo normal

1. Abrir o editor da LP no navegador.
2. Editar pela interface.
3. **Copiar p/ CRM** → colar no CRM.
4. Salvar o resultado em `codigo-crm/` e commitar.

## Rebuild

```bash
node build/build-lps-editor.js   # guias/guias-editor.html   (precisa de editor-base.html)
node build/build-editor.js       # estagio/estagio-editor.html
node build/gera-tudo.js          # dirige os editores e gera os 5 codigo-crm/
node build/testa-todas.js        # renderiza as 5 num CRM falso (1280px e 390px)
```

`editor-base.html` é a casca do editor, do artefato
`claude.ai/code/artifact/59a88f5e-13dc-448e-85ac-6813eed1b3b1`.

Para reconstruir a partir de um código do CRM colado (`crm-colado.txt`):
`build/extrai-atual.js` → template + modelo. `build/confere-diff.js` prova que só mudou
o que era para mudar.

## Correções do editor que precisam sobreviver a todo rebuild

Os scripts de build reaplicam, com asserção de ocorrência exata:

1. **Campos do cabeçalho da seção** (nos **dois** editores) — o campo estava ligado ao
   **objeto** `head`: mostrava `[object Object]` e, se digitado, apagava
   `eyebrow`/`title`/`lead` de uma vez. Agora são três campos separados.
2. **`perfilId` do import de CSV** — **só no editor de Estágio**. Lá a lista fixa de 4
   perfis de público fazia com que nenhum CSV fosse aceito (a LP só tem o perfil `estagio`),
   então os ids/rótulos passaram a vir do modelo.
   **Não aplicar no editor dos Guias**: lá a ordem das palavras-chave importa —
   "Ingressantes em turmas veteranas" precisa cair em `transferencia-externa`,
   e um casamento genérico por substring devolveria `ingressantes`.

## Armadilhas já pagas

- **`overflow-x:clip` no bloco full-bleed**: o que estoura é **cortado**, não rola.
  Era a causa real de "eventos saindo do calendário".
- O `#lp-template` do editor-base vinha com uma **cópia velha do config inteiro** embutida
  (~248 KB). A geração a substitui, mas ela confunde quem for procurar um link no arquivo.
  O build troca pelo marcador.
- O template vai dentro de um `<textarea>`: escape `&` → `<` → `>`, nessa ordem.
  O build testa o ida-e-volta antes de gravar.
- Filhos de grid/flex têm `min-width:auto`: esticam a faixa em vez de cortar.
  `repeat(7,1fr)` + `overflow-x:auto` nunca rola — precisa de `minmax()`.
- Testar o código do CRM é testar `genEmbed(singleModel(pid))`, **não** `genIndex()` com
  todos os perfis — não existe mais tela de escolha de perfil.
- `ul.ico-list` é flex: sem ícone, o `<b>` vira coluna própria e o texto quebra.
- O calendário abre no **mês corrente**, limitado ao intervalo que tem eventos
  (`calStart`). Adicionar eventos de novembro/dezembro muda o mês de abertura.
- Nos testes, falhas de rede para `www.fecap.br` são do **sandbox**, não da página:
  imagens e vídeo da LP vêm de lá. Separe-as dos erros de console reais.

## Pendências conhecidas

- **CNPJ da FECAP com 13 dígitos** (`60.736.683/0001-7`) no Guia de Estágio, seção 2
  (`doc-tce`) — provavelmente truncado. Aguardando confirmação.
- **`www.fecap.br` é bloqueado na rede do ambiente Default**, então os PDFs e planilhas-modelo
  nunca puderam ser abertos para conferência. Existe o ambiente
  **`copa-bolao (LPs ASA/FECAP)`** com `www.fecap.br` e
  `guidemeatendimento.crmeducacional.com` liberados — selecione-o ao abrir a sessão
  para que os links possam ser validados antes de publicar.

O histórico de cada rodada fica nos `MUDANCAS-*.md`.
