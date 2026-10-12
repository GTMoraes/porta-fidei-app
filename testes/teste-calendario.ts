// Confere o calendário litúrgico em datas conhecidas.  Rodar com:  npx tsx testes/teste-calendario.ts
import { diaLiturgico, iso, pascoa, advento1 } from '../src/liturgia/calendario';

const casos: [string, string][] = [
  ['2026-10-11', '28º Domingo do Tempo Comum'],
  ['2026-10-12', 'Aparecida'],
  ['2026-04-05', 'Páscoa'],
  ['2026-02-18', 'Cinzas'],
  ['2026-05-17', 'Ascensão'],
  ['2026-05-24', 'Pentecostes'],
  ['2026-06-04', 'Corpo e Sangue'],
  ['2026-07-05', 'São Pedro e São Paulo'],
  ['2026-08-16', 'Assunção'],
  ['2026-11-01', 'Todos os Santos'],
  ['2026-11-02', 'Fiéis Defuntos'],
  ['2026-11-22', 'Rei do Universo'],
  ['2026-11-29', '1º Domingo do Advento'],
  ['2026-12-08', 'Imaculada'],
  ['2026-12-27', 'Sagrada Família'],
  ['2027-01-03', 'Epifania'],
  ['2027-01-10', 'Batismo'],
  ['2027-01-11', '1ª Semana do Tempo Comum'],
];
let falhas = 0;
for (const [d, esperado] of casos) {
  const x = diaLiturgico(d);
  const ok = `${x.celebracao.nome} ${x.feria}`.includes(esperado);
  if (!ok) falhas++;
  console.log(ok ? 'OK ' : 'ERRO', d, '→', x.celebracao.nome, `(saltério ${x.semanaSalterio}, ano ${x.anoDominical}/${x.anoFerial})`);
}
for (const y of [2026, 2027, 2028]) console.log(y, 'Páscoa', iso(pascoa(y)), '· 1º Advento', iso(advento1(y)));
process.exit(falhas ? 1 : 0);
