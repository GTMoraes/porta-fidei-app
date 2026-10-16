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
}

interface Dados {
  eventos: Evento[];
  avisos: Aviso[];
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
    const [re, ra] = await Promise.all([comTempo(`${SERVIDOR}/api/agenda`), comTempo(`${SERVIDOR}/api/avisos`)]);
    if (!re.ok || !ra.ok) throw new Error(`O servidor respondeu ${re.status}/${ra.status}`);
    const eventos = (await re.json()) as Evento[];
    const avisos = (await ra.json()) as Aviso[];
    dados = { eventos, avisos, atualizado: new Date().toISOString(), carregando: false, admin: !!token };
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

async function admin(caminho: string, metodo: string, corpo?: unknown) {
  if (!token) throw new Error('Entre como administrador primeiro');
  const r = await comTempo(`${SERVIDOR}/api/admin${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (r.status === 401) {
    await sair();
    throw new Error('Sessão expirada. Entre de novo.');
  }
  if (!r.ok) throw new Error(`Erro ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

export const salvarEvento = (e: Partial<Evento>) => (e.id ? admin(`/eventos/${e.id}`, 'PUT', e) : admin('/eventos', 'POST', e));
export const apagarEvento = (id: string) => admin(`/eventos/${id}`, 'DELETE');
export const salvarAviso = (a: Partial<Aviso> & { notificar?: boolean }) =>
  a.id ? admin(`/avisos/${a.id}`, 'PUT', a) : admin('/avisos', 'POST', a);
export const apagarAviso = (id: string) => admin(`/avisos/${id}`, 'DELETE');
export const testarNotificacao = (titulo: string, texto: string, token?: string | null) =>
  admin('/notificar-teste', 'POST', { titulo, texto, token: token ?? undefined }) as Promise<{ resultado: string }>;

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
