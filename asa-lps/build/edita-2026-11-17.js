const fs=require("fs");
const est=JSON.parse(fs.readFileSync("modelo-estagio.json","utf8"));
const base=JSON.parse(fs.readFileSync("modelo-base.json","utf8"));
const log=[]; const must=(c,m)=>{ if(!c) throw new Error("FALHOU: "+m); };
const item=(M,p,s,i)=>{const sec=M.profiles[p].sections.find(x=>x.id===s);must(sec,`secao ${p}/${s}`);
  const it=(sec.items||[]).find(x=>x.id===i);must(it,`item ${p}/${s}/${i}`);return it;};
const troca1=(txt,de,para,nome)=>{const n=txt.split(de).length-1;must(n===1,`${nome}: esperava 1 ocorrencia, achei ${n}`);return txt.split(de).join(para);};

const GUIA="https://guidemeatendimento.crmeducacional.com/LP/fecap/Gest%C3%A3o%20de%20Est%C3%A1gio";
const PDF_VELHO="https://www.fecap.br/wp-content/uploads/2026/07/Requisitos_para_formao.pdf";
const PDF_NOVO="https://www.fecap.br/wp-content/uploads/2026/10/Trilha-de-Formacao-Formandos-2026.2-1-1.pdf";
const NOTION='<a class="doc-btn" href="https://app.notion.com/p/Componentes-para-formatura-38b6687cac258089b114e83ab6e696c4?source=copy_link" target="_blank" rel="noopener">Componentes para formatura (PDF)</a>\n';

/* ───── A. LP de Estágio: "Documentação de Estágio" -> "Guia de Estágio" ───── */
must(est.profiles.estagio.hero.title==="Documentação de Estágio","hero.title do estagio");
est.profiles.estagio.hero.title="Guia de Estágio";
est.profiles.estagio.label="Guia de Estágio";
log.push("A. estagio: hero.title e label -> \"Guia de Estágio\"");

/* ───── B. PDF de requisitos para formatura (4 perfis) ───── */
let nPdf=0;
Object.entries(base.profiles).forEach(([pid,p])=>p.sections.forEach(s=>(s.items||[]).forEach(i=>{
  if(i.body&&i.body.indexOf(PDF_VELHO)>=0){
    const n=i.body.split(PDF_VELHO).length-1; nPdf+=n;
    i.body=i.body.split(PDF_VELHO).join(PDF_NOVO);
    log.push(`B. ${pid}/${s.id}/${i.id}: ${n}x PDF de formatura -> Trilha de Formação`);
  }
})));
must(nPdf===4,`esperava 4 trocas de PDF, fiz ${nPdf}`);

/* ───── C. Veteranos: remove o botão que apontava para o Notion ───── */
const veComp=item(base,"veteranos","vet-semestre","ve-componentes");
veComp.body=troca1(veComp.body,NOTION,"","C. botao do Notion");
must(veComp.body.indexOf("app.notion.com")<0,"sobrou referencia ao notion");
log.push("C. veteranos/ve-componentes: botão do Notion removido");

/* ───── D. "Estágio Não Obrigatório" -> remete ao Guia de Estágio ───── */
const P1='<p>Na FECAP, a experiência profissional pode iniciar cedo, não sendo necessário esperar os últimos semestres do curso para ingressar no mercado de trabalho! O <strong>estágio não obrigatório</strong> costuma ser a primeira experiência profissional de um estudante, podendo ser realizado independentemente do curso e semestre.</p>';
const NOVO_CORPO=[P1,
'<div class="callout callout--accent">',
'  <h4>Tudo sobre estágio está no Guia de Estágio</h4>',
'  <p>Para você não precisar procurar em vários lugares, reunimos todas as orientações sobre estágio em uma página só: o <strong>Guia de Estágio</strong>.</p>',
'  <p>Lá você encontra o que caracteriza um estágio e quem participa dele, a diferença entre <strong>estágio obrigatório e não obrigatório</strong>, seus direitos (jornada, bolsa-auxílio e seguro), <strong>cada documento exigido</strong> — Termo de Compromisso, Termo Aditivo, Relatórios e Termo de Rescisão —, <strong>como preencher cada um deles</strong>, os prazos de validação e os principais motivos de indeferimento.</p>',
'</div>',
`<a class="doc-btn" href="${GUIA}" target="_blank" rel="noopener">Acessar o Guia de Estágio</a>`].join("\n");
[["ingressantes","sec-servicos","sv-estagio"],["contabeis-graduados","sec-servicos","sv-estagio"],
 ["transferencia-externa","sec-servicos","sv-estagio"],["veteranos","vet-carreira","ve-estagio"]].forEach(([p,s,i])=>{
  const it=item(base,p,s,i);
  must(it.body.indexOf(P1)===0,`${p}/${i}: o 1o paragrafo nao bate`);
  const antes=it.body.length; it.body=NOVO_CORPO;
  log.push(`D. ${p}/${s}/${i}: ${antes} -> ${NOVO_CORPO.length} chars (abaixo da linha vermelha removido)`);
});

/* ───── E. datas de avaliação nos calendários ───── */
const EVENTOS=[
 {id:"av-provas-oficiais",title:"Provas Oficiais",date:"2026-11-26",endDate:"2026-12-04",category:"avaliacao",allDay:true,courses:["Todos"]},
 {id:"av-vista-provas",   title:"Vista de Provas", date:"2026-12-05",endDate:"2026-12-10",category:"avaliacao",allDay:true,courses:["Todos"]},
 {id:"av-exames-finais",  title:"Exames Finais",   date:"2026-12-11",endDate:"2026-12-16",category:"avaliacao",allDay:true,courses:["Todos"]}];
["ingressantes","veteranos"].forEach(pid=>{
  const cal=base.profiles[pid].calendar;
  EVENTOS.forEach(e=>{ must(!cal.events.some(x=>x.id===e.id),`${pid}: evento ${e.id} ja existe`);
    cal.events.push(JSON.parse(JSON.stringify(e))); });
  log.push(`E. ${pid}/calendario: +3 eventos (POs, Vista, Exames) -> ${cal.events.length} no total`);
});

/* ───── F. a Vista faltava no texto das datas ───── */
const bvCal=item(base,"ingressantes","sec-boasvindas","bv-calendario");
bvCal.body=troca1(bvCal.body,
 '  <li><strong>Exames Finais:</strong> de 11/12 a 16/12.</li>',
 '  <li><strong>Vista de Provas:</strong> de 05/12 a 10/12;</li>\n  <li><strong>Exames Finais:</strong> de 11/12 a 16/12.</li>',
 "F. texto ingressantes");
log.push("F. ingressantes/bv-calendario: linha da Vista de Provas acrescentada");

const veInfo=item(base,"veteranos","vet-semestre","ve-info");
veInfo.body=troca1(veInfo.body,
 '  <div class="quadro"><p><strong>Exames</strong></p><p>11/12 a 16/12</p></div>',
 '  <div class="quadro"><p><strong>Vista de Provas</strong></p><p>05/12 a 10/12</p></div>\n  <div class="quadro"><p><strong>Exames</strong></p><p>11/12 a 16/12</p></div>',
 "F. texto veteranos");
log.push("F. veteranos/ve-info: quadro da Vista de Provas acrescentado");

/* ───── grava ───── */
const sE=JSON.stringify(est,null,2), sB=JSON.stringify(base,null,2);
must(sE.indexOf("Documentação de Estágio")<0,"sobrou 'Documentação de Estágio'");
must(sB.indexOf(PDF_VELHO)<0,"sobrou o PDF antigo");
must(sB.indexOf("app.notion.com")<0,"sobrou link do notion");
must((sB.split(GUIA).length-1)===4,"esperava 4 botoes do Guia de Estagio");
fs.writeFileSync("modelo-estagio.json",sE);
fs.writeFileSync("modelo-base.json",sB);
console.log(log.join("\n"));
console.log("\nOK: todas as edicoes aplicadas com assercao.");
