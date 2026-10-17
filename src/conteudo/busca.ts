// Busca no app inteiro: títulos (instantâneo) e dentro dos textos do conteúdo litúrgico (varredura).

import { COMUNS, MISSAL_FIXO, ORACOES, RITUAIS, ROSARIO } from '@/conteudo/catalogo';
import { existe, lerBruto, tituloDe, todosOsArquivos } from '@/conteudo/pacote';
import { SANTOS } from '@/liturgia/santos';

export const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Cada caractere vira sua letra base minúscula; pontuação vira espaço (mantém as posições) */
const base = (t: string) =>
  Array.from(t, (ch) => {
    const b = ch.normalize('NFD').charAt(0).toLowerCase();
    return /[a-z0-9]/.test(b) ? b : ' ';
  }).join('');
const chave = (t: string) => base(t).replace(/ +/g, ' ').trim();

export const semTags = (h: string) =>
  h
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const HORA: Record<string, string> = {
  invitatorio: 'Invitatório',
  leituras: 'Ofício das Leituras',
  laudes: 'Laudes',
  terca: 'Terça',
  sexta: 'Sexta',
  nona: 'Nona',
  vesperas: 'Vésperas',
  completas: 'Completas',
  ivesperas: 'I Vésperas',
};
const DIA: Record<string, string> = { domingo: 'Domingo', segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado' };
const TEMPO: Record<string, string> = {
  tempocomum: 'Tempo Comum',
  advento: 'Advento',
  natal: 'Natal',
  quaresma: 'Quaresma',
  pascoa: 'Páscoa',
  proprio: 'Próprio dos santos',
  outros: 'Orações',
  invitatorio: 'Invitatório',
};
const PASTA: Record<string, string> = {
  lecionario: 'Lecionário',
  comentarios: 'Comentários',
  evangelho: 'Evangelho',
  missal: 'Missal',
  salmos: 'Salmos',
  salterio: 'Saltério',
  santos: 'Santos',
  rosario: 'Rosário',
  catequeses: 'Catequeses',
};

let titulos: Map<string, string> | null = null;
let santos: Map<string, string> | null = null;

function mapas() {
  if (titulos && santos) return { titulos, santos };
  titulos = new Map();
  santos = new Map();
  for (const g of [...ORACOES, ...RITUAIS, ...COMUNS, ...MISSAL_FIXO, ...ROSARIO]) for (const i of g.itens) titulos.set(i.arquivo.split('#')[0], i.titulo);
  for (const l of Object.values(SANTOS)) for (const s of l) if (s.slug) santos.set(s.slug, s.nome);
  titulos.set('IGLH', 'Instrução Geral da Liturgia das Horas');
  titulos.set('instrucao', 'Como rezar a Liturgia das Horas');
  titulos.set('bienal', 'Leituras do ciclo bienal');
  return { titulos, santos };
}

const humano = (s: string) =>
  s
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (x) => x.toUpperCase());

/** Nome legível de um arquivo do pacote */
export function nomeDoArquivo(arquivo: string): { titulo: string; onde: string } {
  const { titulos: t, santos: s } = mapas();
  const partes = arquivo.split('/');
  const fim = partes[partes.length - 1];
  const pasta = partes[0];
  const onde = pasta === 'oficio' ? TEMPO[partes[1]] ?? 'Liturgia das Horas' : PASTA[pasta] ?? '';
  if (t.has(arquivo)) return { titulo: t.get(arquivo)!, onde: onde || (partes.length === 1 ? 'Liturgia das Horas' : 'Orações') };
  if (s.has(fim)) return { titulo: s.get(fim)!, onde: pasta === 'missal' ? 'Missal' : pasta === 'santos' ? 'Santo do dia' : onde };
  const sm = fim.match(/^(\d+)(domingo|segunda|terca|quarta|quinta|sexta|sabado)([A-Z]{2})?$/);
  const SIGLA: Record<string, string> = { AD: 'do Advento', TC: 'do Tempo Comum', QA: 'da Quaresma', PA: 'da Páscoa', NA: 'do Natal' };
  if (sm)
    return {
      titulo: (sm[2] === 'domingo' ? `${sm[1]}º Domingo ` : `${DIA[sm[2]]} da ${sm[1]}ª semana `) + (sm[3] ? SIGLA[sm[3]] ?? '' : ''),
      onde: pasta === 'missal' ? 'Missal' : onde,
    };
  if (pasta === 'missal') return { titulo: humano(fim), onde: `Missal${partes[2] ? ` · ${TEMPO[partes[2]] ?? humano(partes[2])}` : ''}` };
  if (pasta === 'lecionario' || pasta === 'comentarios' || pasta === 'evangelho') {
    const livros = [...new Set(fim.match(/[1-3]?[A-Z][a-z]*/g) ?? [])].join(', ');
    return { titulo: `${PASTA[pasta]}${livros ? `: ${livros}` : ''}`, onde: pasta === 'comentarios' ? 'Liturgia Diária' : 'Leituras da Missa' };
  }
  const hs = fim.match(/^([a-z]+)_([a-z]+)$/);
  if (hs && HORA[hs[2]]) return { titulo: `${HORA[hs[2]]} · ${s.get(hs[1]) ?? humano(hs[1])}`, onde };
  const h = fim.match(/^(\d)(domingo|segunda|terca|quarta|quinta|sexta|sabado)_(\w+)$/);
  if (h) return { titulo: `${HORA[h[3].toLowerCase()] ?? humano(h[3])} · ${DIA[h[2]]}, semana ${'I'.repeat(Number(h[1])).replace('IIII', 'IV')}`, onde };
  const m = tituloDe(arquivo);
  if (m && !m.startsWith('<') && m.length > 3 && !/^Ant[íi]fona/.test(m)) return { titulo: m, onde };
  return { titulo: humano(fim), onde };
}

// ---------------------------------------------------------------- varredura dos textos
// Na primeira busca o texto de cada arquivo é lido e guardado normalizado; as seguintes são rápidas.
const corpus = new Map<string, string>();

export interface Achado {
  arquivo: string;
  titulo: string;
  onde: string;
  trecho: string;
}

/** Trecho em volta da primeira ocorrência (com acentos, lido de novo do arquivo) */
async function trechoDe(arquivo: string, termo: string): Promise<string> {
  const txt = semTags((await lerBruto(arquivo)) ?? '');
  const palavras = chave(termo).split(' ').filter(Boolean);
  if (!palavras.length) return '';
  const m = new RegExp(palavras.join(' +')).exec(base(txt));
  if (!m) return '';
  const ini = Math.max(0, m.index - 50);
  return (ini > 0 ? '…' : '') + txt.slice(ini, m.index + m[0].length + 80).trim() + '…';
}

export async function buscarNosTextos(
  termo: string,
  progresso: (feito: number, total: number, achados: Achado[]) => void,
  cancelado: () => boolean,
  limite = 80,
): Promise<Achado[]> {
  const q = chave(termo);
  const lista = todosOsArquivos().filter((a) => !a.startsWith('catequeses/'));
  const achados: Achado[] = [];
  const LOTE = 40;
  for (let i = 0; i < lista.length; i += LOTE) {
    if (cancelado()) break;
    const lote = lista.slice(i, i + LOTE);
    await Promise.all(
      lote.map(async (a) => {
        let n = corpus.get(a);
        if (n == null) {
          n = chave(semTags((await lerBruto(a)) ?? ''));
          corpus.set(a, n);
        }
        if (achados.length < limite && n.includes(q)) {
          const nome = nomeDoArquivo(a);
          achados.push({ arquivo: a, titulo: nome.titulo, onde: nome.onde, trecho: '' });
        }
      }),
    );
    progresso(Math.min(i + LOTE, lista.length), lista.length, achados);
    if (achados.length >= limite) break;
  }
  // trechos só dos encontrados
  for (const a of achados) a.trecho = await trechoDe(a.arquivo, termo);
  return achados;
}

export const textoJaLido = () => corpus.size > 0;
export { existe };
