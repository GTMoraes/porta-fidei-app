import { DIAS_SEMANA, MESES, hojeIso, somaDias } from '@/liturgia/calendario';

const DIA_CURTO = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
const MES_CURTO = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

export const hora = (d: Date) => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`;

export function dataCurta(d: Date) {
  return `${DIA_CURTO[d.getDay()]} ${d.getDate()} de ${MES_CURTO[d.getMonth()]}`;
}

export function dataLonga(d: Date) {
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function quando(inicioIso: string, fimIso?: string | null) {
  const i = new Date(inicioIso);
  const base = `${dataCurta(i)} · ${hora(i)}`;
  if (!fimIso) return base;
  const f = new Date(fimIso);
  if (f.toDateString() === i.toDateString()) return `${base} às ${hora(f)}`;
  return `${base} até ${dataCurta(f)}`;
}

const DIA_SIMPLES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
// "às 20h", mas "à 1h" (e "das"/"da")
const as = (d: Date) => `${d.getHours() === 1 ? 'à' : 'às'} ${hora(d)}`;
const das = (d: Date) => `${d.getHours() === 1 ? 'da' : 'das'} ${hora(d)}`;

/** "quarta, 28 de outubro" (com o ano só quando não é o atual) */
function diaDoEvento(d: Date) {
  const ano = d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : '';
  return `${DIA_SIMPLES[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}${ano}`;
}

/**
 * Quando de um evento, em duas linhas (tela do evento e texto de compartilhar):
 * vários dias: ["Quarta, 28 de outubro, às 18h", "até quinta, 12 de novembro"];
 * um dia: ["Quarta, 4 de novembro", "das 20h às 22h"] (sem hora de fim: "às 20h").
 * O fim só leva a hora quando ela diz algo (não leva em 23h59 nem em 0h, que é o fim do dia anterior).
 */
export function quandoEvento(inicioIso: string, fimIso?: string | null): [string, string] {
  const i = new Date(inicioIso);
  let f = fimIso ? new Date(fimIso) : null;
  let horaFim = true;
  if (f && f.getHours() === 0 && f.getMinutes() === 0 && f.getTime() > i.getTime()) {
    f = new Date(f.getTime() - 60_000); // 0h: termina no fim do dia anterior
    horaFim = false;
  }
  if (f && f.toDateString() !== i.toDateString()) {
    if (f.getHours() === 23 && f.getMinutes() >= 59) horaFim = false;
    return [`${maiuscula(diaDoEvento(i))}, ${as(i)}`, `até ${diaDoEvento(f)}${horaFim ? `, ${as(f)}` : ''}`];
  }
  if (f && !horaFim) return [maiuscula(diaDoEvento(i)), `${das(i)} à meia-noite`]; // terminava às 0h do dia seguinte
  return [maiuscula(diaDoEvento(i)), f ? `${das(i)} ${as(f)}` : as(i)];
}

/** "28/10 | 15h30" (com o ano, "28/10/2025", só quando não é o atual): datas dos avisos */
export function dataHoraCurta(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear() !== new Date().getFullYear() ? `/${d.getFullYear()}` : '';
  return `${dd}/${mm}${ano} | ${hora(d)}`;
}

export const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Data litúrgica de uma Hora agora. As Completas são a última oração antes do repouso,
 *  "mesmo passada a meia-noite" (IGLH 84): de madrugada (antes das 4h) valem as do dia que terminou. */
export function dataParaHora(h: string, agora = new Date()): string {
  const hoje = hojeIso();
  return h === 'completas' && agora.getHours() < 4 ? somaDias(hoje, -1) : hoje;
}

/** Hora canônica sugerida para o horário atual */
export function horaSugerida(agora = new Date()) {
  const h = agora.getHours() + agora.getMinutes() / 60;
  if (h < 4) return 'completas' as const;
  if (h < 8.5) return 'laudes' as const;
  if (h < 11) return 'terca' as const;
  if (h < 14) return 'sexta' as const;
  if (h < 16.5) return 'nona' as const;
  if (h < 20) return 'vesperas' as const;
  return 'completas' as const;
}

/** 23h59 do dia de `d` (mais `dias` dias): a validade "Fim de hoje", "Amanhã"... dos avisos */
export function fimDoDia(d = new Date(), dias = 0) {
  const f = new Date(d);
  f.setDate(f.getDate() + dias);
  f.setHours(23, 59, 0, 0);
  return f;
}

/** "qui. 22 de out. às 23h59" */
export const diaEHora = (d: Date) => `${dataCurta(d)} às ${hora(d)}`;
