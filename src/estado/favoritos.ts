// Favoritos (estrela no texto) e abertos recentemente, só neste aparelho. Os favoritos ficam no Rezar; os
// recentes, na tela de busca. Além dos textos do pacote, guardam as orações, propostas e jornadas da
// Comunidade (arquivo "@oracao:<id>", "@proposta:<id>", "@jornada:<id>"), que abrem pelas telas delas.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';

export interface ItemSalvo {
  arquivo: string;
  titulo: string;
  desde?: string;
  ate?: string;
}
type Estado = { favoritos: ItemSalvo[]; recentes: ItemSalvo[] };

const CHAVE = 'pf.favoritos.v1';
const MAX_RECENTES = 6;
let estado: Estado = { favoritos: [], recentes: [] };
let iniciado = false;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());
const salvar = () => AsyncStorage.setItem(CHAVE, JSON.stringify(estado)).catch(() => {});
const mesmo = (a: ItemSalvo, b: ItemSalvo) => a.arquivo === b.arquivo && (a.desde ?? '') === (b.desde ?? '');

function carregar() {
  if (iniciado) return;
  iniciado = true;
  AsyncStorage.getItem(CHAVE)
    .then((b) => {
      if (b) estado = { favoritos: [], recentes: [], ...JSON.parse(b) };
    })
    .catch(() => {})
    .finally(emitir);
}

export function useSalvos(): Estado {
  carregar();
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
  );
}

export const ehFavorito = (e: Estado, i: ItemSalvo) => e.favoritos.some((x) => mesmo(x, i));

export function alternarFavorito(i: ItemSalvo) {
  const ja = ehFavorito(estado, i);
  estado = { ...estado, favoritos: ja ? estado.favoritos.filter((x) => !mesmo(x, i)) : [...estado.favoritos, i] };
  salvar();
  emitir();
  return !ja;
}

export function registrarRecente(i: ItemSalvo) {
  if (!i.arquivo || !i.titulo) return;
  carregar();
  estado = { ...estado, recentes: [i, ...estado.recentes.filter((x) => !mesmo(x, i))].slice(0, MAX_RECENTES) };
  salvar();
  emitir();
}

export function limparRecentes() {
  estado = { ...estado, recentes: [] };
  salvar();
  emitir();
}

/** Item de favorito/recente para uma oração, proposta ou jornada da Comunidade */
export const itemComunidade = (tipo: 'oracao' | 'proposta' | 'jornada', id: string, titulo: string): ItemSalvo => ({ arquivo: `@${tipo}:${id}`, titulo });

/** Abre um favorito ou recente: textos do pacote no leitor; o que é da Comunidade, na tela dela */
export function abrirSalvo(i: ItemSalvo) {
  const m = /^@(oracao|proposta|jornada):(.+)$/.exec(i.arquivo);
  if (m) {
    router.push({ pathname: `/${m[1]}` as '/oracao', params: { id: m[2] } });
    return;
  }
  router.push({ pathname: '/texto', params: { arquivo: i.arquivo, titulo: i.titulo, desde: i.desde ?? '', ate: i.ate ?? '' } });
}
