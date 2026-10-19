// Comunicação com o servidor da Comunidade (agenda, avisos, imagens).
// Tudo que vem daqui fica guardado no aparelho para funcionar sem internet.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths, UploadType } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import { cabecalhoApp } from '@/conteudo/remoto';

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
  lat?: number | null; // ponto marcado no mapa (opcional; sem ele, o mapa busca pelo texto do local)
  lng?: number | null;
  criado?: string | null; // servidor 0.4.16 em diante
  atualizado?: string | null;
  video?: VideoMidia | null;
  botoes?: BotaoLink[];
  /** cancelado: fica na agenda marcado; reagendado: o original, na data antiga, apontando para o novo */
  situacao?: 'cancelado' | 'reagendado' | null;
  reagendadoPara?: string | null;
}

/** Vídeo já comprimido pelo servidor; "capa" é a escolhida pela pessoa, "capaAuto" a gerada */
export interface VideoMidia {
  url: string;
  capa?: string | null;
  capaAuto?: string | null;
  largura?: number | null;
  altura?: number | null;
  duracao?: number | null;
}
/** Botão de link (inscrição, formulário...) abaixo da descrição */
export interface BotaoLink {
  texto: string;
  url: string;
}

/** Notificação escrita no cadastro do evento (sai para todos ao salvar) */
export interface NotificacaoEvento {
  titulo: string;
  texto: string;
  urgente?: boolean;
}
export interface LocalSalvo {
  local: string;
  lat: number | null;
  lng: number | null;
}

export interface Aviso {
  id: string;
  titulo: string;
  texto: string;
  imagem?: string | null;
  fixado?: boolean;
  criado: string;
  atualizado?: string; // última edição (para mostrar "corrigido")
  video?: VideoMidia | null;
  botoes?: BotaoLink[];
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
  temPdf?: boolean; // o PDF original (com a arte da Comissão) está no servidor
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
      comTempo(`${SERVIDOR}/api/agenda`, { headers: cabecalhoApp() }),
      comTempo(`${SERVIDOR}/api/avisos`, { headers: cabecalhoApp() }),
      comTempo(`${SERVIDOR}/api/comunidade`, { headers: cabecalhoApp() }).catch(() => null),
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

/** "Também publicar em Avisos": a notificação do evento vira um aviso (com o botão "Ver evento") */
export interface AvisoDoEvento {
  publicarAviso?: boolean;
  fixarAviso?: boolean;
}
export const salvarEvento = (e: Partial<Evento> & { notificacao?: NotificacaoEvento } & AvisoDoEvento) => (e.id ? admin(`/eventos/${e.id}`, 'PUT', e) : admin('/eventos', 'POST', e));
export const apagarEvento = (id: string) => admin(`/eventos/${id}`, 'DELETE');
/** sinalizar: fica na agenda como CANCELADO; senão é apagado */
export const cancelarEvento = (id: string, sinalizar: boolean, notificacao?: NotificacaoEvento, av?: AvisoDoEvento) =>
  admin(`/eventos/${id}/cancelar`, 'POST', { sinalizar, notificacao, ...av });
export const descancelarEvento = (id: string, notificacao?: NotificacaoEvento, av?: AvisoDoEvento) => admin(`/eventos/${id}/descancelar`, 'POST', { notificacao, ...av });
/** Cria o evento na nova data e deixa o original como REAGENDADO */
export const reagendarEvento = (id: string, e: Partial<Evento> & { notificacao?: NotificacaoEvento } & AvisoDoEvento) => admin(`/eventos/${id}/reagendar`, 'POST', e) as Promise<Evento>;
/** Locais já usados nos eventos (com o ponto no mapa, quando houver) */
export const locaisSalvos = () => admin('/locais', 'GET') as Promise<LocalSalvo[]>;
export const salvarAviso = (a: Partial<Aviso> & { notificar?: boolean; urgente?: boolean }) =>
  a.id ? admin(`/avisos/${a.id}`, 'PUT', a) : admin('/avisos', 'POST', a);
export const apagarAviso = (id: string) => admin(`/avisos/${id}`, 'DELETE');
/** Só a notificação, para todos os aparelhos, sem criar aviso */
export const notificarTodos = (titulo: string, texto: string, urgente = false) =>
  admin('/notificar-teste', 'POST', { titulo, texto, urgente }) as Promise<{ resultado: string }>;
export const testarNotificacao = (titulo: string, texto: string, token?: string | null) =>
  admin('/notificar-teste', 'POST', { titulo, texto, token: token ?? undefined }) as Promise<{ resultado: string }>;

// ---------------- oração da Comunidade (administração)
/** Tudo, inclusive rascunhos e jornadas/orações desativadas */
export const comunidadeAdmin = () => admin('/comunidade', 'GET') as Promise<Comunidade>;
/** Envia o PDF da Proposta: o servidor separa as seções e devolve um rascunho */
export const enviarPropostaPdf = (base64: string) => admin('/propostas/pdf', 'POST', { base64 }, 90000) as Promise<Proposta>;
export const salvarProposta = (p: Partial<Proposta> & { id: string; notificar?: boolean }) => admin(`/propostas/${p.id}`, 'PUT', p) as Promise<Proposta>;
export const anexarPdfProposta = (id: string, base64: string) => admin(`/propostas/${id}/pdf`, 'PUT', { base64 }, 90000) as Promise<Proposta>;
export const urlPdfProposta = (id: string) => `${SERVIDOR}/api/propostas/${id}/pdf`;
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
    headers: { 'Content-Type': 'application/json', ...cabecalhoApp() },
    body: JSON.stringify({ token, plataforma: 'ios', versao }),
  });
  if (!r.ok) throw new Error(`Erro ${r.status}`);
}

/** Envia uma imagem (base64 JPEG/PNG) e devolve a URL pública */
export async function enviarImagem(base64: string, tipo: string): Promise<string> {
  const j = await admin('/imagens', 'POST', { base64, tipo });
  return j.url as string;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envia um vídeo em partes (cada uma abaixo do limite do Cloudflare) e espera o servidor comprimir.
 *  `progresso` recebe a fase e, no envio, a fração já enviada (0 a 1). */
export async function enviarVideo(uri: string, progresso: (fase: 'enviando' | 'preparando', fracao: number) => void): Promise<VideoMidia> {
  if (!token) throw new Error('Entre como administrador primeiro');
  const ini = (await admin('/videos', 'POST')) as { id: string; parteMax: number };
  const arq = new File(uri);
  const total = arq.size;
  if (!total) throw new Error('Não foi possível ler o vídeo');
  const PARTE = Math.min(ini.parteMax || 8 * 1024 * 1024, 8 * 1024 * 1024); // o nginx na frente aceita até 12 MB
  const h = arq.open();
  const tmp = new File(Paths.cache, `pf-parte-${ini.id}.bin`);
  try {
    let enviado = 0;
    for (let n = 0; enviado < total; n++) {
      h.offset = enviado;
      const bytes = h.readBytes(Math.min(PARTE, total - enviado));
      tmp.create({ overwrite: true });
      tmp.write(bytes);
      for (let tentativa = 1; ; tentativa++) {
        try {
          const r = await tmp.upload(`${SERVIDOR}/api/admin/videos/${ini.id}/parte/${n}`, {
            httpMethod: 'PUT',
            uploadType: UploadType.BINARY_CONTENT,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
            onProgress: (p) => progresso('enviando', Math.min(1, (enviado + p.bytesSent) / total)),
          });
          if (r.status >= 300) {
            let msg = r.body;
            try {
              msg = JSON.parse(r.body).erro ?? r.body;
            } catch {}
            throw new Error(msg || `Erro ${r.status}`);
          }
          break;
        } catch (e) {
          if (tentativa >= 3) throw e;
          await esperar(1500 * tentativa);
        }
      }
      enviado += bytes.length;
      progresso('enviando', enviado / total);
    }
  } finally {
    try {
      h.close();
    } catch {}
    try {
      if (tmp.exists) tmp.delete();
    } catch {}
  }
  await admin(`/videos/${ini.id}/fim`, 'POST');
  progresso('preparando', 0);
  for (;;) {
    await esperar(2500);
    const e = (await admin(`/videos/${ini.id}`, 'GET')) as { estado: string; erro?: string; video?: VideoMidia };
    if (e.estado === 'pronto' && e.video) return e.video;
    if (e.estado === 'erro') throw new Error(e.erro || 'O servidor não conseguiu preparar o vídeo');
  }
}
