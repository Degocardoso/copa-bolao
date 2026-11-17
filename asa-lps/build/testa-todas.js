const {chromium}=require("playwright");
const fs=require("fs"),path=require("path");
const dir=process.cwd(), erros=[], must=(c,m)=>{ if(!c) erros.push(m); };
const PERFIS=["ingressantes","veteranos","contabeis-graduados","transferencia-externa","estagio"];

(async()=>{
const b=await chromium.launch();
for(const pid of PERFIS){
  const embed=fs.readFileSync(path.join("saida",pid+"-crm.txt"),"utf8");
  const host=path.join(dir,`host-${pid}.html`);
  fs.writeFileSync(host,`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>CRM</title>
<style>body{margin:0;font:15px system-ui}.topo{background:#1b2a3a;color:#fff;padding:14px 20px;font-weight:700}
.wrap{max-width:760px;margin:0 auto;padding:18px}</style></head><body>
<div class="topo">CRM — simulação</div><div class="wrap"><p>antes</p>${embed}<p>depois</p></div></body></html>`);

  for(const [larg,alt,rot] of [[1280,900,"desktop"],[390,844,"celular"]]){
    const ctx=await b.newContext({viewport:{width:larg,height:alt},deviceScaleFactor:1});
    const pg=await ctx.newPage(); const ce=[];
    pg.on("pageerror",e=>ce.push("pageerror: "+e.message));
    const rede=[];
    pg.on("console",m=>{ if(m.type()!=="error") return;
      const t=m.text();
      // fecap.br esta bloqueado NESTE sandbox: imagem/video da propria LP nao carregam.
      // Isso nao acontece no navegador do aluno, entao nao conta como defeito.
      if(/ERR_TUNNEL_CONNECTION_FAILED|ERR_BLOCKED|Failed to load resource/.test(t)) rede.push(t); else ce.push("console: "+t); });
    await pg.goto("file://"+host); await pg.waitForTimeout(1500);

    const hz=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    must(hz.sw<=hz.cw+1,`[${pid}/${rot}] rolagem horizontal no CRM ${hz.sw}>${hz.cw}`);
    const fr=pg.frames().find(f=>f!==pg.mainFrame());
    must(!!fr,`[${pid}/${rot}] sem iframe`);
    if(fr){
      const fonte=await fr.evaluate(()=>document.fonts?document.fonts.check('800 2rem "Season Sans"'):null);
      must(fonte===true,`[${pid}/${rot}] Season Sans nao carregou`);
      const hzi=await fr.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
      must(hzi.sw<=hzi.cw+1,`[${pid}/${rot}] conteudo estoura o iframe ${hzi.sw}>${hzi.cw}`);
      const portao=await fr.evaluate(()=>{const g=document.getElementById("exp-gate");return g?!g.hidden:false;});
      must(portao===false,`[${pid}/${rot}] portao de perfil apareceu`);

      if(rot==="desktop"){
        // mes aberto no calendario + eventos de avaliacao visiveis
        if(pid==="ingressantes"||pid==="veteranos"){
          const le=()=>fr.evaluate(()=>{
            const t=document.getElementById("cal-title");
            const txt=document.getElementById("cal-body")?document.getElementById("cal-body").innerText:"";
            return {titulo:t?t.textContent.trim():null, temPO:/Provas Oficiais/.test(txt), temVista:/Vista de Provas/.test(txt), temEx:/Exames Finais/.test(txt)};
          });
          // Novembro: so as Provas Oficiais (26/11-04/12) alcancam o mes
          const nov=await le();
          console.log(`  [${pid}] abre em "${nov.titulo}" | POs:${nov.temPO} Vista:${nov.temVista} Exames:${nov.temEx}`);
          must(/Novembro/i.test(nov.titulo||""),`[${pid}] deveria abrir em Novembro, abriu em "${nov.titulo}"`);
          must(nov.temPO,`[${pid}] Provas Oficiais nao aparece em Novembro`);
          // Dezembro: Vista (05-10/12) e Exames (11-16/12), e as POs que entram ate 04/12
          await fr.click("#cal-next"); await fr.waitForTimeout(500);
          const dez=await le();
          console.log(`  [${pid}] vira para "${dez.titulo}" | POs:${dez.temPO} Vista:${dez.temVista} Exames:${dez.temEx}`);
          must(/Dezembro/i.test(dez.titulo||""),`[${pid}] esperava Dezembro, veio "${dez.titulo}"`);
          must(dez.temVista&&dez.temEx,`[${pid}] faltam Vista/Exames em Dezembro`);
          await fr.click("#cal-prev"); await fr.waitForTimeout(400);
        }
        // bloco novo de estagio + botao do Guia
        if(pid!=="estagio"){
          await fr.evaluate(async()=>{ for(let v=0;v<60;v++){
            const cx=[...document.querySelectorAll('.step-item:not(.is-locked) .step-check input:not(:checked)')];
            if(!cx.length) break; cx[0].closest(".step-check").querySelector(".box").click();
            await new Promise(r=>setTimeout(r,45)); } });
          await fr.waitForTimeout(600);
          const g=await fr.evaluate(()=>{
            const a=[...document.querySelectorAll('a.doc-btn')].find(x=>/Guia de Est/i.test(x.textContent));
            const trilha=[...document.querySelectorAll('a.doc-btn')].filter(x=>/Trilha-de-Formacao/.test(x.href)).length;
            const workalove=document.body.innerText.indexOf("Acessar a Workalove")>=0;
            return {guia:a?a.getAttribute("href"):null, trilha, workalove};
          });
          console.log(`  [${pid}] botão Guia -> ${g.guia?"ok":"AUSENTE"} | botões Trilha: ${g.trilha} | texto antigo: ${g.workalove}`);
          must(g.guia&&g.guia.indexOf("Gest%C3%A3o%20de%20Est%C3%A1gio")>0,`[${pid}] botao do Guia ausente/errado`);
          must(g.trilha===1,`[${pid}] esperava 1 botao da Trilha, achei ${g.trilha}`);
          must(g.workalove===false,`[${pid}] texto antigo de estagio ainda presente`);
        }
        await fr.evaluate(()=>{const e=document.querySelector("#sv-estagio,#ve-estagio,#sec-documentos");if(e)e.scrollIntoView();});
        await fr.waitForTimeout(400);
        await pg.screenshot({path:`shot-${pid}.png`});
      }
    }
    must(ce.length===0,`[${pid}/${rot}] console: ${JSON.stringify(ce.slice(0,3))}`);
    if(rede.length&&rot==="desktop") console.log(`  [${pid}] (${rede.length} recurso(s) de fecap.br nao carregaram — host bloqueado neste sandbox, nao no aluno)`);
    await ctx.close();
  }
  console.log(`[${pid}] ok (desktop + celular)`);
}
await b.close();
if(erros.length){ console.log("\n*** ERROS ***"); erros.forEach(e=>console.log(" -",e)); process.exit(1); }
console.log("\nOK: as 5 LPs renderizam certo no CRM.");
})().catch(e=>{console.error("FALHOU:",e);process.exit(1);});
