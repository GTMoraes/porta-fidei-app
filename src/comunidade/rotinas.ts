// Rotinas da Comunidade: horários fixos que se repetem (missas da semana, adoração, grupos de oração, reuniões das
// comissões), cadastrados na Administração › Rotinas. Diferentes dos eventos pontuais da Agenda.
// Aqui: os dias em que cada uma cai, o texto da repetição ("Segunda a sexta", "Toda 1ª sexta-feira do mês"),
// o agrupamento da página "Horários e encontros" e o filtro da Agenda ("Sua comissão").
// Os horários são os de Recife (UTC-3, sem horário de verão), como os eventos do servidor.

import type { RegraRepeticao, Rotina, TipoRotina } from '@/servidor/api';

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

/** Início e fim de uma rotina num dia (horário de Recife) */
export function horarioNoDia(r: Rotina, iso: string): { inicio: Date; fim: Date } {
  const inicio = new Date(`${iso}T${r.hora}:00-03:00`);
  let fim = r.fim ? new Date(`${iso}T${r.fim}:00-03:00`) : new Date(inicio.getTime() + 3600_000);
  if (fim <= inicio) fim = new Date(inicio.getTime() + 3600_000);
  return { inicio, fim };
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
}

/** Ocorrências entre duas datas (inclusive), em ordem de horário */
export function ocorrencias(rs: Rotina[], de: string, ate: string): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  for (let dia = de, n = 0; dia <= ate && n < 400; dia = somaDias(dia, 1), n++)
    for (const r of rs) if (r.ativa !== false && caiNoDia(r, dia)) out.push({ rotina: r, data: dia, ...horarioNoDia(r, dia) });
  return out.sort((x, y) => x.inicio.getTime() - y.inicio.getTime());
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
      l = { chave, titulo: r.titulo, tipo: r.tipo, comissao: r.comissao, quando: '', local: r.local, endereco: r.endereco, obs: [], rotinas: [] };
      porChave.set(chave, l);
    }
    l.rotinas.push(r);
    if (r.obs && !l.obs.includes(r.obs)) l.obs.push(r.obs);
    if (!l.endereco && r.endereco) l.endereco = r.endereco;
  }
  for (const l of porChave.values()) {
    const horas = [...new Set(l.rotinas.map((r) => r.hora))].sort();
    l.quando = `${textoRegra(l.rotinas[0])}, ${juntarE(horas.map(horaCurta))}`;
  }
  const grupos = TIPOS_ROTINA.map((tipo) => ({
    tipo,
    linhas: [...porChave.values()]
      .filter((l) => l.tipo === tipo)
      .sort((a, b) => (tipo === 'comissao' ? (a.comissao ?? '').localeCompare(b.comissao ?? '', 'pt-BR') : 0)),
  }));
  return grupos.filter((g) => g.linhas.length);
}
