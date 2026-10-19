// Abrir um item dos catálogos (orações, rituais, Confissão...) de qualquer lugar: listas, busca, índice, favoritos.

import type { useRouter } from 'expo-router';
type Router = ReturnType<typeof useRouter>;

import type { Item } from './catalogo';
import { existe } from './pacote';

/** O item pode ser aberto? (texto no pacote instalado, ou tela/lista do próprio app) */
export const disponivel = (i: Item) => i.arquivo.startsWith('@') || existe(i.arquivo.split('#')[0]);

export function abrirItem(router: Router, i: Item) {
  if (i.arquivo === '@app:exame') return router.push('/exame');
  if (i.arquivo.startsWith('@lista:')) return router.push({ pathname: '/lista', params: { tipo: i.arquivo.slice(7) } });
  if (i.arquivo.startsWith('@pasta:')) return router.push({ pathname: '/lista', params: { tipo: 'missal-proprio', pasta: i.arquivo.slice(7) } });
  if (i.arquivo.startsWith('@prefacio:')) return router.push({ pathname: '/lista', params: { tipo: 'missal-proprio', pasta: `prefacio-${i.arquivo.slice(10)}` } });
  const [arquivo, desde] = i.arquivo.split('#');
  router.push({ pathname: '/texto', params: { arquivo, titulo: i.titulo, desde: desde ?? '', ate: desde ? 'Ant.' : '' } });
}
