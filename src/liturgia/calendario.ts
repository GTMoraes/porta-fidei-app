// Motor do calendário litúrgico (Rito Romano, normas do Brasil / CNBB).
// Puro TypeScript, sem dependências: roda no app e em testes no Node.

import { SANTOS, type CorLiturgica, type Santo } from './santos';

export type Tempo = 'advento' | 'natal' | 'comum' | 'quaresma' | 'triduo' | 'pascoa';
export type GrauDia = 'S' | 'F' | 'M' | 'm' | 'D' | 'f'; // D = domingo, f = féria

export interface Celebracao {
  nome: string;
  grau: GrauDia;
  cor: CorLiturgica;
  slug?: string; // arquivo próprio no pacote de conteúdo
  chave?: string; // dia temporal especial (ramos, pascoa, pentecostes...)
  santo?: boolean;
}

export interface DiaLiturgico {
  data: string; // AAAA-MM-DD
  diaSemana: number; // 0 = domingo
  tempo: Tempo;
  semana: number; // semana dentro do tempo (0 quando não se aplica)
  semanaSalterio: 1 | 2 | 3 | 4;
  anoDominical: 'A' | 'B' | 'C';
  anoFerial: 'I' | 'II';
  celebracao: Celebracao;
  facultativas: Santo[]; // memórias facultativas que podem ser celebradas no dia
  comemoracao?: Santo; // memória reduzida a comemoração (Quaresma, 17 a 24/12)
  feria: string; // nome do dia temporal (ex.: "Segunda-feira da 28ª Semana do Tempo Comum")
  rank: number;
}

const DIA = 86400000;
export const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ---------- utilidades de data (sempre em UTC para não sofrer com fuso/horário de verão)
export const d = (y: number, m: number, dia: number) => Date.UTC(y, m - 1, dia);
export const ymd = (t: number) => {
  const x = new Date(t);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), dow: x.getUTCDay() };
};
export const iso = (t: number) => {
  const { y, m, d: dd } = ymd(t);
  return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};
export const deIso = (s: string) => {
  const [y, m, dd] = s.split('-').map(Number);
  return d(y, m, dd);
};
export const hojeIso = (agora = new Date()) =>
  `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
const dow = (t: number) => new Date(t).getUTCDay();
const add = (t: number, n: number) => t + n * DIA;
/** domingo igual ou seguinte a t */
const domingoAPartirDe = (t: number) => add(t, (7 - dow(t)) % 7);
const ord = (n: number) => `${n}ª`; // feminino (semana)
const ordM = (n: number) => `${n}º`; // masculino (domingo, dia)

export function pascoa(ano: number): number {
  // Algoritmo de Meeus/Jones/Butcher (calendário gregoriano)
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const dd = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return d(ano, mes, dia);
}

/** 1º domingo do Advento do ano civil informado */
export function advento1(ano: number): number {
  const natal = d(ano, 12, 25);
  const domAntesNatal = add(natal, -(dow(natal) === 0 ? 7 : dow(natal)));
  return add(domAntesNatal, -21);
}

/** Epifania no Brasil: domingo entre 2 e 8 de janeiro */
export function epifania(ano: number): number {
  return domingoAPartirDe(d(ano, 1, 2));
}

/** Batismo do Senhor: domingo depois da Epifania; se a Epifania cai em 7 ou 8/1, segunda-feira seguinte */
export function batismo(ano: number): number {
  const ep = epifania(ano);
  const { d: dia } = ymd(ep);
  return dia >= 7 ? add(ep, 1) : add(ep, 7);
}

/** Sagrada Família: domingo na oitava do Natal; se não houver, 30/12 */
export function sagradaFamilia(ano: number): number {
  const natal = d(ano, 12, 25);
  if (dow(natal) === 0) return d(ano, 12, 30);
  return domingoAPartirDe(add(natal, 1));
}

interface Movel {
  t: number;
  nome: string;
  grau: GrauDia;
  cor: CorLiturgica;
  chave: string;
  rank: number;
}

/** Datas móveis e transferências do ano civil */
function moveis(ano: number): Movel[] {
  const P = pascoa(ano);
  const L: Movel[] = [
    { t: add(P, -46), nome: 'Quarta-feira de Cinzas', grau: 'f', cor: 'roxo', chave: 'cinzas', rank: 2 },
    { t: add(P, -7), nome: 'Domingo de Ramos da Paixão do Senhor', grau: 'D', cor: 'vermelho', chave: 'ramos', rank: 2 },
    { t: add(P, -3), nome: 'Quinta-feira Santa (Ceia do Senhor)', grau: 'f', cor: 'branco', chave: 'ceiadosenhor', rank: 1 },
    { t: add(P, -2), nome: 'Sexta-feira da Paixão do Senhor', grau: 'f', cor: 'vermelho', chave: 'paixaodosenhor', rank: 1 },
    { t: add(P, -1), nome: 'Sábado Santo', grau: 'f', cor: 'roxo', chave: 'sabadosanto', rank: 1 },
    { t: P, nome: 'Domingo da Páscoa na Ressurreição do Senhor', grau: 'S', cor: 'branco', chave: 'pascoa', rank: 1 },
    { t: add(P, 7), nome: '2º Domingo da Páscoa (da Divina Misericórdia)', grau: 'D', cor: 'branco', chave: 'divinamisericordia', rank: 2 },
    // Brasil: Ascensão transferida para o domingo (7º da Páscoa)
    { t: add(P, 42), nome: 'Ascensão do Senhor', grau: 'S', cor: 'branco', chave: 'ascensaodosenhor', rank: 2 },
    { t: add(P, 49), nome: 'Domingo de Pentecostes', grau: 'S', cor: 'vermelho', chave: 'pentecostes', rank: 2 },
    { t: add(P, 50), nome: 'Bem-aventurada Virgem Maria, Mãe da Igreja', grau: 'M', cor: 'branco', chave: 'maedaigreja', rank: 10 },
    { t: add(P, 53), nome: 'Nosso Senhor Jesus Cristo, Sumo e Eterno Sacerdote', grau: 'F', cor: 'branco', chave: 'sumosacerdote', rank: 7 },
    { t: add(P, 56), nome: 'Santíssima Trindade', grau: 'S', cor: 'branco', chave: 'santissimatrindade', rank: 3 },
    { t: add(P, 60), nome: 'Santíssimo Corpo e Sangue de Cristo', grau: 'S', cor: 'branco', chave: 'corpuschristi', rank: 3 },
    { t: add(P, 68), nome: 'Sagrado Coração de Jesus', grau: 'S', cor: 'branco', chave: 'scj', rank: 3 },
    { t: add(P, 69), nome: 'Imaculado Coração da Bem-aventurada Virgem Maria', grau: 'M', cor: 'branco', chave: 'icvm', rank: 10 },
    { t: add(advento1(ano), -7), nome: 'Nosso Senhor Jesus Cristo, Rei do Universo', grau: 'S', cor: 'branco', chave: 'cristoreidouniverso', rank: 3 },
    { t: d(ano, 12, 25), nome: 'Natal do Senhor', grau: 'S', cor: 'branco', chave: 'natal', rank: 2 },
    { t: sagradaFamilia(ano), nome: 'Sagrada Família de Jesus, Maria e José', grau: 'F', cor: 'branco', chave: 'sagradafamilia', rank: 5 },
    { t: epifania(ano), nome: 'Epifania do Senhor', grau: 'S', cor: 'branco', chave: 'epifania', rank: 2 },
    { t: batismo(ano), nome: 'Batismo do Senhor', grau: 'F', cor: 'branco', chave: 'batismo', rank: 5 },
  ];
  return L;
}

const SLUG_MOVEL: Record<string, string> = {
  ramos: 'ramos',
  ceiadosenhor: 'ceiadosenhor',
  paixaodosenhor: 'paixaodosenhor',
  sabadosanto: 'sabadosanto',
  pascoa: 'pascoa',
  divinamisericordia: 'divinamisericordia',
  ascensaodosenhor: 'ascensaodosenhor',
  pentecostes: 'pentecostes',
  maedaigreja: 'maedaigreja',
  santissimatrindade: 'santissimatrindade',
  corpuschristi: 'corpuschristi',
  scj: 'scj',
  icvm: 'icvm',
  cristoreidouniverso: 'cristoreidouniverso',
  natal: 'natal',
  sagradafamilia: 'sagradafamilia',
  epifania: 'epifania',
  batismo: 'batismo',
  cinzas: 'cinzas',
};

/** Santos do dia já com as transferências do Brasil e das normas gerais */
function santosDoDia(t: number): Santo[] {
  const { y, m, d: dia } = ymd(t);
  const chave = `${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  let lista = [...(SANTOS[chave] ?? [])];
  const P = pascoa(y);

  // Solenidades transferidas para o domingo no Brasil
  const transf: { de: string; nome: string; janela: [number, number, number] }[] = [
    { de: '06-29', nome: 'pedroepaulo', janela: [6, 29, 6] }, // domingo entre 29/6 e 5/7
    { de: '08-15', nome: 'assuncao', janela: [8, 15, 6] }, // domingo entre 15 e 21/8
    { de: '11-01', nome: 'todosossantos', janela: [11, 1, 6] }, // domingo entre 1 e 7/11
  ];
  for (const tr of transf) {
    const orig = d(y, tr.janela[0], tr.janela[1]);
    let destino = domingoAPartirDe(orig);
    // Todos os Santos: se 2/11 cair em domingo, fica no dia 1º
    if (tr.nome === 'todosossantos' && dow(d(y, 11, 2)) === 0) destino = orig;
    const santo = SANTOS[tr.de][0];
    if (t === orig && destino !== orig) lista = lista.filter((x) => x.slug !== tr.nome);
    if (t === destino && destino !== orig) lista = [santo, ...lista];
  }

  // Imaculada Conceição em domingo do Advento -> segunda-feira
  const imac = d(y, 12, 8);
  if (dow(imac) === 0) {
    if (t === imac) lista = lista.filter((x) => x.slug !== 'imaculada');
    if (t === add(imac, 1)) lista = [SANTOS['12-08'][0], ...lista];
  }

  // São José (19/3): domingo da Quaresma -> segunda; Semana Santa -> sábado antes de Ramos
  const sj = d(y, 3, 19);
  const ramos = add(P, -7);
  let sjDestino = sj;
  if (sj >= ramos && sj <= add(P, 7)) sjDestino = add(ramos, -1);
  else if (dow(sj) === 0) sjDestino = add(sj, 1);
  if (sjDestino !== sj) {
    if (t === sj) lista = lista.filter((x) => x.slug !== 'saojose');
    if (t === sjDestino) lista = [SANTOS['03-19'][0], ...lista];
  }

  // Anunciação (25/3): Semana Santa ou oitava da Páscoa -> segunda após o 2º domingo da Páscoa; domingo -> segunda
  const an = d(y, 3, 25);
  let anDestino = an;
  if (an >= ramos && an <= add(P, 7)) anDestino = add(P, 8);
  else if (dow(an) === 0) anDestino = add(an, 1);
  if (anDestino !== an) {
    if (t === an) lista = lista.filter((x) => x.slug !== 'anunciacao');
    if (t === anDestino) lista = [SANTOS['03-25'][0], ...lista];
  }
  return lista;
}

const rankSanto = (g: Santo['grau']) => (g === 'S' ? 3 : g === 'F' ? 7 : g === 'M' ? 10 : 12);
const FESTAS_DO_SENHOR = new Set(['apresentacao', 'transfiguracao', 'exaltacao', 'latrao']);

function corSanto(sn: Santo): CorLiturgica {
  if (sn.cor) return sn.cor;
  return 'branco';
}

export function diaLiturgico(dataIso: string): DiaLiturgico {
  const t = deIso(dataIso);
  const { y, m, d: dia } = ymd(t);
  const ds = dow(t);
  const P = pascoa(y);
  const cinzas = add(P, -46);
  const pent = add(P, 49);
  const adv1 = advento1(y);
  const advAnterior = advento1(y - 1);
  const batismoT = batismo(y);
  const natal = d(y, 12, 25);

  // Ano litúrgico: começa no 1º domingo do Advento
  const anoLit = t >= adv1 ? y + 1 : y;
  const anoDominical = (['C', 'A', 'B'] as const)[anoLit % 3];
  const anoFerial = anoLit % 2 === 1 ? 'I' : 'II';

  let tempo: Tempo;
  let semana = 0;
  let feria = '';
  let rankTemporal = 13;
  let corTemporal: CorLiturgica = 'verde';

  const nomeDia = DIAS_SEMANA[ds];

  if (t >= adv1 && t < natal) {
    tempo = 'advento';
    semana = Math.floor((t - adv1) / DIA / 7) + 1;
    corTemporal = semana === 3 && ds === 0 ? 'rosa' : 'roxo';
    if (ds === 0) {
      feria = `${ordM(semana)} Domingo do Advento`;
      rankTemporal = 2;
    } else if (t >= d(y, 12, 17)) {
      feria = `${dia} de dezembro (${nomeDia} da ${ord(semana)} Semana do Advento)`;
      rankTemporal = 9;
    } else {
      feria = `${nomeDia} da ${ord(semana)} Semana do Advento`;
      rankTemporal = 13;
    }
  } else if (t >= natal || t <= batismoT) {
    tempo = 'natal';
    corTemporal = 'branco';
    const anoNatal = t >= natal ? y : y - 1;
    const oitavaFim = d(anoNatal + 1, 1, 1);
    if (t >= d(anoNatal, 12, 25) && t <= oitavaFim) {
      const n = Math.round((t - d(anoNatal, 12, 25)) / DIA);
      feria = n === 0 ? 'Natal do Senhor' : `${ordM(n + 1)} dia da Oitava do Natal`;
      rankTemporal = n === 0 ? 2 : 9;
    } else if (ds === 0) {
      feria = '2º Domingo depois do Natal';
      rankTemporal = 6;
    } else if (t < epifania(y)) {
      feria = `${nomeDia}, ${dia} de janeiro (antes da Epifania)`;
      rankTemporal = 13;
    } else {
      feria = `${nomeDia} depois da Epifania`;
      rankTemporal = 13;
    }
  } else if (t >= cinzas && t < add(P, -3)) {
    tempo = 'quaresma';
    corTemporal = 'roxo';
    const q1 = add(P, -42);
    if (t < q1) {
      semana = 0;
      feria = t === cinzas ? 'Quarta-feira de Cinzas' : `${nomeDia} depois das Cinzas`;
      rankTemporal = t === cinzas ? 2 : 9;
    } else {
      semana = Math.floor((t - q1) / DIA / 7) + 1;
      if (semana === 6) {
        feria = ds === 0 ? 'Domingo de Ramos da Paixão do Senhor' : `${nomeDia} da Semana Santa`;
        rankTemporal = 2;
        corTemporal = ds === 0 ? 'vermelho' : 'roxo';
      } else if (ds === 0) {
        feria = `${ordM(semana)} Domingo da Quaresma`;
        rankTemporal = 2;
        if (semana === 4) corTemporal = 'rosa';
      } else {
        feria = `${nomeDia} da ${ord(semana)} Semana da Quaresma`;
        rankTemporal = 9;
      }
    }
  } else if (t >= add(P, -3) && t < P) {
    tempo = 'triduo';
    semana = 6;
    feria = DIAS_SEMANA[ds];
    rankTemporal = 1;
    corTemporal = 'roxo';
  } else if (t >= P && t <= pent) {
    tempo = 'pascoa';
    corTemporal = 'branco';
    semana = Math.floor((t - P) / DIA / 7) + 1;
    if (t <= add(P, 7)) {
      feria = t === P ? 'Domingo da Páscoa' : t === add(P, 7) ? '2º Domingo da Páscoa' : `${nomeDia} da Oitava da Páscoa`;
      rankTemporal = 2;
    } else if (ds === 0) {
      feria = `${ordM(semana)} Domingo da Páscoa`;
      rankTemporal = 2;
    } else {
      feria = `${nomeDia} da ${ord(semana)} Semana da Páscoa`;
      rankTemporal = 13;
    }
  } else {
    tempo = 'comum';
    corTemporal = 'verde';
    if (t < cinzas) {
      // 1ª semana começa no dia seguinte ao Batismo; o domingo seguinte já é o 2º
      const primeiroDom = domingoAPartirDe(add(batismoT, 1));
      semana = t < primeiroDom ? 1 : Math.floor((t - primeiroDom) / DIA / 7) + 2;
    } else {
      // depois de Pentecostes conta-se para trás a partir do Advento (Cristo Rei = 34ª)
      const ate = Math.round((adv1 - t) / DIA);
      semana = 34 - Math.floor((ate - 1) / 7);
    }
    if (ds === 0) {
      feria = `${ordM(semana)} Domingo do Tempo Comum`;
      rankTemporal = 6;
    } else {
      feria = `${nomeDia} da ${ord(semana)} Semana do Tempo Comum`;
      rankTemporal = 13;
    }
  }

  // Semana do saltério
  let semanaSalterio: 1 | 2 | 3 | 4;
  if (tempo === 'comum' || tempo === 'advento') semanaSalterio = (((Math.max(semana, 1) - 1) % 4) + 1) as 1 | 2 | 3 | 4;
  else if (tempo === 'quaresma') semanaSalterio = semana === 0 ? 4 : ((((semana - 1) % 4) + 1) as 1 | 2 | 3 | 4);
  else if (tempo === 'pascoa') semanaSalterio = (((semana - 1) % 4) + 1) as 1 | 2 | 3 | 4;
  else if (tempo === 'triduo') semanaSalterio = 2;
  else {
    // Natal: semana I a partir da Sagrada Família, II a partir da Epifania
    const anoNatal = t >= natal ? y : y - 1;
    const sf = sagradaFamilia(anoNatal);
    const ep = epifania(anoNatal + 1);
    semanaSalterio = t < sf ? 4 : t < ep ? 1 : 2;
  }

  // ----- Celebração temporal móvel (do ano civil e, para Natal/Epifania, do anterior)
  let celebracao: Celebracao = {
    nome: feria,
    grau: ds === 0 ? 'D' : 'f',
    cor: corTemporal,
  };
  let rank = rankTemporal;
  for (const mv of moveis(y)) {
    if (mv.t === t && mv.rank <= rank) {
      celebracao = { nome: mv.nome, grau: mv.grau, cor: mv.cor, chave: mv.chave, slug: SLUG_MOVEL[mv.chave] };
      rank = mv.rank;
    }
  }
  if (tempo === 'triduo') {
    rank = 1;
  }

  // ----- Santoral
  const santos = santosDoDia(t);
  const facultativas: Santo[] = [];
  let comemoracao: Santo | undefined;
  for (const sn of santos) {
    let r = rankSanto(sn.grau);
    if (sn.grau === 'F' && sn.slug && FESTAS_DO_SENHOR.has(sn.slug)) r = 5;
    if (sn.slug === 'fieisdefuntos') r = 3;
    // Solenidade do santoral vence domingo do Tempo Comum e do Natal; não vence domingos fortes
    if (sn.grau !== 'm' && r < rank && !(rank <= 2)) {
      celebracao = { nome: sn.nome, grau: sn.grau, cor: corSanto(sn), slug: sn.slug, santo: true };
      rank = r;
      continue;
    }
    if (sn.grau === 'F' && r === 7 && rank === 6) continue; // festa em domingo comum: omite
    if (sn.grau === 'M' || sn.grau === 'm') {
      if (rank === 9 || (tempo === 'quaresma' && rank > 2)) {
        // Quaresma e 17-24/12: memória vira comemoração
        if (!comemoracao) comemoracao = sn;
      } else if (rank >= 13 && sn.grau === 'm') {
        facultativas.push(sn);
      }
    }
  }
  // Fiéis Defuntos: celebrados mesmo no domingo
  if (santos.some((x) => x.slug === 'fieisdefuntos')) {
    const fd = santos.find((x) => x.slug === 'fieisdefuntos')!;
    celebracao = { nome: fd.nome, grau: 'S', cor: 'roxo', slug: 'fieisdefuntos', santo: true };
    rank = 3;
  }

  // Santa Maria no sábado: sábados do Tempo Comum sem memória obrigatória
  if (tempo === 'comum' && ds === 6 && rank >= 13) {
    facultativas.push({ nome: 'Santa Maria no Sábado', grau: 'm', slug: 'santamarianosabado' });
  }

  return {
    data: iso(t),
    diaSemana: ds,
    tempo,
    semana,
    semanaSalterio,
    anoDominical,
    anoFerial,
    celebracao,
    facultativas,
    comemoracao,
    feria,
    rank,
  };
}

/** Nome por extenso da data: "segunda-feira, 12 de outubro de 2026" */
export function dataPorExtenso(dataIso: string): string {
  const t = deIso(dataIso);
  const { y, m, d: dia, dow: w } = ymd(t);
  return `${DIAS_SEMANA[w].toLowerCase()}, ${dia} de ${MESES[m - 1]} de ${y}`;
}

export const somaDias = (dataIso: string, n: number) => iso(add(deIso(dataIso), n));

export const NOME_TEMPO: Record<Tempo, string> = {
  advento: 'Tempo do Advento',
  natal: 'Tempo do Natal',
  comum: 'Tempo Comum',
  quaresma: 'Tempo da Quaresma',
  triduo: 'Tríduo Pascal',
  pascoa: 'Tempo Pascal',
};

export const NOME_GRAU: Record<GrauDia, string> = {
  S: 'Solenidade',
  F: 'Festa',
  M: 'Memória obrigatória',
  m: 'Memória facultativa',
  D: 'Domingo',
  f: 'Féria',
};

export const COR_HEX: Record<CorLiturgica, string> = {
  verde: '#2E7D4F',
  roxo: '#6B3FA0',
  branco: '#E9E2D0',
  vermelho: '#B3261E',
  rosa: '#D8789A',
  preto: '#222222',
};
