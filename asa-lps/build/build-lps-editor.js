const fs=require("fs");
let h=fs.readFileSync("editor-base.html","utf8");
const modelo=fs.readFileSync("modelo-base.json","utf8");
const must=(c,m)=>{ if(!c) throw new Error("FALHOU: "+m); };
const troca1=(hay,de,para,nome)=>{const n=hay.split(de).length-1;must(n===1,`${nome}: ${n} ocorrencias`);return hay.split(de).join(para);};

/* 1 — head proprio com <title> no lugar do esqueleto injetado pelo artifact */
const esq=h.slice(0,h.indexOf("<body>")+6);
must(esq.indexOf("<!doctype html>")===0&&esq.length<600,"esqueleto injetado");
h=['<!doctype html>','<html lang="pt-BR">','<head>','<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>ASA · Gerador — Guias de Ingressantes e Veteranos</title>',
'<style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}</style>',
'</head>','<body>'].join("\n")+h.slice(esq.length);

h=troca1(h,'<div class="bar__brand">ASA · Gerador</div>',
           '<div class="bar__brand">ASA · Gerador — Guias</div>',"barra");

/* 2 — CORRECAO: o campo do cabecalho da secao estava ligado ao OBJETO head
       (mostrava "[object Object]" e, se digitado, apagava eyebrow/title/lead).
       A correcao do perfilId do CSV NAO entra aqui: neste editor a ordem das
       palavras-chave importa ("Ingressantes em turmas veteranas"). */
h=troca1(h,'    ${fInput("Título da seção (head)", `${base}.head`, s.head)}',
[' 	   ${fInput("Sobretítulo (eyebrow)", `${base}.head.eyebrow`, (s.head||{}).eyebrow)}'.replace(" \t  ","   "),
 '    ${fInput("Título da seção", `${base}.head.title`, (s.head||{}).title)}',
 '    ${fArea("Descrição da seção", `${base}.head.lead`, (s.head||{}).lead, {rows:3, hint:"aceita HTML"})}'
].join("\n"),"correcao dos campos de cabecalho");

/* 3 — o #lp-template trazia uma COPIA VELHA do config inteiro embutida.
       Ela e substituida na geracao, mas deixa dado obsoleto dentro do arquivo
       (e confunde quem for procurar um link). Troca pelo marcador. */
const t0='<textarea id="lp-template" hidden>';
const b0=h.indexOf(t0)+t0.length, b1=h.indexOf("</textarea>",b0);
must(b0>t0.length&&b1>b0,"#lp-template");
let tpl=h.slice(b0,b1);
const ki=tpl.indexOf('id="asa-config"'); must(ki>=0,"asa-config dentro do template");
const abreFim=tpl.indexOf("&gt;",ki)+4;
const fechaIni=tpl.indexOf("&lt;/script&gt;",abreFim);
must(fechaIni>abreFim,"fecha asa-config dentro do template");
const antes=tpl.length;
tpl=tpl.slice(0,abreFim)+"\n__ASA_MODEL__\n"+tpl.slice(fechaIni);
h=h.slice(0,b0)+tpl+h.slice(b1);
console.log("  template: config embutido trocado por __ASA_MODEL__ ("+antes+" -> "+tpl.length+" chars)");

/* 4 — semeia o modelo editado */
const ini='<script type="application/json" id="asa-initial">';
const a=h.indexOf(ini)+ini.length, b=h.indexOf("</script>",a);
must(a>ini.length&&b>a,"#asa-initial");
h=h.slice(0,a)+"\n"+modelo.replace(/<\//g,"<\\/")+"\n"+h.slice(b);

/* 5 — conferencias */
must(h.indexOf("Requisitos_para_formao.pdf")<0,"sobrou o PDF antigo");
must(h.indexOf("app.notion.com")<0,"sobrou link do notion");
must((h.split("Trilha-de-Formacao-Formandos").length-1)===4,"4x Trilha de Formacao");
must((h.split("LP/fecap/Gest%C3%A3o%20de%20Est%C3%A1gio").length-1)===4,"4x botao do Guia");
must(h.indexOf("frame-runtime")<0,"preambulo do artifact");
fs.writeFileSync("lps-editor.html",h);
console.log("lps-editor.html:",h.length,"chars  ok");
