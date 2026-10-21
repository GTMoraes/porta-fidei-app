// Links para partes do próprio app ("Tela do app" nos botões de eventos e avisos).
// Formato: portafidei://ir?d=<destino>&... ; funciona dentro do app e também aberto de fora
// (ex.: mandado por WhatsApp), pela rota /ir.
// Ao tocar, faz o mesmo que o toque normal naquela parte do app: as horas abrem a do dia
// (as Completas depois da meia-noite são as do dia que está terminando), a proposta é a atual etc.

import { router } from 'expo-router';

import { ORACOES, ROSARIO } from '@/conteudo/catalogo';
import { hojeIso } from '@/liturgia/calendario';
import { HORAS } from '@/liturgia/horas';
import type { Aviso, Comunidade, Evento } from '@/servidor/api';
import { dataCurta } from './datas';

export const PREFIXO = 'portafidei://ir?';
export const ehLinkDoApp = (url: string) => /^portafidei:\/\//i.test(url.trim());

export function montarLink(p: Record<string, string>) {
  return PREFIXO + Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}
export function lerLink(url: string): Record<string, string> {
  const q = url.trim().split('?')[1] ?? '';
  const p: Record<string, string> = {};
  for (const par of q.split('&')) {
    if (!par) continue;
    const [k, ...v] = par.split('=');
    try {
      p[decodeURIComponent(k)] = decodeURIComponent(v.join('='));
    } catch {}
  }
  return p;
}

/** Para onde o link leva (rota do app), calculado na hora do toque */
export function rotaDoLink(p: Record<string, string>): { aba?: boolean; pathname: string; params?: Record<string, string> } | null {
  switch (p.d) {
    case 'hoje':
      return { aba: true, pathname: '/' };
    case 'rezar':
      return { aba: true, pathname: '/orar' };
    case 'agenda':
      return { aba: true, pathname: '/agenda', params: { aba: 'agenda' } };
    case 'avisos':
      return { aba: true, pathname: '/agenda', params: { aba: 'avisos' } };
    case 'hora': {
      // sem data: a tela da hora escolhe a do dia (e as Completas da madrugada, as do dia anterior)
      return p.h ? { pathname: '/hora', params: { h: p.h } } : null;
    }
    case 'liturgia':
      return { pathname: '/liturgia' };
    case 'lista':
      return p.tipo ? { pathname: '/lista', params: p.pasta ? { tipo: p.tipo, pasta: p.pasta } : { tipo: p.tipo } } : null;
    case 'exame':
      return { pathname: '/exame' };
    case 'texto': {
      if (!p.arquivo) return null;
      // itens dos catálogos que não são texto do pacote (o exame completo, o Rosário...) ou que abrem
      // num trecho ("arquivo#âncora"): o mesmo caminho do toque normal na lista (conteudo/abrir.ts)
      const [arq, ancora] = p.arquivo.split('#');
      if (arq === '@app:exame') return { pathname: '/exame' };
      if (arq.startsWith('@lista:')) return { pathname: '/lista', params: { tipo: arq.slice(7) } };
      if (arq.startsWith('@pasta:')) return { pathname: '/lista', params: { tipo: 'missal-proprio', pasta: arq.slice(7) } };
      if (arq.startsWith('@prefacio:')) return { pathname: '/lista', params: { tipo: 'missal-proprio', pasta: `prefacio-${arq.slice(10)}` } };
      return { pathname: '/texto', params: { arquivo: arq, titulo: p.titulo ?? '', desde: ancora ?? '', ate: ancora ? 'Ant.' : '' } };
    }
    case 'proposta':
      return { pathname: '/proposta' };
    case 'propostas':
      return { pathname: '/propostas' };
    case 'jornadas':
      return { pathname: '/jornadas' };
    case 'jornada':
    case 'oracao':
    case 'evento':
    case 'aviso':
      return p.id ? { pathname: `/${p.d}`, params: { id: p.id } } : null;
    case 'calendario':
      return { pathname: '/calendario' };
    case 'dia':
      return { pathname: '/dia', params: { data: hojeIso() } };
    case 'martirologio':
      return { pathname: '/martirologio', params: { data: hojeIso() } };
    default:
      return null;
  }
}

/** Abre a parte do app que o link indica */
export function irPara(url: string) {
  const r = rotaDoLink(lerLink(url));
  if (!r) return;
  if (r.aba) router.navigate({ pathname: r.pathname as any, params: r.params });
  else router.push({ pathname: r.pathname as any, params: r.params });
}

export interface Destino {
  rotulo: string;
  sugestao: string; // texto sugerido para o botão
  link: string;
}
export interface GrupoDestinos {
  titulo: string;
  itens: Destino[];
}

/** Tudo o que dá para escolher como destino de um botão */
export function destinos(eventos: Evento[], avisos: Aviso[], comunidade?: Comunidade): GrupoDestinos[] {
  const g: GrupoDestinos[] = [
    {
      titulo: 'Abas',
      itens: [
        { rotulo: 'Hoje', sugestao: 'Ver o dia de hoje', link: montarLink({ d: 'hoje' }) },
        { rotulo: 'Rezar', sugestao: 'Rezar', link: montarLink({ d: 'rezar' }) },
        { rotulo: 'Agenda: Missas e eventos', sugestao: 'Ver missas e eventos', link: montarLink({ d: 'agenda' }) },
        { rotulo: 'Agenda: Avisos', sugestao: 'Ver avisos', link: montarLink({ d: 'avisos' }) },
      ],
    },
    {
      titulo: 'Liturgia das Horas (a do dia)',
      itens: HORAS.map((h) => ({ rotulo: h.nome, sugestao: `Rezar ${h.id === 'terca' || h.id === 'sexta' || h.id === 'nona' ? 'a ' + h.nome : h.id === 'invitatorio' || h.id === 'leituras' ? 'o ' + h.nome : h.id === 'completas' ? 'as Completas' : h.id === 'vesperas' ? 'as Vésperas' : 'as Laudes'}`, link: montarLink({ d: 'hora', h: h.id }) })),
    },
    {
      titulo: 'Oração',
      itens: [
        { rotulo: 'Liturgia Diária', sugestao: 'Ler a liturgia do dia', link: montarLink({ d: 'liturgia' }) },
        { rotulo: 'Proposta de Oração (a atual)', sugestao: 'Ver a Proposta de Oração', link: montarLink({ d: 'proposta' }) },
        { rotulo: 'Propostas de oração (todas)', sugestao: 'Ver as Propostas de oração', link: montarLink({ d: 'propostas' }) },
        { rotulo: 'Jornadas de oração', sugestao: 'Ver as Jornadas de oração', link: montarLink({ d: 'jornadas' }) },
        { rotulo: 'Santo Rosário', sugestao: 'Rezar o Santo Rosário', link: montarLink({ d: 'lista', tipo: 'rosario' }) },
        ...ROSARIO.flatMap((gr) => gr.itens).map((i) => ({ rotulo: i.titulo, sugestao: `Rezar os ${i.titulo.toLowerCase()}`, link: montarLink({ d: 'texto', arquivo: i.arquivo, titulo: i.titulo }) })),
        { rotulo: 'Orações (lista)', sugestao: 'Ver as orações', link: montarLink({ d: 'lista', tipo: 'oracoes' }) },
      ],
    },
    {
      titulo: 'Calendário',
      itens: [
        { rotulo: 'Calendário litúrgico', sugestao: 'Ver o calendário litúrgico', link: montarLink({ d: 'calendario' }) },
        { rotulo: 'Dia litúrgico de hoje', sugestao: 'Ver o dia litúrgico', link: montarLink({ d: 'dia' }) },
        { rotulo: 'Santos de hoje (Martirológio)', sugestao: 'Ver os santos de hoje', link: montarLink({ d: 'martirologio' }) },
      ],
    },
  ];
  if (comunidade?.jornadas?.length)
    g.push({ titulo: 'Jornadas', itens: comunidade.jornadas.map((j) => ({ rotulo: j.titulo, sugestao: j.titulo, link: montarLink({ d: 'jornada', id: j.id }) })) });
  if (comunidade?.oracoes?.length)
    g.push({ titulo: 'Orações da Comunidade', itens: comunidade.oracoes.map((o) => ({ rotulo: o.titulo, sugestao: o.titulo, link: montarLink({ d: 'oracao', id: o.id }) })) });
  const futuros = eventos.filter((e) => new Date(e.fim ?? e.inicio).getTime() >= Date.now() - 3600_000);
  if (futuros.length)
    g.push({ titulo: 'Missas e eventos', itens: futuros.map((e) => ({ rotulo: `${e.titulo} · ${dataCurta(new Date(e.inicio))}`, sugestao: 'Ver evento', link: montarLink({ d: 'evento', id: e.id }) })) });
  if (avisos.length) g.push({ titulo: 'Avisos', itens: avisos.map((a) => ({ rotulo: a.titulo, sugestao: 'Ver aviso', link: montarLink({ d: 'aviso', id: a.id }) })) });
  for (const gr of ORACOES)
    g.push({ titulo: `Orações: ${gr.titulo}`, itens: gr.itens.map((i) => ({ rotulo: i.titulo, sugestao: `Rezar: ${i.titulo}`, link: montarLink({ d: 'texto', arquivo: i.arquivo, titulo: i.titulo }) })) });
  return g;
}

/** Nome do destino de um link (para mostrar no editor) */
export function nomeDestino(url: string, grupos: GrupoDestinos[]): string {
  const p = lerLink(url);
  for (const gr of grupos) for (const i of gr.itens) {
    const q = lerLink(i.link);
    if (Object.keys(q).length === Object.keys(p).length && Object.entries(q).every(([k, v]) => p[k] === v)) return i.rotulo;
  }
  return p.d === 'evento' ? 'Um evento (já passou ou foi apagado)' : p.d === 'aviso' ? 'Um aviso (apagado)' : 'Tela do app';
}
