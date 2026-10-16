// Pacote de conteúdo litúrgico.
// O app não traz texto litúrgico no código: ele lê um pacote (.zip) instalado na pasta do app.
// Na demonstração, o pacote é provisório e fica só no aparelho do Gabriel.
// Na versão oficial, o pacote vem da digitalização da Comunidade ou da licença da CNBB.

import { Directory, File, Paths } from 'expo-file-system';
import { strFromU8, unzipSync } from 'fflate';
import { useSyncExternalStore } from 'react';

export interface Manifest {
  formato: number;
  tipo: 'provisorio' | 'oficial';
  descricao: string;
  gerado: string;
  arquivos: string[];
  imagens: string[];
  titulos: Record<string, string>;
}

interface Estado {
  pronto: boolean; // já verificou o disco
  manifest?: Manifest;
}

let _pasta: Directory | null = null;
const pasta = () => (_pasta ??= new Directory(Paths.document, 'conteudo'));
let estado: Estado = { pronto: false };
let arquivos = new Set<string>();
let imagens = new Set<string>();
const ouvintes = new Set<() => void>();
const cache = new Map<string, string>();

const emitir = () => ouvintes.forEach((f) => f());

export function usePacote(): Estado {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
  );
}

const uriDe = (rel: string) => {
  const u = pasta().uri;
  return `${u.endsWith('/') ? u : u + '/'}${rel}`;
};

export async function carregarPacote() {
  try {
    const mf = new File(uriDe('manifest.json'));
    if (mf.exists) {
      const m = JSON.parse(await mf.text()) as Manifest;
      arquivos = new Set(m.arquivos);
      imagens = new Set(m.imagens);
      estado = { pronto: true, manifest: m };
    } else {
      estado = { pronto: true };
    }
  } catch {
    estado = { pronto: true };
  }
  emitir();
}

export const existe = (arquivo: string) => arquivos.has(arquivo);
export const pastaUri = (rel: string) => uriDe(rel.endsWith('/') ? rel : rel + '/');
export const temImagem = (rel: string) => imagens.has(rel);
export const imagemUri = (rel: string) => (imagens.has(rel) ? uriDe(`img/${rel}.jpg`) : undefined);
/** Imagem do pacote como data URI: o WebView do iOS não lê arquivos locais a partir de HTML montado em memória */
export async function imagemDataUri(rel: string): Promise<string | undefined> {
  if (!imagens.has(rel)) return undefined;
  try {
    return 'data:image/jpeg;base64,' + (await new File(uriDe(`img/${rel}.jpg`)).base64());
  } catch {
    return undefined;
  }
}
export const tituloDe = (arquivo: string) => estado.manifest?.titulos[arquivo];
export const listar = (prefixo: string) => [...arquivos].filter((a) => a.startsWith(prefixo)).sort();

export async function ler(arquivo: string): Promise<string | null> {
  if (!arquivos.has(arquivo)) return null;
  const c = cache.get(arquivo);
  if (c) return c;
  try {
    const txt = await new File(uriDe(`t/${arquivo}.html`)).text();
    if (cache.size > 60) cache.clear();
    cache.set(arquivo, txt);
    return txt;
  } catch {
    return null;
  }
}

export async function lerDado<T>(nome: string): Promise<T | null> {
  try {
    const f = new File(uriDe(`dados/${nome}`));
    if (!f.exists) return null;
    return JSON.parse(await f.text()) as T;
  } catch {
    return null;
  }
}

export type Progresso = (fase: string, feito: number, total: number) => void;

/** Instala o pacote a partir dos bytes do .zip */
export async function instalarDeBytes(zip: Uint8Array, progresso?: Progresso) {
  progresso?.('Lendo o pacote', 0, 1);
  const nomes: string[] = [];
  unzipSync(zip, {
    filter: (f) => {
      if (!f.name.endsWith('/')) nomes.push(f.name);
      return false;
    },
  });
  if (!nomes.includes('manifest.json')) throw new Error('Este arquivo não é um pacote de conteúdo do app (falta o manifest.json).');

  // instala numa pasta temporária e troca no final, para nunca ficar pela metade
  const tmp = new Directory(Paths.document, 'conteudo-novo');
  if (tmp.exists) tmp.delete();
  tmp.create({ intermediates: true });
  const base = tmp.uri.endsWith('/') ? tmp.uri : tmp.uri + '/';
  const pastasCriadas = new Set<string>();

  const LOTE = 250;
  for (let i = 0; i < nomes.length; i += LOTE) {
    const alvo = new Set(nomes.slice(i, i + LOTE));
    const parte = unzipSync(zip, { filter: (f) => alvo.has(f.name) });
    for (const [nome, bytes] of Object.entries(parte)) {
      const pasta = nome.includes('/') ? nome.slice(0, nome.lastIndexOf('/')) : '';
      if (pasta && !pastasCriadas.has(pasta)) {
        new Directory(base + pasta).create({ intermediates: true, idempotent: true });
        pastasCriadas.add(pasta);
      }
      const f = new File(base + nome);
      f.create({ overwrite: true });
      f.write(bytes);
    }
    progresso?.('Instalando', Math.min(i + LOTE, nomes.length), nomes.length);
    await new Promise((r) => setTimeout(r, 0)); // deixa a tela respirar
  }
  // confere o manifest antes de trocar
  const m = JSON.parse(strFromU8(unzipSync(zip, { filter: (f) => f.name === 'manifest.json' })['manifest.json'])) as Manifest;
  if (!m.arquivos?.length) throw new Error('O pacote está vazio.');
  if (pasta().exists) pasta().delete();
  tmp.rename('conteudo');
  _pasta = null;
  cache.clear();
  await carregarPacote();
  return m;
}

export async function instalarDeArquivo(arquivo: File, progresso?: Progresso) {
  const bytes = await arquivo.bytes();
  return instalarDeBytes(bytes, progresso);
}

/** Procura um pf-conteudo*.zip deixado na pasta do app (pelo app Arquivos) */
export function zipNaPastaDoApp(): File | undefined {
  try {
    const doc = new Directory(Paths.document);
    for (const item of doc.list()) {
      if (item instanceof File && /^pf-conteudo.*\.zip$/i.test(item.name)) return item;
    }
  } catch {}
  return undefined;
}

export async function baixarEInstalar(url: string, progresso?: Progresso, headers?: Record<string, string>) {
  progresso?.('Baixando', 0, 1);
  const destino = new File(Paths.cache, 'pf-conteudo-baixado.zip');
  if (destino.exists) destino.delete();
  const f = await File.downloadFileAsync(url.trim(), destino, headers ? { headers } : undefined);
  try {
    return await instalarDeArquivo(f, progresso);
  } finally {
    try {
      f.delete();
    } catch {}
  }
}

export async function removerPacote() {
  if (pasta().exists) pasta().delete();
  arquivos = new Set();
  imagens = new Set();
  cache.clear();
  estado = { pronto: true };
  emitir();
}
