const {chromium}=require("playwright");
const fs=require("fs"),path=require("path");
const dir=process.cwd();
const erros=[]; const must=(c,m)=>{ if(!c) erros.push(m); };
const NOVO_SEM="https://www.fecap.br/wp-content/uploads/2026/10/Relatorio_Semestral_Atividades_MODELO-1.xlsx";
const NOVO_SUP="https://www.fecap.br/wp-content/uploads/2026/10/Relatorio_de_Estagio_Supervisionado_MODELO_VF.xlsx";

/* página-hospedeira falsa, imitando o CRM: cabeçalho + conteúdo estreito */
const embed=fs.readFileSync("estagio-crm.html","utf8");
fs.writeFileSync("host-crm.html",`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>CRM (simulado)</title>
<style>body{margin:0;font:15px system-ui;background:#fff;color:#222}
.topo{background:#1b2a3a;color:#fff;padding:14px 20px;font-weight:700}
.wrap{max-width:760px;margin:0 auto;padding:18px}</style></head><body>
<div class="topo">CRM — página do aluno (simulação)</div>
<div class="wrap"><p>Texto do CRM antes do bloco.</p>
${embed}
<p>Texto do CRM depois do bloco.</p></div></body></html>`);

(async()=>{
const b=await chromium.launch();
for(const [larg,alt,rot] of [[1280,900,"desktop"],[390,844,"celular"]]){
  const ctx=await b.newContext({viewport:{width:larg,height:alt},deviceScaleFactor:2});
  const pg=await ctx.newPage();
  const errs=[];
  pg.on("pageerror",e=>errs.push("pageerror: "+e.message));
  pg.on("console",m=>{ if(m.type()==="error") errs.push("console: "+m.text()); });
  await pg.goto("file://"+path.join(dir,"host-crm.html"));
  await pg.waitForTimeout(1600);

  /* a página-hospedeira nao pode ganhar rolagem horizontal */
  const hz=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  must(hz.sw<=hz.cw+1,`[${rot}] rolagem horizontal no CRM: scrollWidth ${hz.sw} > clientWidth ${hz.cw}`);

  const fr=pg.frames().find(f=>f!==pg.mainFrame());
  must(!!fr,`[${rot}] iframe não encontrado`);
  if(fr){
    /* a fonte da marca realmente carregou? */
    const fonte=await fr.evaluate(()=>document.fonts?document.fonts.check('800 2rem "Season Sans"'):null);
    must(fonte===true,`[${rot}] Season Sans não carregou (document.fonts.check = ${fonte})`);

    /* conteúdo interno não pode estourar a largura */
    const hzi=await fr.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    must(hzi.sw<=hzi.cw+1,`[${rot}] conteúdo estoura o iframe: ${hzi.sw} > ${hzi.cw}`);

    /* libera todos os itens, em ordem, para poder inspecionar seções 2 e 3 */
    await fr.evaluate(async()=>{
      for(let volta=0; volta<40; volta++){
        const cx=[...document.querySelectorAll('.step-item:not(.is-locked) .step-check input:not(:checked)')];
        if(!cx.length) break;
        cx[0].closest(".step-check").querySelector(".box").click();
        await new Promise(r=>setTimeout(r,60));
      }
    });
    await fr.waitForTimeout(700);

    /* onde estão os links dos modelos de relatório */
    const links=await fr.evaluate(()=>{
      const out=[];
      document.querySelectorAll('.lp-section').forEach(sec=>{
        sec.querySelectorAll('a[href*=".xlsx"], a[href*="sharepoint"]').forEach(a=>{
          out.push({secao:sec.id, texto:(a.textContent||"").trim().slice(0,46), href:a.getAttribute("href")});
        });
      });
      return out;
    });
    if(rot==="desktop"){
      console.log("\nlinks de modelo de relatório renderizados:");
      links.forEach(l=>console.log("  ",l.secao.padEnd(18),"|",l.texto.padEnd(46),"|",l.href.slice(-52)));
    }
    must(links.every(l=>l.href.indexOf("sharepoint")<0),`[${rot}] ainda há link do sharepoint renderizado`);
    const em=id=>links.filter(l=>l.secao===id);
    must(em("sec-documentos").length===2,`[${rot}] seção 2 deveria ter 2 links de modelo, tem ${em("sec-documentos").length}`);
    must(em("sec-preencher").length===2,`[${rot}] seção 3 deveria ter 2 links de modelo, tem ${em("sec-preencher").length}`);
    must(em("sec-documentos").some(l=>l.href===NOVO_SEM),`[${rot}] seção 2 sem o .xlsx do Semestral`);
    must(em("sec-documentos").some(l=>l.href===NOVO_SUP),`[${rot}] seção 2 sem o .xlsx do Supervisionado`);
    must(em("sec-preencher").some(l=>l.href===NOVO_SEM),`[${rot}] seção 3 sem o .xlsx do Semestral`);
    must(em("sec-preencher").some(l=>l.href===NOVO_SUP),`[${rot}] seção 3 sem o .xlsx do Supervisionado`);

    /* o portão de perfil não pode aparecer (só existe 1 perfil) */
    const portao=await fr.evaluate(()=>{const g=document.getElementById("exp-gate");return g?!g.hidden:false;});
    must(portao===false,`[${rot}] o portão de escolha de perfil apareceu`);

    await fr.evaluate(()=>{document.querySelector("#sec-documentos")?.scrollIntoView();});
    await fr.waitForTimeout(500);
  }
  await pg.screenshot({path:`crm-${rot}.png`,fullPage:false});
  must(errs.length===0,`[${rot}] erros de console: `+JSON.stringify(errs.slice(0,4)));
  console.log(`[${rot}] host scrollWidth/clientWidth ${hz.sw}/${hz.cw} | erros de console: ${errs.length}`);
  await ctx.close();
}
await b.close();
if(erros.length){ console.log("\n*** ERROS ***"); erros.forEach(e=>console.log(" -",e)); process.exit(1); }
console.log("\nOK: embed renderiza certo no CRM em 1280px e 390px.");
})().catch(e=>{console.error("FALHOU:",e);process.exit(1);});
