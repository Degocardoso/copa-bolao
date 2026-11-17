const fs=require("fs");
const A=fs.readFileSync("crm-colado.txt","utf8");   // o que voce me mandou
const B=fs.readFileSync("estagio-crm.html","utf8"); // o que eu gerei
const ANT_SEM="https://edufecap.sharepoint.com/:x:/s/ASA/IQD8CAP-QdLJTKLrbaUHr07bAaHO9J6mUseeoTRVY1dNltU?e=ld2tFe";
const ANT_SUP="https://edufecap.sharepoint.com/:x:/s/ASA/IQDjZ0v8iKPhTpjHqZoLad7XAWTVH5XEVxbPVfYyfU_86FQ?e=35eao7";
const NOV_SEM="https://www.fecap.br/wp-content/uploads/2026/10/Relatorio_Semestral_Atividades_MODELO-1.xlsx";
const NOV_SUP="https://www.fecap.br/wp-content/uploads/2026/10/Relatorio_de_Estagio_Supervisionado_MODELO_VF.xlsx";

// aplica SO a troca de URL no original e compara com o gerado
const esperado=A.split(ANT_SEM).join(NOV_SEM).split(ANT_SUP).join(NOV_SUP);
console.log("original  :",A.length,"chars");
console.log("gerado    :",B.length,"chars");
console.log("esperado  :",esperado.length,"chars");

if(esperado===B){ console.log("\nIDENTICO: a unica diferenca para o seu arquivo sao as 6 URLs."); process.exit(0); }

// se diferir, mostra exatamente onde
let i=0; while(i<Math.min(esperado.length,B.length)&&esperado[i]===B[i]) i++;
let j=0; while(j<Math.min(esperado.length,B.length)-i&&esperado[esperado.length-1-j]===B[B.length-1-j]) j++;
console.log("\nDIFERENCA a partir do char",i,"(e ate",j,"chars antes do fim)");
console.log("--- esperado ---\n"+JSON.stringify(esperado.slice(Math.max(0,i-200), esperado.length-j+200)));
console.log("--- gerado ---\n"+JSON.stringify(B.slice(Math.max(0,i-200), B.length-j+200)));
process.exit(1);
