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

/** Nomes dos salmos (salmos.json do pacote): "Salmo 22(23) · O Bom Pastor" */
export function registrarSalmos(l: { arquivo: string; ref: string; tema: string }[]) {
  const { titulos: t } = mapas();
  for (const s of l) t.set(s.arquivo, s.tema ? `${s.ref} · ${s.tema}` : s.ref);
}

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

/** "Salmo 22(23)": a numeração da Liturgia segue a grega; entre parênteses vem a hebraica, que muitas Bíblias usam */
export const comNumeracaoHebraica = (t: string) => t.replace(/(Salmo|Sl)\s*(\d+)\s*\((\d+)[^)]*\)/gi, (m, s, g, h) => `${m} ${s} ${h} ${s} ${g}`);

// ---------------------------------------------------------------- busca aproximada
// Para quando a pessoa lembra o texto de outra tradução ("O Senhor é o meu pastor, nada me faltará"):
// procura trechos curtos que tenham a maior parte das palavras importantes, em qualquer ordem.
const VAZIAS = new Set(['que', 'nos', 'das', 'dos', 'com', 'por', 'sem', 'mas', 'nem', 'uma', 'uns', 'meu', 'teu', 'seu', 'sua', 'ele', 'ela', 'lhe', 'vos', 'aos', 'nao', 'sim', 'ser', 'foi', 'era', 'para', 'pelo', 'pela', 'pelos', 'pelas', 'como', 'mais', 'muito', 'esta', 'este', 'isso', 'esse', 'essa', 'aquele', 'aquela', 'quem', 'qual', 'quando', 'onde', 'porque', 'pois', 'tudo', 'todo', 'toda', 'todos', 'todas', 'seus', 'suas', 'meus', 'minhas', 'nossa', 'nosso', 'vossa', 'vosso', 'sobre', 'entre', 'depois', 'antes', 'ainda', 'sera', 'sao', 'estao', 'foram', 'seja', 'tem', 'teu', 'tua']);
const raiz = (p: string) => (p.length > 6 ? p.slice(0, Math.max(5, p.length - 3)) : p.slice(0, 5));
export const palavrasChave = (termo: string) => [...new Set(chave(termo).split(' ').filter((p) => p.length >= 3 && !VAZIAS.has(p)).map(raiz))];

export async function buscarParecidos(termo: string, cancelado: () => boolean, ignorar: Set<string>, limite = 30): Promise<Achado[]> {
  const raizes = palavrasChave(termo);
  if (raizes.length < 2) return [];
  const minimo = Math.max(2, Math.ceil(raizes.length * 0.7));
  const JANELA = 220;
  const pontos: { a: string; nota: number; pos: number }[] = [];
  let i = 0;
  for (const [a, n] of corpus) {
    if (++i % 300 === 0) {
      await new Promise((r) => setTimeout(r, 0));
      if (cancelado()) return [];
    }
    if (ignorar.has(a)) continue;
    // posições da raiz mais rara primeiro (corta cedo os textos que não têm nada)
    const presentes = raizes.filter((r) => n.includes(r));
    if (presentes.length < minimo) continue;
    // a raiz mais rara no texto serve de âncora; em volta dela, conta quantas raízes aparecem e quão juntas
    const ancora = presentes.reduce((x, y) => (n.split(x).length <= n.split(y).length ? x : y));
    let melhor = 0;
    let onde = -1;
    let voltas = 0;
    for (let p = n.indexOf(ancora); p >= 0 && voltas < 200; p = n.indexOf(ancora, p + 1), voltas++) {
      const ini = Math.max(0, p - JANELA);
      const trecho = n.slice(ini, p + JANELA);
      const pos = presentes.map((r) => trecho.indexOf(r)).filter((x) => x >= 0);
      if (pos.length < minimo) continue;
      const espalhado = Math.max(...pos) - Math.min(...pos);
      const nota = pos.length * 1000 - espalhado;
      if (nota > melhor) {
        melhor = nota;
        onde = ini + Math.min(...pos);
      }
    }
    // o texto do próprio salmo vem antes das horas e leituras que o citam
    if (melhor >= minimo * 1000 - 2 * JANELA) pontos.push({ a, nota: melhor + (a.startsWith('salmos/') ? 1200 : 0), pos: onde });
  }
  pontos.sort((x, y) => y.nota - x.nota);
  const out: Achado[] = [];
  const vistos = new Set<string>();
  for (const p of pontos) {
    if (out.length >= limite) break;
    const nome = nomeDoArquivo(p.a);
    const txt = semTags((await lerBruto(p.a)) ?? '');
    const b = base(txt);
    // acha no texto original a primeira raiz perto da posição encontrada
    // o texto guardado tem os espaços colapsados; a posição no original fica um pouco à frente
    let k = -1;
    for (const r of raizes) {
      const j = b.indexOf(r, Math.max(0, p.pos - 40));
      if (j >= 0 && (k < 0 || j < k)) k = j;
    }
    const ini = Math.max(0, (k < 0 ? 0 : k) - 30);
    const trecho = txt.slice(ini, ini + 160).trim();
    // o mesmo trecho aparece em muitas horas (o salmo se repete): mostra uma vez só
    const marca = chave(trecho).slice(0, 70);
    if (vistos.has(marca)) continue;
    vistos.add(marca);
    out.push({ arquivo: p.a, titulo: nome.titulo, onde: nome.onde, trecho: (ini > 0 ? '…' : '') + trecho + '…' });
  }
  return out;
}
export { existe };
