const {chromium}=require("playwright");
const fs=require("fs"),path=require("path");
const dir=process.cwd();
const erros=[];
const must=(c,m)=>{ if(!c) erros.push(m); };

(async()=>{
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1400,height:950}});
const pg=await ctx.newPage();
const consoleErr=[];
pg.on("pageerror",e=>consoleErr.push("pageerror: "+e.message));
pg.on("console",m=>{ if(m.type()==="error") consoleErr.push("console: "+m.text()); });

await pg.goto("file://"+path.join(dir,"estagio-editor.html"));
await pg.evaluate(()=>{ try{localStorage.clear();}catch(e){} });
await pg.reload();
await pg.waitForTimeout(500);
console.log("TITULO:", await pg.title());

/* CORRECAO 2 — campos do cabeçalho da seção (data-path) */
const campos=await pg.evaluate(()=>{
  const r=[];
  document.querySelectorAll('[data-path$=".head.title"],[data-path$=".head.eyebrow"],[data-path$=".head.lead"]')
    .forEach(e=>r.push({p:e.dataset.path,v:(e.value||"").slice(0,60)}));
  return r;
});
const headObj=await pg.evaluate(()=>[...document.querySelectorAll('[data-path$=".head"]')].map(e=>e.dataset.path));
must(campos.length>=3,"campos head.eyebrow/title/lead nao renderizados (achei "+campos.length+")");
must(headObj.length===0,"ainda existe campo ligado ao OBJETO head: "+JSON.stringify(headObj));
const ruim=campos.filter(c=>String(c.v).indexOf("[object Object]")>=0);
must(ruim.length===0,"campo de cabeçalho mostra [object Object]: "+JSON.stringify(ruim));
console.log("campos de cabeçalho:",campos.length,"| ligados ao objeto head:",headObj.length,"| [object Object]:",ruim.length);
console.log("  ex.:",JSON.stringify(campos.slice(0,3)));

/* gera o código do CRM pelo caminho REAL (modal) */
await pg.click("#copy-crm");
await pg.waitForTimeout(400);
const abas=await pg.evaluate(()=>[...document.querySelectorAll("#copy-tabs .ctab")].map(t=>t.dataset.cp));
must(abas.length===1&&abas[0]==="estagio","modal deveria ter só o perfil estagio, veio "+JSON.stringify(abas));
const crm=await pg.inputValue("#copy-code");
must(crm.indexOf("Erro ao gerar")<0,"o modal retornou erro ao gerar");
must(crm.trim().indexOf("<!-- ====")===0,"o código deve começar pelo comentário do bloco");
must(crm.indexOf('srcdoc="')>0,"o código deve ser um iframe com srcdoc");
must(crm.trim().endsWith("</div>"),"o código deve terminar fechando a div full-bleed");
must(crm.indexOf("TESTE")<0,"vazou texto de teste no código");
fs.writeFileSync("estagio-crm.html",crm);
console.log("estagio-crm.html:",crm.length,"chars");

/* LP solta = srcdoc desescapado (mesmo caminho do navegador) */
const ini=crm.indexOf('srcdoc="')+'srcdoc="'.length, fim=crm.lastIndexOf('"></iframe>');
const idx=crm.slice(ini,fim).replace(/&quot;/g,'"').replace(/&amp;/g,"&");
fs.writeFileSync("estagio.html",idx);
console.log("estagio.html:",idx.length,"chars");

/* conferencia dos links no codigo final */
const nSem=crm.split("Relatorio_Semestral_Atividades_MODELO-1.xlsx").length-1;
const nSup=crm.split("Relatorio_de_Estagio_Supervisionado_MODELO_VF.xlsx").length-1;
const nSp =crm.split("edufecap.sharepoint.com").length-1;
must(nSp===0,"sobrou link do sharepoint: "+nSp);
must(nSem===3,"esperava 3x semestral .xlsx, achei "+nSem);
must(nSup===3,"esperava 3x supervisionado .xlsx, achei "+nSup);
console.log("links -> semestral:",nSem," supervisionado:",nSup," sharepoint:",nSp);
must(consoleErr.length===0,"erros de console no editor: "+JSON.stringify(consoleErr.slice(0,5)));
await b.close();

if(erros.length){ console.log("\n*** ERROS ***"); erros.forEach(e=>console.log(" -",e)); process.exit(1); }
console.log("\nOK: editor gerou o código do CRM sem erros.");
})().catch(e=>{ console.error("FALHOU:",e); process.exit(1); });
