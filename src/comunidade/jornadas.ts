// Jornadas de oração (novenas, Quaresma de São Miguel, Cerco de Jericó): período, dia atual e
// marcação "Rezei hoje", guardada só no aparelho.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { somaDias } from '@/liturgia/calendario';
import type { Jornada } from '@/servidor/api';

export interface Periodo {
  inicio: string;
  fim: string;
}

/** Período desta edição (anual: a deste ano; se já passou, a do próximo) */
export function periodo(j: Jornada, hoje: string): Periodo | null {
  if (!j.inicioBase) return null;
  let inicio = j.inicioBase;
  if (j.anual) {
    const ano = Number(hoje.slice(0, 4));
    inicio = `${ano}${j.inicioBase.slice(4)}`;
    if (somaDias(inicio, j.dias - 1) < hoje) inicio = `${ano + 1}${j.inicioBase.slice(4)}`;
  }
  return { inicio, fim: somaDias(inicio, j.dias - 1) };
}

const diasEntre = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400_000);

/** Dia da jornada em que estamos (1..N) ou null fora do período */
export function diaAtual(j: Jornada, hoje: string): number | null {
  const p = periodo(j, hoje);
  if (!p || hoje < p.inicio || hoje > p.fim) return null;
  return diasEntre(p.inicio, hoje) + 1;
}

export const dataDoDia = (p: Periodo, n: number) => somaDias(p.inicio, n - 1);

export const temTexto = (j: Jornada) => !!(j.arquivo || j.oracao || j.comum?.trim() || j.textos?.some((t) => t?.trim()));

/** Jornadas ativas com texto que acontecem hoje */
export const jornadasDeHoje = (lista: Jornada[] | undefined, hoje: string) =>
  (lista ?? []).filter((j) => j.ativa && temTexto(j) && diaAtual(j, hoje) != null);

// ---------------------------------------------------------------- "Rezei hoje"
const CHAVE = 'pf.jornadas.v1';
type Feitos = Record<string, string[]>; // `${id}@${inicio}` -> datas rezadas
let feitos: Feitos = {};
const ouvintes = new Set<() => void>();
let carregado = false;

async function carregar() {
  if (carregado) return;
  carregado = true;
  try {
    const b = await AsyncStorage.getItem(CHAVE);
    if (b) feitos = JSON.parse(b);
  } catch {}
  ouvintes.forEach((f) => f());
}

const chave = (j: Jornada, p: Periodo) => `${j.id}@${p.inicio}`;

export function useFeitos(): Feitos {
  carregar();
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => feitos,
  );
}

export const diasFeitos = (f: Feitos, j: Jornada, p: Periodo) => f[chave(j, p)] ?? [];

export function marcar(j: Jornada, p: Periodo, data: string, feito: boolean) {
  const k = chave(j, p);
  const atual = new Set(feitos[k] ?? []);
  if (feito) atual.add(data);
  else atual.delete(data);
  feitos = { ...feitos, [k]: [...atual].sort() };
  // limpa edições antigas (mais de um ano)
  const limite = somaDias(data, -400);
  for (const key of Object.keys(feitos)) if (key.split('@')[1] < limite) delete feitos[key];
  ouvintes.forEach((f) => f());
  AsyncStorage.setItem(CHAVE, JSON.stringify(feitos)).catch(() => {});
}
