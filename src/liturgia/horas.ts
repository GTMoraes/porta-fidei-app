// Monta cada Hora do Ofício Divino para um dia, a partir do pacote de conteúdo.
// Não contém texto litúrgico: só a regra de "qual arquivo vale para qual dia".

import { diaLiturgico, somaDias, ymd, deIso, type DiaLiturgico } from './calendario';

export type Hora = 'invitatorio' | 'leituras' | 'laudes' | 'terca' | 'sexta' | 'nona' | 'vesperas' | 'completas';

export const HORAS: { id: Hora; nome: string; curto: string; quando: string }[] = [
  { id: 'invitatorio', nome: 'Invitatório', curto: 'Invitatório', quando: 'Início da oração do dia' },
  { id: 'leituras', nome: 'Ofício das Leituras', curto: 'Leituras', quando: 'A qualquer hora' },
  { id: 'laudes', nome: 'Laudes', curto: 'Laudes', quando: 'Oração da manhã' },
  { id: 'terca', nome: 'Hora Média: Terça', curto: 'Terça', quando: 'Por volta das 9h' },
  { id: 'sexta', nome: 'Hora Média: Sexta', curto: 'Sexta', quando: 'Por volta do meio-dia' },
  { id: 'nona', nome: 'Hora Média: Nona', curto: 'Nona', quando: 'Por volta das 15h' },
  { id: 'vesperas', nome: 'Vésperas', curto: 'Vésperas', quando: 'Oração da tarde' },
  { id: 'completas', nome: 'Completas', curto: 'Completas', quando: 'Antes do repouso' },
];

export interface Parte {
  arquivo: string;
  desde?: string; // id de âncora (ex.: "OL") ou texto que marca o início
  ate?: string; // texto que marca o fim (exclusivo)
  /** usado quando o arquivo próprio não traz a salmodia: entra antes dele, até "Leitura breve" */
  seFaltarSalmodia?: Parte;
  /** troca o trecho [de, ate) deste arquivo pelo mesmo trecho das partes indicadas (ex.: memória com a salmodia do dia de semana) */
  trocarTrecho?: { de: string; ate: string; partes: Parte[] };
  rotulo?: string;
}

export interface PlanoHora {
  hora: Hora;
  titulo: string;
  dia: DiaLiturgico;
  /** dia a que a hora pertence (I Vésperas pertencem ao dia seguinte) */
  diaCelebrado: DiaLiturgico;
  partes: Parte[];
  /** arquivo de onde se tira a oração do domingo para preencher lacunas */
  oracaoDe?: Parte;
  primeirasVesperas?: boolean;
  /** leituras do Ofício acrescentadas às Laudes (ajuste "Laudes ampliada") */
  leiturasExtras?: Parte[];
  avisos: string[];
}

export interface Opcoes {
  bienal?: boolean;
  memoriaEscolhida?: string; // slug de memória facultativa escolhida pelo usuário
  invitatorio?: '94' | '99' | '66' | '23';
  antifonaNasEstrofes?: boolean; // Invitatório: repete a antífona entre as estrofes (padrão: sim)
  existe: (arquivo: string) => boolean;
}

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const pad = (n: number) => String(n).padStart(2, '0');
const sufixo = (h: Hora) => (h === 'leituras' ? 'leituras' : h);

function primeiro(op: Opcoes, ...cands: (string | undefined | false)[]): string | undefined {
  for (const c of cands) if (c && op.existe(c)) return c;
  return undefined;
}

/** Celebra-se o dia seguinte já nas Vésperas de hoje? */
function temPrimeirasVesperas(hoje: DiaLiturgico, amanha: DiaLiturgico): boolean {
  const c = amanha.celebracao;
  const amanhaForte = c.grau === 'S' || amanha.diaSemana === 0 || (c.grau === 'F' && amanha.rank <= 5);
  if (!amanhaForte) return false;
  // Uma solenidade hoje mantém as suas II Vésperas, salvo se amanhã for de grau maior
  return amanha.rank < hoje.rank;
}

function slugProprio(dia: DiaLiturgico, op: Opcoes): string | undefined {
  const c = dia.celebracao;
  if (c.slug) return c.slug;
  if (op.memoriaEscolhida && dia.facultativas.some((f) => f.slug === op.memoriaEscolhida)) return op.memoriaEscolhida;
  return undefined;
}

// ------------------------------------------------------------------ temporal
function temporal(dia: DiaLiturgico, h: Hora, op: Opcoes): { partes: Parte[]; oracaoDe?: Parte; avisos: string[] } {
  const avisos: string[] = [];
  const nd = DIAS[dia.diaSemana];
  const p = dia.semanaSalterio;
  const { m, d: dd } = ymd(deIso(dia.data));
  const suf = sufixo(h);

  if (h === 'completas') {
    const cands: string[] = [];
    if (dia.tempo === 'triduo') {
      if (dia.celebracao.chave === 'ceiadosenhor') cands.push('oficio/quaresma/horas/completas_ceia');
      if (dia.celebracao.chave === 'sabadosanto') cands.push('oficio/quaresma/horas/completas_sabadosanto');
      cands.push('oficio/quaresma/horas/completas_triduo');
    }
    if (dia.tempo === 'pascoa') {
      if (dia.semana === 1) cands.push(`oficio/pascoa/horas/completas_oitava${dia.diaSemana % 2 ? 'I' : 'II'}`);
      cands.push(`oficio/pascoa/horas/${dia.semana}${nd}pascoa_completas`, `oficio/pascoa/horas/completas_${nd}`);
    }
    if (dia.tempo === 'quaresma') cands.push(`oficio/quaresma/horas/completas_${nd}`);
    if (dia.tempo === 'advento') {
      if (m === 12 && dd >= 17) cands.push(`oficio/advento/horas/completas${nd}17`);
      cands.push(`oficio/advento/horas/completas${nd}`);
    }
    if (dia.tempo === 'natal') cands.push(`oficio/natal/horas/completas_${dia.diaSemana === 0 ? 'domingoII' : 'aposepifania'}`);
    if (dia.celebracao.grau === 'S' && dia.diaSemana !== 0 && dia.diaSemana !== 6) cands.push('oficio/tempocomum/horas/completas_solenidadeII');
    cands.push(`oficio/tempocomum/horas/completas_${nd}`);
    const a = primeiro(op, ...cands);
    return { partes: a ? [{ arquivo: a }] : [], avisos };
  }

  if (h === 'invitatorio') {
    const sl = op.invitatorio ?? '94';
    const cs = op.antifonaNasEstrofes === false ? 's' : 'c';
    const a = primeiro(op, `oficio/invitatorio/invitatorio${sl}${cs}`, `oficio/invitatorio/invitatorio${sl}c`, 'oficio/invitatorio/invitatorio94c');
    return { partes: a ? [{ arquivo: a }] : [], avisos };
  }

  switch (dia.tempo) {
    case 'comum': {
      const NN = pad(dia.semana);
      const leit = op.bienal
        ? `oficio/tempocomum/leituras/bienal/${NN}${nd}TC_${dia.anoFerial === 'I' ? 'impar' : 'par'}`
        : `oficio/tempocomum/leituras/${NN}${nd}TC`;
      const domNN = dia.diaSemana === 6 ? pad(dia.semana + 1) : NN;
      const oracaoDe: Parte = { arquivo: `oficio/tempocomum/leituras/${domNN}domingoTC`, desde: 'OL' };
      if (h === 'leituras') {
        const ps = primeiro(op, `oficio/tempocomum/horas/${p}${nd}_leituras`);
        const lt = primeiro(op, leit, `oficio/tempocomum/leituras/${NN}${nd}TC`);
        const partes: Parte[] = [];
        if (ps) partes.push({ arquivo: ps });
        if (lt) partes.push({ arquivo: lt, desde: 'OL' });
        return { partes, oracaoDe, avisos };
      }
      const a = primeiro(op, `oficio/tempocomum/horas/${p}${nd}_${suf}`);
      return { partes: a ? [{ arquivo: a }] : [], oracaoDe, avisos };
    }
    case 'advento': {
      const w = dia.semana;
      const fim = m === 12 && dd >= 17;
      if (h === 'leituras') {
        const ps = primeiro(op, `oficio/advento/horas/${w}${nd}_leituras${fim ? '17' : ''}`, `oficio/advento/horas/${w}${nd}_leituras`, `oficio/advento/salterio/${w}${nd}_leituras`);
        const lt = primeiro(
          op,
          fim && dia.diaSemana !== 0 ? `oficio/advento/leituras/${dd}dezembro` : undefined,
          op.bienal ? `oficio/advento/leituras/bienal/${w}${nd}Advento_${dia.anoFerial === 'I' ? 'impar' : 'par'}` : undefined,
          `oficio/advento/leituras/${w}${nd}Advento`,
        );
        return { partes: [ps && { arquivo: ps }, lt && { arquivo: lt, desde: 'OL' }].filter(Boolean) as Parte[], avisos };
      }
      if (fim && dia.diaSemana !== 0) {
        const base = primeiro(
          op,
          dd === 24 ? `oficio/advento/salterio/dia24/4${nd}_${suf}` : undefined,
          `oficio/advento/salterio/entre17e23/${w}${nd}_${suf}`,
          `oficio/advento/salterio/${w}${nd}_${suf}`,
          `oficio/advento/horas/${w}${nd}_${suf}`,
        );
        const prop = primeiro(op, `oficio/advento/propriodotempo/${dd}_${suf}`);
        if (prop) return { partes: [{ arquivo: prop, seFaltarSalmodia: base ? { arquivo: base, ate: 'Leitura breve' } : undefined }], avisos };
        return { partes: base ? [{ arquivo: base }] : [], avisos };
      }
      const a = primeiro(
        op,
        fim ? `oficio/advento/horas/${w}${nd}_${suf}17` : undefined,
        `oficio/advento/horas/${w}${nd}_${suf}`,
        `oficio/advento/salterio/${w}${nd}_${suf}`,
      );
      return { partes: a ? [{ arquivo: a }] : [], avisos };
    }
    case 'natal': {
      const antesEpifania = m === 12 || (m === 1 && dia.feria.includes('antes da Epifania'));
      const chaveData = m === 12 ? `${dd}dezembro` : `${dd}janeiro`;
      const chave = antesEpifania ? chaveData : `${nd}_aposepifania`;
      const w = dia.semanaSalterio;
      if (h === 'leituras') {
        const ps = primeiro(op, `oficio/natal/horas/${chave}_leituras`, `oficio/natal/salterio/${w}${nd}_leituras`);
        const lt = primeiro(op, `oficio/natal/leituras/${antesEpifania ? chaveData : `${nd}_aposepifania`}`);
        return { partes: [ps && { arquivo: ps }, lt && { arquivo: lt, desde: 'OL' }].filter(Boolean) as Parte[], avisos };
      }
      const prop = primeiro(op, `oficio/natal/horas/${chave}_${suf}`);
      const base = primeiro(op, `oficio/natal/salterio/${w}${nd}_${suf}`, `oficio/tempocomum/horas/${w}${nd}_${suf}`);
      if (prop) return { partes: [{ arquivo: prop, seFaltarSalmodia: base ? { arquivo: base, ate: 'Leitura breve' } : undefined }], avisos };
      return { partes: base ? [{ arquivo: base }] : [], avisos };
    }
    case 'quaresma': {
      const n = dia.semana;
      let chave: string;
      if (n === 0) chave = `${nd}cinzas`;
      else if (n === 6) chave = `${nd}feirasanta`;
      else chave = `${n}${nd}quaresma`;
      if (h === 'leituras') {
        const a = primeiro(
          op,
          n === 0 || n === 6 ? `oficio/quaresma/oficiodasleituras/${chave}` : undefined,
          op.bienal ? `oficio/quaresma/oficiodasleituras/bienal/${n}${nd}_quaresma_${dia.anoFerial === 'I' ? 'impar' : 'par'}` : undefined,
          `oficio/quaresma/oficiodasleituras/${n}${nd}_quaresma`,
        );
        return { partes: a ? [{ arquivo: a }] : [], avisos };
      }
      const a = primeiro(op, `oficio/quaresma/horas/${chave}_${suf}`);
      return { partes: a ? [{ arquivo: a }] : [], avisos };
    }
    case 'pascoa': {
      const n = dia.semana;
      if (h === 'leituras') {
        const a = primeiro(
          op,
          op.bienal ? `oficio/pascoa/oficiodasleituras/bienal/${n}${nd}Pascoa_${dia.anoFerial === 'I' ? 'impar' : 'par'}` : undefined,
          `oficio/pascoa/oficiodasleituras/${n}${nd}Pascoa`,
        );
        return { partes: a ? [{ arquivo: a }] : [], avisos };
      }
      const a = primeiro(op, `oficio/pascoa/horas/${n}${nd}pascoa_${suf}`);
      return { partes: a ? [{ arquivo: a }] : [], avisos };
    }
    default:
      return { partes: [], avisos };
  }
}

// ------------------------------------------------------------------ memórias (Instrução Geral da Liturgia das Horas, 235-236)
// Numa memória (obrigatória ou facultativa), o próprio/comum do santo dá o hino, a leitura breve, o responsório,
// a antífona do Benedictus/Magnificat, as preces e a oração; mas a salmodia (salmos e antífonas) é a do dia de
// semana, e no Ofício das Leituras também a primeira leitura. A Hora Média e as Completas são inteiras do dia
// de semana. Exceção: nas Laudes e Vésperas, as memórias com antífonas próprias (lista abaixo) ficam com a
// salmodia delas.
const MEMORIAS_COM_SALMODIA_PROPRIA = new Set(['santaines', 'santaagueda', 'martiriobatista', 'saomartinho', 'santacecilia', 'santaluzia']);

function comSalmodiaDoDia(partes: Parte[], dia: DiaLiturgico, h: Hora, op: Opcoes): Parte[] {
  if (partes.length !== 1) return partes;
  const t = temporal(dia, h, op).partes;
  if (!t.length) return partes;
  if (h === 'laudes' || h === 'vesperas') return [{ ...partes[0], trocarTrecho: { de: 'Salmodia', ate: 'Leitura breve', partes: t } }];
  if (h === 'leituras') {
    // a primeira leitura do dia de semana começa no título dela (sem o cabeçalho do arquivo de leituras)
    const tp = t.map((x) => (x.desde === 'OL' ? { ...x, desde: 'Primeira leitura' } : x));
    return [{ ...partes[0], trocarTrecho: { de: 'Salmodia', ate: 'Segunda leitura', partes: tp } }];
  }
  return partes;
}

// ------------------------------------------------------------------ próprio (solenidades, festas, memórias)
function proprio(dia: DiaLiturgico, slug: string, h: Hora, op: Opcoes, primeiras: boolean): Parte[] | undefined {
  const suf = sufixo(h);
  const dom = dia.diaSemana === 0;
  if (primeiras) {
    const a = primeiro(op, `oficio/proprio/horas/${slug}_Ivesperas`);
    return a ? [{ arquivo: a }] : undefined;
  }
  if (h === 'leituras') {
    const a = primeiro(op, `oficio/proprio/horas/${slug}_leituras`, `oficio/proprio/oficiodasleituras/${slug}`);
    return a ? [{ arquivo: a }] : undefined;
  }
  if (h === 'completas' || h === 'invitatorio') return undefined;
  const a = primeiro(op, dom ? `oficio/proprio/horas/${slug}_${suf}_domingo` : undefined, `oficio/proprio/horas/${slug}_${suf}`);
  return a ? [{ arquivo: a }] : undefined;
}

export function planoDaHora(dataIso: string, h: Hora, op: Opcoes): PlanoHora {
  const dia = diaLiturgico(dataIso);
  const amanha = diaLiturgico(somaDias(dataIso, 1));
  const info = HORAS.find((x) => x.id === h)!;
  const avisos: string[] = [];

  // I Vésperas (e Completas depois delas) pertencem ao dia seguinte
  if ((h === 'vesperas' || h === 'completas') && temPrimeirasVesperas(dia, amanha)) {
    const slugAm = slugProprio(amanha, op);
    if (h === 'vesperas') {
      const prop = slugAm ? proprio(amanha, slugAm, 'vesperas', op, true) : undefined;
      if (prop) {
        return { hora: h, titulo: 'I Vésperas', dia, diaCelebrado: amanha, partes: prop, primeirasVesperas: true, avisos };
      }
      // domingo comum: o arquivo de sábado do saltério já são as I Vésperas
      const t = temporal(dia, 'vesperas', op);
      return { hora: h, titulo: 'I Vésperas', dia, diaCelebrado: amanha, partes: t.partes, oracaoDe: t.oracaoDe, primeirasVesperas: true, avisos: t.avisos };
    }
    if (amanha.celebracao.grau === 'S' && amanha.diaSemana !== 0) {
      const a = primeiro(op, 'oficio/tempocomum/horas/completas_solenidadeI');
      if (a) return { hora: h, titulo: info.nome, dia, diaCelebrado: amanha, partes: [{ arquivo: a }], avisos };
    }
  }

  const slug = slugProprio(dia, op);
  const ehProprioForte = !!slug && ['S', 'F'].includes(dia.celebracao.grau);
  const ehMemoria = !!slug && !ehProprioForte;

  let partes: Parte[] | undefined;
  let oracaoDe: Parte | undefined;
  const horaMedia = h === 'terca' || h === 'sexta' || h === 'nona';
  const memoriaComum = ehMemoria && (h === 'leituras' || !MEMORIAS_COM_SALMODIA_PROPRIA.has(slug!));
  if (slug && (ehProprioForte || ehMemoria) && h !== 'completas' && h !== 'invitatorio' && !(ehMemoria && horaMedia)) {
    partes = proprio(dia, slug, h, op, false);
    if (partes && memoriaComum) partes = comSalmodiaDoDia(partes, dia, h, op);
  }
  if (!partes) {
    const t = temporal(dia, h, op);
    partes = t.partes;
    oracaoDe = t.oracaoDe;
    avisos.push(...t.avisos);
  }
  if (!partes.length) avisos.push('O texto desta hora ainda não está no pacote de conteúdo instalado.');

  let leiturasExtras: Parte[] | undefined;
  if (h === 'laudes') {
    const ol = planoDaHora(dataIso, 'leituras', op).partes;
    const comLeituras = ol.filter((x) => x.desde === 'OL');
    const troca = ol.length === 1 ? ol[0].trocarTrecho : undefined;
    const primeiraDoDia = troca?.partes.find((x) => x.desde === 'Primeira leitura');
    if (troca && primeiraDoDia) {
      // memória: primeira leitura do dia de semana e segunda leitura do santo
      leiturasExtras = [{ ...primeiraDoDia, ate: 'Segunda leitura' }, { arquivo: ol[0].arquivo, desde: 'Segunda leitura' }];
    } else leiturasExtras = comLeituras.length ? comLeituras : ol.slice(-1).map((x) => ({ ...x, desde: 'Primeira leitura' }));
  }

  return {
    leiturasExtras,
    hora: h,
    titulo: info.nome,
    dia,
    diaCelebrado: dia,
    partes,
    oracaoDe,
    avisos,
  };
}
