# ASA · LP de Estágio Supervisionado (FECAP)

Projeto da landing page de **Documentação de Estágio** da Área do Sucesso Alvarista,
embutida no CRM via `<iframe srcdoc>`.

> Estes arquivos **não têm relação com o app `copa-bolao`**. Eles moram aqui apenas
> porque o container das sessões é efêmero e já se perdeu 4 vezes — versionar aqui
> evita ter que reenviar o arquivo a cada sessão nova.

## Arquivos

| Arquivo | O que é |
|---|---|
| `estagio-editor.html` | **O gerador/editor.** Abra no navegador, edite pela interface e use **“Copiar p/ CRM”**. É autossuficiente (fontes e conteúdo embutidos). |
| `estagio-crm.txt` | O bloco gerado para colar no CRM (estado atual publicado). |
| `modelo-estagio.json` | **Fonte da verdade do conteúdo**: perfil `estagio`, 7 seções, 20 conteúdos. |
| `lp-template.html` | O HTML da LP (CSS, fontes, JS) com `__ASA_MODEL__` no lugar do JSON. |
| `build/` | Scripts de extração, build e teste. |

## Fluxo normal (edição pela interface)

1. Abrir `estagio-editor.html` no navegador.
2. Editar.
3. **Copiar p/ CRM** → colar no CRM.
4. Guardar o resultado por cima de `estagio-crm.txt` e commitar.

## Fluxo de reconstrução (a partir de um código do CRM)

Rode dentro de uma pasta de trabalho, com o código do CRM salvo como `crm-colado.txt`:

```bash
node build/extrai-atual.js   # srcdoc -> lp-template.html + modelo-estagio.json
node build/build-editor.js   # monta estagio-editor.html (precisa de editor-base.html)
node build/gera-e-testa.js   # dirige o editor e gera estagio-crm.html
node build/testa-crm.js      # renderiza o embed num CRM falso (1280px e 390px)
node build/confere-diff.js   # prova que só mudou o que era pra mudar
```

`editor-base.html` é o editor das outras LPs (artefato
`claude.ai/code/artifact/59a88f5e-13dc-448e-85ac-6813eed1b3b1`), usado como casca.

## Duas correções que precisam sobreviver a todo rebuild

`build/build-editor.js` reaplica as duas, com asserção de 1 ocorrência exata:

1. **`perfilId` do import de CSV** — a versão original casava contra uma lista fixa
   de 4 perfis de público (`ingressantes`, `veteranos`, …). Como esta LP só tem o
   perfil `estagio`, **nenhum CSV era aceito**. Agora os ids/rótulos vêm do modelo.
2. **Campos do cabeçalho da seção** — o campo estava ligado ao **objeto** `head`
   (mostrava `[object Object]` e, se alguém digitasse, apagava `eyebrow`/`title`/`lead`).
   Agora são três campos separados.

## Armadilhas já pagas

- **`overflow-x:clip` no bloco full-bleed**: o conteúdo que estoura é **cortado**,
  não rola. Era a causa real de “eventos saindo do calendário”.
- O template vai dentro de um `<textarea>`: escape `&` → `<` → `>`, nessa ordem.
  `build-editor.js` testa o ida-e-volta antes de gravar.
- Filhos de grid/flex têm `min-width:auto`: esticam a faixa em vez de cortar.
  `repeat(7,1fr)` + `overflow-x:auto` nunca rola — precisa de `minmax()`.
- Testar o código do CRM é testar `genEmbed(singleModel("estagio"))`,
  **não** `genIndex()` com todos os perfis — não existe mais tela de escolha de perfil.
- `ul.ico-list` é flex: sem ícone, o `<b>` vira coluna própria e o texto quebra.

## Pendências conhecidas

- **CNPJ da FECAP com 13 dígitos** no manual (`60.736.683/0001-7`) — provavelmente
  truncado. Está assim na LP (seção 2, `doc-tce`) e precisa de confirmação.
- `www.fecap.br` e `edufecap.sharepoint.com` são **bloqueados pela política de rede**
  do ambiente: os modelos de documento nunca puderam ser abertos daqui, e as URLs
  não podem ser validadas pela sessão.
