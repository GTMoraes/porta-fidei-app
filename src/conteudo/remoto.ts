// Pacote de conteúdo baixado do CDN do Gabriel (cdn.frx9.com/pf-privado/).
// O nginx só entrega com o cabeçalho X-PF-App certo; sem ele responde 404 (para robôs, o arquivo "não existe").
// A chave não fica no código (o repositório é público): entra no build pelo Secret PF_CHAVE_CONTEUDO.

import Constants from 'expo-constants';

import { baixarEInstalar, type Progresso } from './pacote';

export const URL_CONTEUDO = 'https://cdn.frx9.com/pf-privado/';

const chave = () => ((Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.chaveConteudo as string | undefined) || '';
export const temDownloadDireto = () => chave().length > 0;
const cabecalho = () => ({ 'X-PF-App': chave() });

export interface InfoRemota {
  gerado: string; // igual ao "gerado" do manifest.json do pacote
  tamanho: number; // bytes do zip
  textos?: number;
}

export async function infoRemota(): Promise<InfoRemota | null> {
  if (!temDownloadDireto()) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(`${URL_CONTEUDO}versao.json?t=${Date.now()}`, { headers: cabecalho(), signal: ctl.signal });
    if (!r.ok) return null;
    return (await r.json()) as InfoRemota;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export const baixarConteudo = (progresso?: Progresso) => baixarEInstalar(`${URL_CONTEUDO}pf-conteudo.zip?t=${Date.now()}`, progresso, cabecalho());
