const {chromium}=require("playwright");
const fs=require("fs"),path=require("path");
const dir=process.cwd(), erros=[], must=(c,m)=>{ if(!c) erros.push(m); };
const ESPERADO={ingressantes:"saida/ingressantes-crm.txt",veteranos:"saida/veteranos-crm.txt",
 "contabeis-graduados":"saida/contabeis-graduados-crm.txt","transferencia-externa":"saida/transferencia-externa-crm.txt",
 estagio:"saida/estagio-crm.txt"};

(async()=>{
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1400,height:950}});
const pg=await ctx.newPage(); const ce=[];
pg.on("pageerror",e=>ce.push("pageerror: "+e.message));
pg.on("console",m=>{ if(m.type()==="error") ce.push("console: "+m.text()); });
await pg.goto("file://"+path.join(dir,"asa-editor.html"));
await pg.evaluate(()=>{ try{localStorage.clear();}catch(e){} });
await pg.reload(); await pg.waitForTimeout(800);
console.log("TITULO:", await pg.title());

const abasPerfil=await pg.evaluate(()=>[...document.querySelectorAll("#tabs .tab")].map(t=>t.textContent.trim()).filter(Boolean));
console.log("abas de perfil no topo:", JSON.stringify(abasPerfil));

await pg.click("#copy-crm"); await pg.waitForTimeout(500);
const abas=await pg.evaluate(()=>[...document.querySelectorAll("#copy-tabs .ctab")].map(t=>({id:t.dataset.cp,rot:t.textContent.trim()})));
console.log("perfis no modal:", JSON.stringify(abas.map(a=>a.id)));
must(abas.length===5,`esperava 5 perfis, achei ${abas.length}`);

fs.mkdirSync("saida-unico",{recursive:true});
for(const {id,rot} of abas){
  await pg.click(`#copy-tabs .ctab[data-cp="${id}"]`); await pg.waitForTimeout(400);
  const code=await pg.inputValue("#copy-code");
  must(code.indexOf("Erro ao gerar")<0,`${id}: erro ao gerar`);
  must(code.indexOf("__ASA_MODEL__")<0,`${id}: marcador vazou para a saida`);
  fs.writeFileSync(path.join("saida-unico",id+"-crm.txt"),code);
  const esp=fs.readFileSync(ESPERADO[id],"utf8");
  const igual = code===esp;
  must(igual,`${id}: a saida MUDOU em relacao a verificada`);
  // o template certo foi usado?
  const temAjustes=code.indexOf("estagio-ajustes")>=0;
  const deveriaTer = id==="estagio";
  must(temAjustes===deveriaTer,`${id}: template errado (estagio-ajustes=${temAjustes}, esperado ${deveriaTer})`);
  console.log(`  ${id.padEnd(23)} "${rot}" ${String(code.length).padStart(7)} chars | identico ao verificado: ${igual?"SIM":"NAO"} | template: ${temAjustes?"estagio":"guias"}`);
}
must(ce.length===0,`erros de console: ${JSON.stringify(ce.slice(0,3))}`);
await b.close();
if(erros.length){ console.log("\n*** ERROS ***"); erros.forEach(e=>console.log(" -",e)); process.exit(1); }
console.log("\nOK: um editor so, 5 LPs, saida byte a byte igual a ja verificada.");
})().catch(e=>{console.error("FALHOU:",e);process.exit(1);});
