const fs=require("fs");
let h=fs.readFileSync("editor-base.html","utf8");
const tpl=fs.readFileSync("lp-template.html","utf8");
const modelo=fs.readFileSync("modelo-estagio.json","utf8");
const must=(cond,msg)=>{ if(!cond) throw new Error("FALHOU: "+msg); };
const trocaUnica=(hay,de,para,nome)=>{
  const n=hay.split(de).length-1;
  must(n===1,nome+" -> esperava 1 ocorrencia, achei "+n);
  return hay.split(de).join(para);
};

/* 1 ── troca o esqueleto injetado pelo artifact por um head proprio com <title> */
const esqueleto=h.slice(0,h.indexOf("<body>")+"<body>".length);
must(esqueleto.indexOf("<!doctype html>")===0 && esqueleto.length<600,"esqueleto injetado no topo");
h=[
'<!doctype html>',
'<html lang="pt-BR">',
'<head>',
'<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>ASA · Gerador — Estágio Supervisionado</title>',
'<style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}</style>',
'</head>',
'<body>'
].join("\n")+h.slice(esqueleto.length);

/* 2 ── identifica a barra */
h=trocaUnica(h,'<div class="bar__brand">ASA · Gerador</div>',
               '<div class="bar__brand">ASA · Gerador — Estágio</div>',"barra");
h=trocaUnica(h,'Edite os perfis pela interface e gere o HTML único para o CRM.',
               'Edite o conteúdo pela interface e use “Copiar p/ CRM” para pegar o código do iframe.',"status");

/* 3 ── CORRECAO 1: perfilId do CSV era uma lista fixa de 4 perfis de publico,
        então nenhum CSV era aceito neste editor (só existe o perfil "estagio").
        Agora os ids/labels saem do proprio modelo. */
const perfilAntigo=[
'  const ALLP=["ingressantes","veteranos","contabeis-graduados","transferencia-externa"];',
'  const perfilId=v=>{',
'    const n=norm(v).replace(/[^a-z0-9]+/g," ").trim();',
'    if(!n) return null;',
'    if(/^(todos|todas|all|geral|todos os perfis|todos perfis)$/.test(n)) return "*";',
'    if(n.includes("ccgh")||(n.includes("contab")&&n.includes("graduad"))) return "contabeis-graduados";',
'    if(n.includes("transferencia")||n.includes("externa")||n.includes("turmas veteranas")) return "transferencia-externa";',
'    if(n.includes("veteran")) return "veteranos";',
'    if(n.includes("ingressant")||n.includes("calouro")) return "ingressantes";',
'    return null;',
'  };'].join("\n");
const perfilNovo=[
'  // Os perfis vem do MODELO, não de uma lista fixa: casa por id ou por rótulo.',
'  const ALLP=Object.keys(model.profiles);',
'  const chave=s=>norm(s).replace(/[^a-z0-9]+/g," ").trim();',
'  const perfilId=v=>{',
'    const n=chave(v);',
'    if(!n) return null;',
'    if(/^(todos|todas|all|geral|todos os perfis|todos perfis)$/.test(n)) return "*";',
'    for(const id of ALLP){',
'      const idn=chave(id), rot=chave((model.profiles[id]||{}).label||"");',
'      if(idn&&(n===idn||n.includes(idn))) return id;',
'      if(rot&&(n===rot||n.includes(rot)||rot.includes(n))) return id;',
'    }',
'    return null;',
'  };'].join("\n");
h=trocaUnica(h,perfilAntigo,perfilNovo,"correcao 1 (perfilId do CSV)");

/* 4 ── CORRECAO 2: o campo do cabecalho da secao estava ligado ao OBJETO head
        (aparecia "[object Object]" e, se digitado, apagava eyebrow/title/lead). */
const headAntigo='    ${fInput("Título da seção (head)", `${base}.head`, s.head)}';
const headNovo=[
'    ${fInput("Sobretítulo (eyebrow)", `${base}.head.eyebrow`, (s.head||{}).eyebrow)}',
'    ${fInput("Título da seção", `${base}.head.title`, (s.head||{}).title)}',
'    ${fArea("Descrição da seção", `${base}.head.lead`, (s.head||{}).lead, {rows:3, hint:"aceita HTML"})}'
].join("\n");
h=trocaUnica(h,headAntigo,headNovo,"correcao 2 (campos do cabecalho da secao)");

/* 5 ── semeia o modelo em #asa-initial */
const ini='<script type="application/json" id="asa-initial">';
const a=h.indexOf(ini); must(a>=0,"#asa-initial");
const aEnd=a+ini.length;
const aClose=h.indexOf("</script>",aEnd); must(aClose>aEnd,"fecha #asa-initial");
h=h.slice(0,aEnd)+"\n"+modelo.replace(/<\//g,"<\\/")+"\n"+h.slice(aClose);

/* 6 ── injeta o template atual da LP em #lp-template */
const enc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const dec=s=>s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
must(dec(enc(tpl))===tpl,"o escape do template não fecha no ida-e-volta");
const t0='<textarea id="lp-template" hidden>';
const b=h.indexOf(t0); must(b>=0,"#lp-template");
const bEnd=b+t0.length;
const bClose=h.indexOf("</textarea>",bEnd); must(bClose>bEnd,"fecha #lp-template");
h=h.slice(0,bEnd)+enc(tpl)+h.slice(bClose);

/* 7 ── conferencias finais */
must(h.indexOf("<title>ASA · Gerador — Estágio Supervisionado</title>")>=0,"title");
must(h.indexOf("edufecap.sharepoint.com")<0,"nao deve sobrar link do sharepoint");
must((h.split("Relatorio_Semestral_Atividades_MODELO-1.xlsx").length-1)>=3,"3x modelo semestral");
must((h.split("Relatorio_de_Estagio_Supervisionado_MODELO_VF.xlsx").length-1)>=3,"3x modelo supervisionado");
must(h.indexOf("__ASA_MODEL__")>=0,"marcador do config no template");
must(h.indexOf("estagio-ajustes")>=0,"bloco de ajustes visuais (hero roxo)");
must(h.indexOf("frame-runtime")<0,"preambulo do artifact removido");
fs.writeFileSync("estagio-editor.html",h);
console.log("estagio-editor.html:",h.length,"chars  ok");
