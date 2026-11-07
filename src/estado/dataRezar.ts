// Data escolhida no Rezar (a folhinha no alto da aba). O que se abre pelo Rezar e depende do dia segue esta
// data: Liturgia das Horas, Liturgia Diária, Missal do dia, santos, proposta de oração e jornadas.
// Sem escolha, vale hoje. A escolha continua ao passar pelas outras abas (a Hoje mostra sempre hoje) e volta
// para hoje quando: o app é fechado (fica só na memória), o app passa mais de 5 minutos em segundo plano, o
// dia muda, ou a pessoa toca no card do dia na Hoje (`abrirRezarHoje`).

import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { hojeIso } from '@/liturgia/calendario';
import { dataParaHora } from '@/util/datas';

let escolha: { data: string; em: string; quando: number } | null = null;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => void ouvintes.delete(f);
};

/** Escolhe o dia do Rezar (escolher hoje é o mesmo que voltar para hoje) */
export function mudarDataRezar(data: string) {
  const hoje = hojeIso();
  escolha = data === hoje ? null : { data, em: hoje, quando: Date.now() };
  emitir();
}

/** Volta o Rezar para hoje */
export function resetarDataRezar() {
  if (!escolha) return;
  escolha = null;
  emitir();
}

// quem abre o Rezar num dia de propósito (calendário litúrgico, card do dia da Hoje) pede um destaque: o Rezar
// sobe para o topo e a folhinha pulsa, para a pessoa ver em que dia está (mesmo que seja hoje)
let destaque = false;
/** O Rezar foi aberto num dia de propósito? Lê e apaga o pedido (lido pelo Rezar ao aparecer) */
export function pegarDestaqueRezar() {
  const d = destaque;
  destaque = false;
  return d;
}

/** Card do dia na Hoje: abre o Rezar já em hoje */
export function abrirRezarHoje() {
  resetarDataRezar();
  destaque = true;
  router.navigate('/orar');
}

// mais de 5 minutos em segundo plano: na volta, o Rezar está de novo em hoje
const LIMITE_FORA = 5 * 60_000;
let saiuEm = 0;
AppState.addEventListener('change', (st) => {
  if (st === 'background') {
    if (!saiuEm) saiuEm = Date.now();
  } else if (st === 'active') {
    if (saiuEm && Date.now() - saiuEm > LIMITE_FORA) resetarDataRezar();
    saiuEm = 0;
  }
});

function lerEscolha(): string | null {
  // escolha feita num dia que já passou (app aberto de novo no dia seguinte): volta para hoje
  if (escolha && escolha.em !== hojeIso()) escolha = null;
  return escolha?.data ?? null;
}

export interface DataRezar {
  data: string; // AAAA-MM-DD: a escolhida ou hoje
  escolhida: boolean; // true quando não é hoje
}

/** O Rezar está noutro dia que não hoje? (lido na hora, fora do React) */
export const rezarEmOutroDia = () => lerEscolha() !== null;

export function useDataRezar(): DataRezar {
  const e = useSyncExternalStore(assinar, lerEscolha);
  const hoje = hojeIso();
  return { data: e ?? hoje, escolhida: !!e && e !== hoje };
}

/** Data com que uma Hora abre pelo Rezar: a escolhida; sem escolha, a de agora (Completas de madrugada = dia anterior) */
export const dataDaHora = (h: string, r: DataRezar) => (r.escolhida ? r.data : dataParaHora(h));

/** Abre a aba Rezar já num dia, de qualquer tela (volta para as abas; não empilha outra cópia delas) */
export function abrirRezarNoDia(data: string) {
  destaque = true;
  router.dismissTo({ pathname: '/orar', params: { data, t: String(Date.now()) } });
}
