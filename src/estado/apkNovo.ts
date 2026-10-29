// Android fora da Play Store: quando o servidor tem um APK com runtime nativo mais novo que o deste aparelho
// (o que o OTA não consegue entregar, como o Firebase das notificações), a tela Hoje mostra "Atualize o app".
//
// - APK com o atualizador (runtime 2 em diante, traz o expo-intent-launcher): baixa o APK aqui mesmo,
//   com a porcentagem no card, e abre o instalador do Android. Como a assinatura é a mesma, ele atualiza
//   por cima, sem perder nada. Na 1ª vez o Android pede para "permitir instalar apps desta fonte".
// - APK antigo (sem o módulo nativo): abre a página do instalador no navegador.
//
// O módulo nativo é pego com requireOptionalNativeModule, e não com import de 'expo-intent-launcher':
// o import falharia ao carregar nos APKs antigos (que recebem este mesmo código pelo ar).

import { requireOptionalNativeModule } from 'expo';
import * as FileSystem from 'expo-file-system/legacy';
import * as Updates from 'expo-updates';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { infoApk, type InfoApk } from '@/servidor/api';

type Lancador = { startActivity(acao: string, params: Record<string, unknown>): Promise<unknown> };

type Estado = { info: InfoApk | null; baixando: boolean; progresso: number; erro: string };
let estado: Estado = { info: null, baixando: false, progresso: 0, erro: '' };
const ouvintes = new Set<() => void>();
const mudar = (m: Partial<Estado>) => {
  estado = { ...estado, ...m };
  ouvintes.forEach((f) => f());
};

const meuRuntime = () => Number(Updates.runtimeVersion ?? 0);

let ultimaBusca = 0;
/** Consulta o servidor (no máximo a cada 30 min) */
export async function buscarApk(forcar = false) {
  if (Platform.OS !== 'android' || !Updates.isEnabled) return;
  if (!forcar && Date.now() - ultimaBusca < 30 * 60_000) return;
  ultimaBusca = Date.now();
  try {
    const info = await infoApk();
    mudar({ info: info && Number(info.runtime) > meuRuntime() ? info : null });
  } catch {
    // sem internet: tenta de novo na próxima vez que o app voltar
  }
}

/** Baixa e abre o instalador (ou a página no navegador, nos APKs antigos) */
export async function instalarApk() {
  const info = estado.info;
  if (!info || estado.baixando) return;
  const lancador = requireOptionalNativeModule<Lancador>('ExpoIntentLauncher');
  if (!lancador) {
    await Linking.openURL(info.pagina).catch(() => {});
    return;
  }
  mudar({ baixando: true, progresso: 0, erro: '' });
  try {
    const destino = `${FileSystem.cacheDirectory}porta-fidei-${info.versionCode}.apk`;
    const ja = await FileSystem.getInfoAsync(destino);
    if (!ja.exists || ja.size !== info.bytes) {
      const d = FileSystem.createDownloadResumable(info.arquivo, destino, {}, (p) => {
        if (p.totalBytesExpectedToWrite > 0) mudar({ progresso: p.totalBytesWritten / p.totalBytesExpectedToWrite });
      });
      const r = await d.downloadAsync();
      if (!r || r.status !== 200) throw new Error(`o servidor respondeu ${r?.status ?? 'nada'}`);
      const fim = await FileSystem.getInfoAsync(destino);
      if (!fim.exists || fim.size !== info.bytes) throw new Error('o arquivo chegou incompleto');
    }
    mudar({ progresso: 1 });
    const uri = await FileSystem.getContentUriAsync(destino);
    // FLAG_GRANT_READ_URI_PERMISSION (1): o instalador do Android precisa ler o arquivo do app
    await lancador.startActivity('android.intent.action.VIEW', { data: uri, type: 'application/vnd.android.package-archive', flags: 1 });
  } catch (e: any) {
    mudar({ erro: String(e?.message ?? e) });
  } finally {
    mudar({ baixando: false });
  }
}

/** Para a tela Hoje: o APK novo (ou null), e o andamento do download */
export function useApkNovo(): Estado {
  useEffect(() => {
    buscarApk();
    const s = AppState.addEventListener('change', (st) => st === 'active' && buscarApk());
    return () => s.remove();
  }, []);
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
  );
}
