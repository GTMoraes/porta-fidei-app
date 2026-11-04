// Data escolhida no Rezar (a folhinha no alto da aba). O que se abre pelo Rezar e depende do dia segue esta
// data: Liturgia das Horas, Liturgia Diária, Missal do dia, santos, proposta de oração e jornadas.
// Sem escolha, vale hoje. Volta para hoje ao tocar na aba Hoje e quando o app é aberto num outro dia.
// Fica só na memória (fechar o app também volta para hoje).

import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';

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

/** Volta o Rezar para hoje (toque na aba Hoje) */
export function resetarDataRezar() {
  if (!escolha) return;
  // logo depois de escolher um dia (ex.: tocar num dia do Calendário litúrgico, que volta para as abas),
  // a Hoje pode ganhar foco no caminho: isso não desfaz a escolha
  if (Date.now() - escolha.quando < 1500) return;
  escolha = null;
  emitir();
}

function lerEscolha(): string | null {
  // escolha feita num dia que já passou (app aberto de novo no dia seguinte): volta para hoje
  if (escolha && escolha.em !== hojeIso()) escolha = null;
  return escolha?.data ?? null;
}

export interface DataRezar {
  data: string; // AAAA-MM-DD: a escolhida ou hoje
  escolhida: boolean; // true quando não é hoje
}

export function useDataRezar(): DataRezar {
  const e = useSyncExternalStore(assinar, lerEscolha);
  const hoje = hojeIso();
  return { data: e ?? hoje, escolhida: !!e && e !== hoje };
}

/** Data com que uma Hora abre pelo Rezar: a escolhida; sem escolha, a de agora (Completas de madrugada = dia anterior) */
export const dataDaHora = (h: string, r: DataRezar) => (r.escolhida ? r.data : dataParaHora(h));

/** Abre a aba Rezar já num dia, de qualquer tela (volta para as abas; não empilha outra cópia delas) */
export function abrirRezarNoDia(data: string) {
  router.dismissTo({ pathname: '/orar', params: { data, t: String(Date.now()) } });
}
