// Pontinho de novidade na aba Agenda: o que foi criado ou alterado no servidor depois da última vez
// que a pessoa olhou cada seção ("Missas e eventos" e "Avisos").
//
// Guarda, por seção, a data (do servidor) da novidade mais recente já vista; assim o relógio do
// aparelho não interfere. Na primeira vez que o app roda com isto, tudo que já existe conta como visto.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { useArquivados, visivel } from './arquivados';
import { useServidor, type Evento } from '@/servidor/api';

const CHAVE = 'pf.agenda.vistos.v1';
export type SecaoAgenda = 'eventos' | 'avisos';
type Marcas = Partial<Record<SecaoAgenda, string>>;

let marcas: Marcas = {};
type Estado = 'carregando' | 'pronto' | 'primeira';
let estado: Estado = 'carregando';
let iniciado = false;
const ouvintes = new Set<() => void>();
// o que os componentes leem: um objeto novo a cada mudança (o React Compiler guarda resultados em cache
// e só refaz a conta quando o que ele recebe muda; ler a variável do módulo direto deixava o pontinho preso)
type Foto = { estado: Estado; marcas: Marcas };
let foto: Foto = { estado, marcas };
const emitir = () => {
  foto = { estado, marcas };
  ouvintes.forEach((f) => f());
};

function carregar() {
  if (iniciado) return;
  iniciado = true;
  AsyncStorage.getItem(CHAVE)
    .then((b) => {
      if (b) {
        marcas = JSON.parse(b) ?? {};
        estado = 'pronto';
      } else estado = 'primeira';
    })
    .catch(() => (estado = 'primeira'))
    .finally(emitir);
}

type ComData = { criado?: string | null; atualizado?: string | null };
const quando = (x: ComData) => x.atualizado || x.criado || '';
const maisRecente = (itens: ComData[]) => itens.reduce((m, x) => (quando(x) > m ? quando(x) : m), '');

/** Marca como visto tudo o que está nesta seção agora */
export function marcarVisto(secao: SecaoAgenda, itens: ComData[]) {
  if (estado === 'carregando') return;
  const m = maisRecente(itens);
  if (!m || (marcas[secao] ?? '') >= m) return;
  marcas = { ...marcas, [secao]: m };
  AsyncStorage.setItem(CHAVE, JSON.stringify(marcas)).catch(() => {});
  emitir();
}

/** Primeira vez com o recurso: o que já existe não acende o pontinho */
function iniciarSePrimeira(eventos: ComData[], avisos: ComData[]) {
  if (estado !== 'primeira') return;
  estado = 'pronto';
  marcas = { eventos: maisRecente(eventos), avisos: maisRecente(avisos) };
  AsyncStorage.setItem(CHAVE, JSON.stringify(marcas)).catch(() => {});
  emitir();
}

/** Missas e eventos que ainda aparecem na Agenda (os que já passaram há mais de 1 h saem) */
export const eventosDaAgenda = (eventos: Evento[], agora = Date.now()) =>
  eventos.filter((e) => new Date(e.fim ?? e.inicio).getTime() >= agora - 3600_000);

/** Há novidade em cada seção da Agenda? (só conta o que de fato aparece lá) */
export function useNovidadesAgenda() {
  carregar();
  const f = useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => foto,
  );
  const srv = useServidor();
  const arquivados = useArquivados();
  const eventos = eventosDaAgenda(srv.eventos);
  const avisos = srv.avisos.filter((a) => visivel(arquivados, a));
  const prontos = !!srv.atualizado;

  useEffect(() => {
    if (prontos) iniciarSePrimeira(eventos, avisos);
  });

  if (f.estado !== 'pronto') return { eventos: false, avisos: false };
  return {
    eventos: eventos.some((e) => quando(e) > (f.marcas.eventos ?? '')),
    avisos: avisos.some((a) => quando(a) > (f.marcas.avisos ?? '')),
  };
}
