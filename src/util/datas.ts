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
