// Comunicação com o servidor da Comunidade (agenda, avisos, imagens).
// Tudo que vem daqui fica guardado no aparelho para funcionar sem internet.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export const SERVIDOR = 'https://portafidei.com.br/app';

export type TipoEvento = 'missa' | 'evento' | 'formacao' | 'retiro' | 'reuniao';

export interface Evento {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: string; // ISO com fuso
  fim?: string | null;
  local?: string | null;
  descricao?: string | null;
  imagem?: string | null; // URL absoluta
}

export interface Aviso {
  id: string;
  titulo: string;
  texto: string;
  imagem?: string | null;
  fixado?: boolean;
  criado: string;
  atualizado?: string; // última edição (para mostrar "corrigido")
}

export interface SecaoProposta {
  titulo: string;
  subtitulo?: string;
  texto: string;
}
export interface Proposta {
  id: string;
  titulo: string;
  inicio: string | null; // AAAA-MM-DD
  fim: string | null;
  secoes: SecaoProposta[];
  publicada: boolean;
  criado: string;
}
export interface Jornada {
  id: string;
  slug?: string | null;
  titulo: string;
  tipo: 'novena' | 'quaresma' | 'cerco' | 'outra';
  descricao?: string | null;
  dias: number;
  anual: boolean;
  ativa: boolean;
  hora: string; // HH:MM do aviso diário
  inicioBase: string | null; // data cadastrada (para as anuais, o ano é ignorado)
  arquivo?: string | null; // texto do pacote de conteúdo (igual todos os dias)
  oracao?: string | null; // slug de uma oração da Comunidade (igual todos os dias)
  comum?: string | null; // texto de todos os dias (antes do texto do dia)
  textos: string[]; // texto de cada dia
  pronta?: boolean;
  ordem?: number;
}
export interface Oracao {
  id: string;
  slug?: string | null;
  titulo: string;
  subtitulo?: string | null;
  texto: string;
  ordem?: number;
  ativa?: boolean;
}
export interface Comunidade {
  atual: string | null;
  propostas: Proposta[];
  jornadas: Jornada[];
  oracoes: Oracao[];
}

interface Dados {
  eventos: Evento[];
  avisos: Aviso[];
  comunidade?: Comunidade;
  atualizado?: string;
  erro?: string;
  carregando: boolean;
  admin?: boolean;
}

const CHAVE = 'pf.servidor.cache.v1';
const CHAVE_TOKEN = 'pf.admin.token';
let dados: Dados = { eventos: [], avisos: [], carregando: false };
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

export function useServidor(): Dados {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => dados,
  );
}

export async function carregarCache() {
  try {
    const b = await AsyncStorage.getItem(CHAVE);
    if (b) dados = { ...JSON.parse(b), carregando: false, admin: !!token };
  } catch {}
  emitir();
}

async function comTempo(url: string, init: RequestInit = {}, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function atualizar() {
  dados = { ...dados, carregando: true, erro: undefined };
  emitir();
  try {
    const [re, ra, rc] = await Promise.all([
      comTempo(`${SERVIDOR}/api/agenda`),
      comTempo(`${SERVIDOR}/api/avisos`),
      comTempo(`${SERVIDOR}/api/comunidade`).catch(() => null),
    ]);
    if (!re.ok || !ra.ok) throw new Error(`O servidor respondeu ${re.status}/${ra.status}`);
    const eventos = (await re.json()) as Evento[];
    const avisos = (await ra.json()) as Aviso[];
    const comunidade = rc?.ok ? ((await rc.json()) as Comunidade) : dados.comunidade;
    dados = { eventos, avisos, comunidade, atualizado: new Date().toISOString(), carregando: false, admin: !!token };
    AsyncStorage.setItem(CHAVE, JSON.stringify(dados)).catch(() => {});
  } catch (e: any) {
    dados = { ...dados, carregando: false, erro: e?.name === 'AbortError' ? 'Sem resposta do servidor' : String(e?.message ?? e) };
  }
  emitir();
}

// ---------------- administração
let token: string | null = null;

export async function carregarToken() {
  token = await AsyncStorage.getItem(CHAVE_TOKEN);
  dados = { ...dados, admin: !!token };
  emitir();
  return token;
}
export const ehAdmin = () => !!token;

export async function entrar(usuario: string, senha: string) {
  const r = await comTempo(`${SERVIDOR}/api/admin/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, senha }),
  });
  if (!r.ok) throw new Error(r.status === 401 ? 'Usuário ou senha incorretos' : `Erro ${r.status}`);
  const j = await r.json();
  token = j.token as string;
  await AsyncStorage.setItem(CHAVE_TOKEN, token);
  dados = { ...dados, admin: true };
  emitir();
}

export async function sair() {
  token = null;
  await AsyncStorage.removeItem(CHAVE_TOKEN);
  dados = { ...dados, admin: false };
  emitir();
}

async function admin(caminho: string, metodo: string, corpo?: unknown, ms = 12000) {
  if (!token) throw new Error('Entre como administrador primeiro');
  const r = await comTempo(`${SERVIDOR}/api/admin${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
  }, ms);
  if (r.status === 401) {
    await sair();
    throw new Error('Sessão expirada. Entre de novo.');
  }
  if (!r.ok) {
    const t = await r.text();
    let msg = t;
    try {
      msg = JSON.parse(t).erro ?? t;
    } catch {}
    throw new Error(msg || `Erro ${r.status}`);
  }
  return r.status === 204 ? null : r.json();
}

export const salvarEvento = (e: Partial<Evento>) => (e.id ? admin(`/eventos/${e.id}`, 'PUT', e) : admin('/eventos', 'POST', e));
export const apagarEvento = (id: string) => admin(`/eventos/${id}`, 'DELETE');
export const salvarAviso = (a: Partial<Aviso> & { notificar?: boolean }) =>
  a.id ? admin(`/avisos/${a.id}`, 'PUT', a) : admin('/avisos', 'POST', a);
export const apagarAviso = (id: string) => admin(`/avisos/${id}`, 'DELETE');
/** Só a notificação, para todos os aparelhos, sem criar aviso */
export const notificarTodos = (titulo: string, texto: string) =>
  admin('/notificar-teste', 'POST', { titulo, texto }) as Promise<{ resultado: string }>;
export const testarNotificacao = (titulo: string, texto: string, token?: string | null) =>
  admin('/notificar-teste', 'POST', { titulo, texto, token: token ?? undefined }) as Promise<{ resultado: string }>;

// ---------------- oração da Comunidade (administração)
/** Tudo, inclusive rascunhos e jornadas/orações desativadas */
export const comunidadeAdmin = () => admin('/comunidade', 'GET') as Promise<Comunidade>;
/** Envia o PDF da Proposta: o servidor separa as seções e devolve um rascunho */
export const enviarPropostaPdf = (base64: string) => admin('/propostas/pdf', 'POST', { base64 }, 90000) as Promise<Proposta>;
export const salvarProposta = (p: Partial<Proposta> & { id: string; notificar?: boolean }) => admin(`/propostas/${p.id}`, 'PUT', p) as Promise<Proposta>;
export const apagarProposta = (id: string) => admin(`/propostas/${id}`, 'DELETE');
export const salvarJornada = (j: Partial<Jornada>) => (j.id ? admin(`/jornadas/${j.id}`, 'PUT', j) : admin('/jornadas', 'POST', j)) as Promise<Jornada>;
export const apagarJornada = (id: string) => admin(`/jornadas/${id}`, 'DELETE');
/** Textos de uma novena tirados de um PDF ("1º dia", "Primeiro dia"...) */
export const jornadaDoPdf = (base64: string) => admin('/jornadas/pdf', 'POST', { base64 }, 90000) as Promise<{ comum: string; textos: string[] }>;
export const salvarOracao = (o: Partial<Oracao>) => (o.id ? admin(`/oracoes/${o.id}`, 'PUT', o) : admin('/oracoes', 'POST', o)) as Promise<Oracao>;
export const apagarOracao = (id: string) => admin(`/oracoes/${id}`, 'DELETE');
export const textoDoPdf = (base64: string) => admin('/pdf-texto', 'POST', { base64 }, 90000) as Promise<{ texto: string }>;

/** Registra este aparelho para receber push (rota pública) */
export async function registrarDispositivo(token: string, versao: string) {
  const r = await comTempo(`${SERVIDOR}/api/dispositivos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, plataforma: 'ios', versao }),
  });
  if (!r.ok) throw new Error(`Erro ${r.status}`);
}

/** Envia uma imagem (base64 JPEG/PNG) e devolve a URL pública */
export async function enviarImagem(base64: string, tipo: string): Promise<string> {
  const j = await admin('/imagens', 'POST', { base64, tipo });
  return j.url as string;
}
