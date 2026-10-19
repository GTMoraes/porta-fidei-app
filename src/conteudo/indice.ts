// Todos os itens dos catálogos num lugar só, cada um com os caminhos onde aparece no app.
// Usado pelo Índice de A a Z e pela busca.

import { COMUNS, CONFISSAO, MISSAL_FIXO, ORACOES, RITUAIS, ROSARIO, type Grupo, type Item } from './catalogo';

export interface Entrada extends Item {
  caminhos: string[]; // ex.: "Orações › Nossa Senhora"
}

const FONTES: [string, Grupo[]][] = [
  ['Orações', ORACOES],
  ['Confissão', CONFISSAO],
  ['Santo Rosário', ROSARIO],
  ['Rituais e bênçãos', RITUAIS],
  ['Comuns e ofícios votivos', COMUNS],
  ['Missal', MISSAL_FIXO],
];

let cache: Entrada[] | null = null;
export function todasAsEntradas(): Entrada[] {
  if (cache) return cache;
  const porArquivo = new Map<string, Entrada>();
  for (const [nome, grupos] of FONTES)
    for (const g of grupos)
      for (const i of g.itens) {
        const caminho = g.titulo && g.titulo !== nome ? `${nome} › ${g.titulo}` : nome;
        const ja = porArquivo.get(i.arquivo);
        if (ja) {
          if (!ja.caminhos.includes(caminho)) ja.caminhos.push(caminho);
          if (!ja.alias && i.alias) ja.alias = i.alias;
        } else porArquivo.set(i.arquivo, { ...i, caminhos: [caminho] });
      }
  cache = [...porArquivo.values()];
  return cache;
}

export const semAcento = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Onde o item está, para mostrar embaixo do título (ex.: "Rezar › Orações › Nossa Senhora") */
export const ondeEsta = (e: Entrada) => e.caminhos.map((c) => `Rezar › ${c}`).join('  ·  ');
