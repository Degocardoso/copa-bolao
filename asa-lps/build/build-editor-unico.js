const fs=require("fs");
let h=fs.readFileSync("editor-base.html","utf8");
const must=(c,m)=>{ if(!c) throw new Error("FALHOU: "+m); };
const troca1=(hay,de,para,nome)=>{const n=hay.split(de).length-1;must(n===1,`${nome}: ${n} ocorrencias`);return hay.split(de).join(para);};

/* modelo unico: as 4 LPs dos guias + o Guia de Estagio */
const g=JSON.parse(fs.readFileSync("modelo-base.json","utf8"));
const e=JSON.parse(fs.readFileSync("modelo-estagio.json","utf8"));
must(JSON.stringify(g.integrations)===JSON.stringify(e.integrations),"integrations divergem");
must(JSON.stringify(g.courses)===JSON.stringify(e.courses),"courses divergem");
must(!("estagio" in g.profiles),"colisao de id");
g.profiles.estagio=e.profiles.estagio;
const modelo=JSON.stringify(g,null,2);
console.log("modelo unico:",Object.keys(g.profiles).join(", "));

/* 1 — head proprio com <title> */
const esq=h.slice(0,h.indexOf("<body>")+6);
must(esq.indexOf("<!doctype html>")===0&&esq.length<600,"esqueleto injetado");
h=['<!doctype html>','<html lang="pt-BR">','<head>','<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>ASA · Gerador — todas as LPs</title>',
'<style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}</style>',
'</head>','<body>'].join("\n")+h.slice(esq.length);
h=troca1(h,'<div class="bar__brand">ASA · Gerador</div>','<div class="bar__brand">ASA · Gerador — todas as LPs</div>',"barra");

/* 2 — campo do cabecalho de secao estava ligado ao OBJETO head */
h=troca1(h,'    ${fInput("Título da seção (head)", `${base}.head`, s.head)}',
['    ${fInput("Sobretítulo (eyebrow)", `${base}.head.eyebrow`, (s.head||{}).eyebrow)}',
 '    ${fInput("Título da seção", `${base}.head.title`, (s.head||{}).title)}',
 '    ${fArea("Descrição da seção", `${base}.head.lead`, (s.head||{}).lead, {rows:3, hint:"aceita HTML"})}'
].join("\n"),"campos do cabecalho");

/* 3 — perfilId do CSV: mantem a ORDEM original (ela importa) e acrescenta estagio no fim */
h=troca1(h,'    if(n.includes("ingressant")||n.includes("calouro")) return "ingressantes";\n    return null;',
           '    if(n.includes("ingressant")||n.includes("calouro")) return "ingressantes";\n'+
           '    if(n.includes("estagio")) return "estagio";\n    return null;',"perfilId + estagio");
h=troca1(h,'const ALLP=["ingressantes","veteranos","contabeis-graduados","transferencia-externa"];',
           'const ALLP=["ingressantes","veteranos","contabeis-graduados","transferencia-externa","estagio"];',"ALLP");

/* 4 — #lp-template trazia uma copia velha do config inteiro embutida */
const t0='<textarea id="lp-template" hidden>';
const b0=h.indexOf(t0)+t0.length, b1=h.indexOf("</textarea>",b0);
must(b0>t0.length&&b1>b0,"#lp-template");
let tplG=h.slice(b0,b1);
const ki=tplG.indexOf('id="asa-config"'); must(ki>=0,"asa-config no template dos guias");
const ae=tplG.indexOf("&gt;",ki)+4, fi=tplG.indexOf("&lt;/script&gt;",ae);
must(fi>ae,"fecha asa-config");
tplG=tplG.slice(0,ae)+"\n__ASA_MODEL__\n"+tplG.slice(fi);
h=h.slice(0,b0)+tplG+h.slice(b1);

/* 5 — acrescenta o SEGUNDO template (o do Guia de Estagio) */
const enc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const dec=s=>s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
const tplE=fs.readFileSync("lp-template.html","utf8");
must(dec(enc(tplE))===tplE,"escape do template de estagio nao fecha no ida-e-volta");
must(tplE.indexOf("__ASA_MODEL__")>=0,"template de estagio sem marcador");
must(tplE.indexOf("estagio-ajustes")>=0,"template de estagio sem o bloco de ajustes");
const fimTplG=h.indexOf("</textarea>",h.indexOf(t0))+"</textarea>".length;
h=h.slice(0,fimTplG)+'\n<textarea id="lp-template-estagio" hidden>'+enc(tplE)+'</textarea>'+h.slice(fimTplG);

/* 6 — genIndex passa a escolher o template do perfil que esta sendo gerado */
h=troca1(h,'function genIndex(mdl){\n  mdl = mdl || model;\n  const tpl = $("#lp-template").value;',
[ '/* Cada LP tem o seu template: o Guia de Estágio usa um com ajustes próprios',
  '   (hero roxo, calendário e busca de RA escondidos). Ao gerar UM perfil — que é o',
  '   que "Copiar p/ CRM" e o .zip fazem — pega o template daquele perfil. */',
  'const TPL_POR_PERFIL = { estagio: "#lp-template-estagio" };',
  'function tplPara(mdl){',
  '  const ids = Object.keys((mdl && mdl.profiles) || {});',
  '  const sel = ids.length === 1 ? TPL_POR_PERFIL[ids[0]] : null;',
  '  const el = sel && document.querySelector(sel);',
  '  return (el || document.querySelector("#lp-template")).value;',
  '}',
  'function genIndex(mdl){',
  '  mdl = mdl || model;',
  '  const tpl = tplPara(mdl);'].join("\n"),"genIndex escolhe o template");

/* 7 — semeia o modelo unico */
const ini='<script type="application/json" id="asa-initial">';
const a=h.indexOf(ini)+ini.length, b=h.indexOf("</script>",a);
must(a>ini.length&&b>a,"#asa-initial");
h=h.slice(0,a)+"\n"+modelo.replace(/<\//g,"<\\/")+"\n"+h.slice(b);

/* 8 — conferencias */
must((h.split('<textarea id="lp-template').length-1)===2,"deveria haver 2 templates");
must(h.indexOf("Requisitos_para_formao.pdf")<0,"sobrou o PDF antigo");
must(h.indexOf("app.notion.com")<0,"sobrou link do notion");
must(h.indexOf("Documentação de Estágio")<0,"sobrou o titulo antigo do estagio");
must(h.indexOf("frame-runtime")<0,"preambulo do artifact");
fs.writeFileSync("asa-editor.html",h);
fs.writeFileSync("modelo-todas.json",modelo);
console.log("asa-editor.html:",h.length,"chars  ok");

/* 9 — o rotulo do botao do .zip era fixo em "4" */
{ const p="asa-editor.html"; let s=fs.readFileSync(p,"utf8");
  const n=s.split("⬇ 4 HTMLs p/ CRM (.zip)").length-1;
  if(n===1){ s=s.split("⬇ 4 HTMLs p/ CRM (.zip)").join("⬇ HTMLs p/ CRM (.zip)");
             fs.writeFileSync(p,s); console.log("rotulo do .zip: \"4 HTMLs\" -> \"HTMLs\""); }
  else throw new Error("rotulo do .zip: "+n+" ocorrencias"); }
