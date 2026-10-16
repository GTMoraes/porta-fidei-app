import { File } from 'expo-file-system';

/** Abre o seletor de arquivos (Arquivos, iCloud, WhatsApp salvo...) e devolve o PDF em base64 */
export async function escolherPdf(): Promise<{ nome: string; base64: string } | null> {
  const r = await File.pickFileAsync({ mimeTypes: ['application/pdf'] });
  if (r.canceled || !r.result) return null;
  const f = r.result;
  return { nome: f.name, base64: await f.base64() };
}
