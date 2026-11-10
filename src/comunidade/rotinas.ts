// Rotinas da Comunidade: horários fixos que se repetem (missas da semana, adoração, grupos de oração, reuniões das
// comissões), cadastrados na Administração › Rotinas. Diferentes dos eventos pontuais da Agenda.
// Aqui: os dias em que cada uma cai, o texto da repetição ("Segunda a sexta", "Toda 1ª sexta-feira do mês"),
// o agrupamento da página "Horários e encontros" e o filtro da Agenda ("Sua comissão").
// Os horários são os de Recife (UTC-3, sem horário de verão), como os eventos do servidor.

import type { Aviso, ExcecaoRotina, RegraRepeticao, Rotina, TipoRotina } from '@/servidor/api';

export const TIPOS_ROTINA: TipoRotina[] = ['missa', 'adoracao', 'grupo', 'comissao', 'outra'];
export const NOME_TIPO_ROTINA: Record<TipoRotina, string> = {
  missa: 'Missas',
  adoracao: 'Adoração',
  grupo: 'Grupos de oração',
  comissao: 'Comissões',
  outra: 'Outros encontros',
};
/** nome no singular, para escolher o tipo na Administração */
export const TIPO_ROTINA_UM: Record<TipoRotina, string> = {
  missa: 'Missa',
  adoracao: 'Adoração',
  grupo: 'Grupo de oração',
  comissao: 'Comissão',
  outra: 'Outro',
};
export const ICONE_ROTINA: Record<TipoRotina, string> = {
  missa: 'building.columns',
  adoracao: 'sun.max',
  grupo: 'person.3',
  comissao: 'person.2',
  outra: 'calendar',
};

const DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIA_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
const DIA_COMPLETO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const DIA_SIGLA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "a, b e c" */
export const juntarE = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);

/** "19h", "17h30" (a partir de "HH:MM") */
export const horaCurta = (h: string) => {
  const [hh, mm] = h.split(':');
  return `${Number(hh)}h${mm && mm !== '00' ? mm : ''}`;
};

/** "19h às 19h30" (com o horário de término) ou só "19h" */
export const faixaHoras = (hora: string, fim?: string | null) => (fim ? `${horaCurta(hora)} às ${horaCurta(fim)}` : horaCurta(hora));

/** "1ª sexta-feira", "último sábado" */
function ordinal(semana: number, dia: number) {
  const fem = dia >= 1 && dia <= 5; // as "-feiras"
  if (semana === -1) return `${fem ? 'última' : 'último'} ${DIA_COMPLETO[dia]}`;
  return `${semana}${fem ? 'ª' : 'º'} ${DIA_COMPLETO[dia]}`;
}

/** "Segunda a sexta", "Domingos", "Terças e quintas", "Todos os dias", "Toda 1ª sexta-feira do mês" */
export function textoRegra(r: RegraRepeticao): string {
  if (r.repete === 'mensal') {
    const d = r.dias[0] ?? 0;
    const fem = d >= 1 && d <= 5;
    return `${fem ? 'Toda' : 'Todo'} ${ordinal(r.semana ?? 1, d)} do mês`;
  }
  const ds = [...new Set(r.dias)].sort((a, b) => a - b);
  if (ds.length === 7) return 'Todos os dias';
  // três ou mais dias seguidos: "Segunda a sexta"
  if (ds.length >= 3 && ds.every((x, i) => i === 0 || x === ds[i - 1] + 1)) return maiuscula(`${DIA[ds[0]]} a ${DIA[ds[ds.length - 1]]}`);
  return maiuscula(juntarE(ds.map((d) => DIA_PLURAL[d])));
}

/** A rotina (ou o lembrete) cai neste dia? (AAAA-MM-DD) */
export function caiNoDia(r: RegraRepeticao, iso: string): boolean {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d, 12));
  if (!r.dias.includes(data.getUTCDay())) return false;
  if (r.repete === 'semanal') return true;
  const semana = r.semana ?? 1;
  if (semana === -1) return d + 7 > new Date(Date.UTC(a, m, 0)).getUTCDate(); // a última do mês
  return Math.ceil(d / 7) === semana;
}

/** Início e fim de uma rotina num dia (horário de Recife); `hora`: outro horário (remarcada), com a mesma duração */
export function horarioNoDia(r: Rotina, iso: string, hora = r.hora): { inicio: Date; fim: Date } {
  const base = new Date(`${iso}T${r.hora}:00-03:00`);
  let dur = r.fim ? new Date(`${iso}T${r.fim}:00-03:00`).getTime() - base.getTime() : 3600_000;
  if (dur <= 0) dur = 3600_000;
  const inicio = new Date(`${iso}T${hora}:00-03:00`);
  return { inicio, fim: new Date(inicio.getTime() + dur) };
}

const somaDias = (iso: string, n: number) => {
  const [a, m, d] = iso.split('-').map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n, 12));
  return x.toISOString().slice(0, 10);
};

export interface Ocorrencia {
  rotina: Rotina;
  data: string; // AAAA-MM-DD
  inicio: Date;
  fim: Date;
  /** cancelado: não acontece neste dia; remarcado: o dia original, que mudou para `novo`; remarcada: o novo horário
   *  (veio do dia `original`) */
  situacao?: 'cancelado' | 'remarcado' | 'remarcada';
  novo?: { data: string; hora: string };
  original?: string;
  /** a exceção do dia (motivo, aviso e evento que ocupou o horário) */
  excecao?: ExcecaoRotina;
}

/** Ocorrências entre duas datas (inclusive), em ordem de horário, já com os cancelamentos e as mudanças de um dia */
export function ocorrencias(rs: Rotina[], de: string, ate: string, excecoes: ExcecaoRotina[] = []): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  const ex = new Map(excecoes.map((e) => [`${e.rotina}|${e.data}`, e]));
  for (let dia = de, n = 0; dia <= ate && n < 400; dia = somaDias(dia, 1), n++)
    for (const r of rs) {
      if (r.ativa === false || !caiNoDia(r, dia)) continue;
      const e = ex.get(`${r.id}|${dia}`);
      const o: Ocorrencia = { rotina: r, data: dia, ...horarioNoDia(r, dia) };
      if (e?.situacao === 'cancelado') o.situacao = 'cancelado';
      else if (e?.situacao === 'remarcado' && e.novaData && e.novaHora) {
        o.situacao = 'remarcado';
        o.novo = { data: e.novaData, hora: e.novaHora };
      }
      if (o.situacao) o.excecao = e;
      out.push(o);
    }
  // o novo horário das remarcadas que cai no intervalo
  const porId = new Map(rs.map((r) => [r.id, r]));
  for (const e of excecoes) {
    const r = porId.get(e.rotina);
    if (!r || r.ativa === false || e.situacao !== 'remarcado' || !e.novaData || !e.novaHora || e.novaData < de || e.novaData > ate) continue;
    if (!caiNoDia(r, e.data)) continue; // a exceção é de um dia em que a rotina nem acontece mais
    out.push({ rotina: r, data: e.novaData, ...horarioNoDia(r, e.novaData, e.novaHora), situacao: 'remarcada', original: e.data, excecao: e });
  }
  return out.sort((x, y) => x.inicio.getTime() - y.inicio.getTime());
}

/** O aviso de um cancelamento ou mudança: o ligado à exceção ou, nas antigas (antes da 0.6.15, sem ligação), o aviso
 *  com o título da rotina que vence no dia (é o que "Cancelar só este dia" publica) */
export function avisoDaExcecao(e: ExcecaoRotina | undefined, r: Rotina, avisos: Aviso[]): Aviso | undefined {
  if (!e) return undefined;
  if (e.aviso) return avisos.find((a) => a.id === e.aviso);
  if (e.motivo) return undefined;
  const dias = [e.data, e.novaData].filter(Boolean);
  const dia = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return avisos.find((a) => a.titulo.trim().toLowerCase() === r.titulo.trim().toLowerCase() && !!a.venceEm && dias.includes(dia(a.venceEm)));
}

/** "ter. 10/11, 19h" */
export function diaHoraCurtos(iso: string, hora: string) {
  const [a, m, d] = iso.split('-').map(Number);
  const sem = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'][new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay()];
  return `${sem} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}, ${horaCurta(hora)}`;
}

/** Na Agenda, as comissões entram só as marcadas em "Sua comissão" (['*'] = todas); as outras rotinas, sempre */
export function rotinasDaAgenda(rs: Rotina[] | undefined, suasComissoes: string[]): Rotina[] {
  const todas = suasComissoes.includes('*');
  return (rs ?? []).filter((r) => r.ativa !== false && (r.tipo !== 'comissao' || todas || (!!r.comissao && suasComissoes.includes(r.comissao))));
}

/** Nomes das comissões que têm horário cadastrado (para "Sua comissão"), em ordem alfabética */
export function nomesComissoes(rs: Rotina[] | undefined): string[] {
  const nomes = new Set((rs ?? []).filter((r) => r.tipo === 'comissao' && r.comissao).map((r) => r.comissao!.trim()));
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** "Nenhuma", "Todas", "Música", "Música e Liturgia" */
export function textoSuasComissoes(suas: string[]): string {
  if (suas.includes('*')) return 'Todas';
  if (!suas.length) return 'Nenhuma';
  return juntarE(suas);
}

export interface LinhaRotinas {
  chave: string;
  titulo: string;
  tipo: TipoRotina;
  comissao?: string | null;
  quando: string; // "Domingos, 11h e 17h30"
  local?: string | null;
  endereco?: string | null;
  lat?: number | null;
  lng?: number | null;
  obs: string[];
  rotinas: Rotina[];
}

/** Página "Horários e encontros": por tipo; rotinas iguais em horários diferentes viram uma linha só */
export function agruparRotinas(rs: Rotina[] | undefined, so?: TipoRotina): { tipo: TipoRotina; linhas: LinhaRotinas[] }[] {
  const porChave = new Map<string, LinhaRotinas>();
  const ordenadas = [...(rs ?? [])]
    .filter((r) => r.ativa !== false && (!so || r.tipo === so))
    .sort((a, b) => (a.ordem ?? 50) - (b.ordem ?? 50) || a.hora.localeCompare(b.hora));
  for (const r of ordenadas) {
    const chave = [r.tipo, r.titulo, r.comissao ?? '', r.local ?? '', r.repete, [...r.dias].sort().join(','), r.semana ?? ''].join('|');
    let l = porChave.get(chave);
    if (!l) {
      l = { chave, titulo: r.titulo, tipo: r.tipo, comissao: r.comissao, quando: '', local: r.local, endereco: r.endereco, lat: r.lat, lng: r.lng, obs: [], rotinas: [] };
      porChave.set(chave, l);
    }
    l.rotinas.push(r);
    if (r.obs && !l.obs.includes(r.obs)) l.obs.push(r.obs);
    if (!l.endereco && r.endereco) l.endereco = r.endereco;
    if (l.lat == null && r.lat != null) {
      l.lat = r.lat;
      l.lng = r.lng;
    }
  }
  for (const l of porChave.values()) {
    // com o término: "Domingos, 11h às 12h30 e 17h30 às 19h"
    const faixas = [...new Map([...l.rotinas].sort((a, b) => a.hora.localeCompare(b.hora)).map((r) => [faixaHoras(r.hora, r.fim), true])).keys()];
    l.quando = `${textoRegra(l.rotinas[0])}, ${juntarE(faixas)}`;
  }
  const grupos = TIPOS_ROTINA.map((tipo) => ({
    tipo,
    linhas: [...porChave.values()]
      .filter((l) => l.tipo === tipo)
      .sort((a, b) => (tipo === 'comissao' ? (a.comissao ?? '').localeCompare(b.comissao ?? '', 'pt-BR') : 0)),
  }));
  return grupos.filter((g) => g.linhas.length);
}
