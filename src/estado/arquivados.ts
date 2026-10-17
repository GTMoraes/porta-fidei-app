// Avisos arquivados por esta pessoa (só no aparelho). A chave inclui a data da última edição:
// se a coordenação corrigir o aviso, ele volta a aparecer.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Aviso } from '@/servidor/api';

const CHAVE = 'pf.avisos.arquivados.v1';
let lista = new Set<string>();
let carregado = false;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

async function carregar() {
  if (carregado) return;
  carregado = true;
  try {
    const b = await AsyncStorage.getItem(CHAVE);
    if (b) lista = new Set(JSON.parse(b));
  } catch {}
  emitir();
}

export const chaveAviso = (a: Aviso) => `${a.id}@${a.atualizado ?? a.criado}`;

export function useArquivados(): Set<string> {
  carregar();
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => lista,
  );
}

export function arquivar(a: Aviso, sim: boolean, existentes?: Aviso[]) {
  const n = new Set(lista);
  if (sim) n.add(chaveAviso(a));
  else for (const k of n) if (k.startsWith(a.id + '@')) n.delete(k);
  // esquece avisos que não existem mais no servidor
  if (existentes) {
    const vivos = new Set(existentes.map(chaveAviso));
    for (const k of n) if (!vivos.has(k) && k !== chaveAviso(a)) n.delete(k);
  }
  lista = n;
  emitir();
  AsyncStorage.setItem(CHAVE, JSON.stringify([...n])).catch(() => {});
}
