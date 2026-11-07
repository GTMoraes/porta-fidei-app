// Regras dos lembretes de orações, jornadas e rotinas (sem nada do aparelho, para dar para testar fora do app):
// quais lembretes cada item gera e os textos. O agendamento fica em estado/lembretes.ts.

import { periodo } from '@/comunidade/jornadas';
import { caiNoDia, horaCurta, juntarE, ocorrencias } from '@/comunidade/rotinas';
import type { Comunidade } from '@/servidor/api';
import { hora as horaTexto } from '@/util/datas';
import type { Ajustes, ModoLembrete } from './ajustes';

export type TipoLembrete = 'oracao' | 'jornada' | 'rotina';
export const chaveLembrete = (t: TipoLembrete, id: string) => `${t}:${id}`;
export const modoDe = (aj: Ajustes, t: TipoLembrete, id: string): ModoLembrete => aj.lembretesItens[chaveLembrete(t, id)] ?? {};
export const ligado = (m: ModoLembrete) => !!(m.vespera || m.noDia || m.antes);

/** "1 hora", "30 minutos", "1h30" */
export function textoAntes(min: number) {
  if (min % 60 === 0) return min === 60 ? '1 hora' : `${min / 60} horas`;
  if (min < 60) return `${min} minutos`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

/** "Na véspera e no dia", "1 hora antes", "Desligado" */
export function textoModo(m: ModoLembrete, aj: Ajustes) {
  const partes: string[] = [];
  if (m.vespera) partes.push(`na véspera (${horaCurta(aj.horaVespera)})`);
  if (m.noDia) partes.push(`no dia (${horaCurta(aj.horaNoDia)})`);
  if (m.antes) partes.push(`${textoAntes(aj.minutosAntes)} antes`);
  const t = juntarE(partes);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Desligado';
}

/** Horário de Recife (o das rotinas e dos lembretes) */
const em = (dia: string, hhmm: string) => new Date(`${dia}T${hhmm}:00-03:00`);
const somaDias = (iso: string, n: number) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n, 12)).toISOString().slice(0, 10);
};
const hojeRecife = (agora: number) => new Date(agora - 3 * 3600_000).toISOString().slice(0, 10);
const curto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export interface LembreteAgendado {
  quando: Date;
  titulo: string;
  corpo: string;
  data: Record<string, string>;
}

/** Próximos lembretes de orações, jornadas e rotinas, do mais próximo ao mais distante */
export function proximosLembretes(aj: Ajustes, com: Comunidade | undefined, agora = Date.now(), dias = 45): LembreteAgendado[] {
  const out: LembreteAgendado[] = [];
  if (!com || !Object.keys(aj.lembretesItens).length) return out;
  const hoje = hojeRecife(agora);
  const ate = somaDias(hoje, dias);

  for (const o of com.oracoes) {
    const m = modoDe(aj, 'oracao', o.id);
    if (!o.lembrete || !ligado(m)) continue;
    for (let d = hoje; d <= ate; d = somaDias(d, 1)) {
      if (!caiNoDia(o.lembrete, d)) continue;
      const data = { tipo: 'oracao', id: o.id };
      if (m.vespera) out.push({ quando: em(somaDias(d, -1), aj.horaVespera), titulo: o.titulo, corpo: `Amanhã (${curto(d)}) é dia desta oração.`, data });
      if (m.noDia) out.push({ quando: em(d, aj.horaNoDia), titulo: o.titulo, corpo: 'Hoje é dia desta oração. Toque para rezar.', data });
    }
  }

  for (const j of com.jornadas) {
    const m = modoDe(aj, 'jornada', j.id);
    const p = j.ativa !== false && ligado(m) ? periodo(j, hoje) : null;
    if (!p || p.inicio < hoje) continue;
    const data = { tipo: 'jornada', id: j.id };
    if (m.vespera) out.push({ quando: em(somaDias(p.inicio, -1), aj.horaVespera), titulo: j.titulo, corpo: `Começa amanhã (${curto(p.inicio)}).`, data });
    if (m.noDia) out.push({ quando: em(p.inicio, aj.horaNoDia), titulo: j.titulo, corpo: 'Começa hoje. Toque para rezar o 1º dia.', data });
  }

  const rs = (com.rotinas ?? []).filter((r) => ligado(modoDe(aj, 'rotina', r.id)));
  if (rs.length)
    for (const o of ocorrencias(rs, hoje, ate, com.excecoes)) {
      if (o.situacao === 'cancelado' || o.situacao === 'remarcado') continue;
      const r = o.rotina;
      const m = modoDe(aj, 'rotina', r.id);
      const onde = r.local ? ` · ${r.local}` : '';
      const data = { tipo: 'rotina', id: r.id, data: o.original ?? o.data };
      if (m.vespera) out.push({ quando: em(somaDias(o.data, -1), aj.horaVespera), titulo: r.titulo, corpo: `Amanhã às ${horaTexto(o.inicio)}${onde}`, data });
      if (m.antes) out.push({ quando: new Date(o.inicio.getTime() - aj.minutosAntes * 60_000), titulo: r.titulo, corpo: `Hoje às ${horaTexto(o.inicio)}${onde}`, data });
    }

  return out.filter((l) => l.quando.getTime() > agora + 30_000).sort((a, b) => a.quando.getTime() - b.quando.getTime());
}

