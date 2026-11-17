const fs=require("fs");
const raw=fs.readFileSync("crm-colado.txt","utf8");
const a=raw.indexOf('srcdoc="');
if(a<0) throw new Error("srcdoc nao encontrado");
const ini=a+'srcdoc="'.length;
const fim=raw.lastIndexOf('"></iframe>');
if(fim<0||fim<=ini) throw new Error("fim do srcdoc nao encontrado");
const esc=raw.slice(ini,fim);
// desescapa na ordem inversa do encode: &quot; depois &amp;
const idx=esc.replace(/&quot;/g,'"').replace(/&amp;/g,"&");
fs.writeFileSync("lp-atual.html",idx);
console.log("lp-atual.html:",idx.length,"chars");

// guarda cabeca e cauda do embed para regerar identico
fs.writeFileSync("embed-head.txt",raw.slice(0,ini));
fs.writeFileSync("embed-tail.txt",raw.slice(fim));
console.log("embed-head:",ini,"chars | embed-tail:",raw.length-fim,"chars");

// extrai o JSON do modelo
const m=idx.match(/<script id="asa-config" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
if(!m) throw new Error("asa-config nao encontrado");
let model;
try{ model=JSON.parse(m[1]); }catch(e){ throw new Error("JSON invalido: "+e.message); }
fs.writeFileSync("modelo-estagio.json",JSON.stringify(model,null,2));
console.log("modelo-estagio.json ok | perfis:",Object.keys(model.profiles).join(", "));

// template = LP com o JSON trocado por marcador
const tpl=idx.slice(0,m.index)+'<script id="asa-config" type="application/json">\n__ASA_MODEL__\n</script>'+idx.slice(m.index+m[0].length);
fs.writeFileSync("lp-template.html",tpl);
console.log("lp-template.html:",tpl.length,"chars");

const p=model.profiles.estagio;
console.log("\nsecoes do perfil estagio:");
p.sections.forEach((s,i)=>console.log(" ",i+1,s.id,"|",s.nav,"| itens:",s.items.length));
