// Favoritos (estrela no texto) e abertos recentemente, só neste aparelho. Aparecem no topo do Rezar.

import AsyncStorage from '@react-native-async-storage/async-storage';
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
