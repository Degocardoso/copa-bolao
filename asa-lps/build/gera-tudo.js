const {chromium}=require("playwright");
const fs=require("fs"),path=require("path");
const dir=process.cwd(), erros=[], must=(c,m)=>{ if(!c) erros.push(m); };
const GUIA="https://guidemeatendimento.crmeducacional.com/LP/fecap/Gest%C3%A3o%20de%20Est%C3%A1gio";
const PDF_NOVO="Trilha-de-Formacao-Formandos-2026.2-1-1.pdf";

(async()=>{
const b=await chromium.launch();
const gerados={};

for(const ed of ["lps-editor.html","estagio-editor.html"]){
  const ctx=await b.newContext({viewport:{width:1400,height:950}});
  const pg=await ctx.newPage();
  const ce=[]; pg.on("pageerror",e=>ce.push("pageerror: "+e.message));
  pg.on("console",m=>{ if(m.type()==="error") ce.push("console: "+m.text()); });
  await pg.goto("file://"+path.join(dir,ed));
  await pg.evaluate(()=>{ try{localStorage.clear();}catch(e){} });
  await pg.reload(); await pg.waitForTimeout(600);
  console.log(`\n### ${ed}  —  "${await pg.title()}"`);

  // campos de cabecalho de secao corrigidos
  const campos=await pg.evaluate(()=>[...document.querySelectorAll('[data-path$=".head.title"]')].length);
  const objs  =await pg.evaluate(()=>[...document.querySelectorAll('[data-path$=".head"]')].map(e=>e.dataset.path));
  must(campos>0,`${ed}: sem campos head.title`);
  must(objs.length===0,`${ed}: ainda ha campo ligado ao objeto head: ${JSON.stringify(objs)}`);
  console.log(`  campos head.title: ${campos} | ligados ao objeto head: ${objs.length}`);

  await pg.click("#copy-crm"); await pg.waitForTimeout(400);
  const abas=await pg.evaluate(()=>[...document.querySelectorAll("#copy-tabs .ctab")].map(t=>t.dataset.cp));
  console.log("  perfis:",JSON.stringify(abas));
  for(const pid of abas){
    await pg.click(`#copy-tabs .ctab[data-cp="${pid}"]`); await pg.waitForTimeout(350);
    const code=await pg.inputValue("#copy-code");
    must(code.indexOf("Erro ao gerar")<0,`${pid}: modal retornou erro`);
    must(code.trim().indexOf("<!-- ====")===0,`${pid}: nao comeca pelo comentario do bloco`);
    must(code.indexOf('srcdoc="')>0,`${pid}: nao e iframe com srcdoc`);
    must(code.indexOf("__ASA_MODEL__")<0,`${pid}: marcador do template vazou para a saida`);
    must(code.indexOf("Requisitos_para_formao")<0,`${pid}: sobrou o PDF antigo`);
    must(code.indexOf("app.notion.com")<0,`${pid}: sobrou link do notion`);
    gerados[pid]=code;
    fs.writeFileSync(path.join("saida",pid+"-crm.txt"),code);
    console.log(`   ${pid.padEnd(23)} ${String(code.length).padStart(7)} chars -> saida/${pid}-crm.txt`);
  }
  must(ce.length===0,`${ed}: erros de console ${JSON.stringify(ce.slice(0,3))}`);
  await ctx.close();
}

/* ---- conferencias de conteudo ---- */
console.log("\n### conferencias de conteudo");
const chk=(pid,cond,msg)=>{ must(cond,`${pid}: ${msg}`); console.log(`  ${cond?"ok ":"XX "} ${pid.padEnd(23)} ${msg}`); };
["ingressantes","veteranos","contabeis-graduados","transferencia-externa"].forEach(p=>{
  const c=gerados[p];
  chk(p,(c.split(PDF_NOVO).length-1)===1,"1x PDF Trilha de Formação");
  chk(p,(c.split(GUIA.replace(/&/g,"&amp;")).length-1)===1||c.indexOf("Gest%C3%A3o%20de%20Est%C3%A1gio")>0,"botão do Guia de Estágio");
  chk(p,c.indexOf("Acessar a Workalove")<0,"conteúdo antigo de estágio removido");
  chk(p,c.indexOf("Agente Integrador")<0,"blocos de agente integrador removidos");
});
["ingressantes","veteranos"].forEach(p=>{
  const c=gerados[p];
  chk(p,c.indexOf("Provas Oficiais")>0,"Provas Oficiais no calendário");
  chk(p,c.indexOf("Vista de Provas")>0,"Vista de Provas");
  chk(p,c.indexOf("Exames Finais")>0||c.indexOf("Exames")>0,"Exames");
  chk(p,c.indexOf("2026-11-26")>0&&c.indexOf("2026-12-16")>0,"datas 26/11 e 16/12 no modelo");
});
chk("estagio",gerados.estagio.indexOf("Guia de Estágio")>0,"título \"Guia de Estágio\"");
chk("estagio",gerados.estagio.indexOf("Documentação de Estágio")<0,"título antigo removido");

await b.close();
if(erros.length){ console.log("\n*** ERROS ***"); erros.forEach(e=>console.log(" -",e)); process.exit(1); }
console.log("\nOK: 5 códigos gerados e conferidos.");
})().catch(e=>{console.error("FALHOU:",e);process.exit(1);});
