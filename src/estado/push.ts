// Push real: registra o aparelho no servidor da Comunidade para receber os avisos.
// iPhone pelo APNs; Android pelo Firebase (FCM), a partir do APK de runtime 2 (que traz o google-services.json).
// O token muda raramente; reenvia quando muda, quando o app é atualizado ou a cada 7 dias.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { registrarDispositivo } from '@/servidor/api';

const CHAVE = 'pf.push.v1';
let atual: string | null = null;

/** Token deste aparelho (para o teste de notificação da Administração) */
export const tokenPush = () => atual;

// APKs antigos (runtime 1) não têm o Firebase: ali o token não existe e a permissão seria pedida à toa
const ANDROID_COM_FCM = Platform.OS === 'android' && Number(Updates.runtimeVersion ?? 0) >= 2;

// Android: as notificações da Comunidade chegam no canal "avisos" (o servidor manda channelId: 'avisos').
// O canal precisa existir antes de pedir a permissão (Android 13 ou mais novo) e antes do primeiro push.
async function criarCanalAvisos() {
  await Notifications.setNotificationChannelAsync('avisos', {
    name: 'Avisos da Comunidade',
    description: 'Missas, eventos e avisos da Comunidade Porta Fidei',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#BC8C44',
    sound: 'default',
  }).catch(() => {});
}

export async function registrarPush(pedirPermissao = true): Promise<string | null> {
  if (Platform.OS !== 'ios' && !ANDROID_COM_FCM) return null;
  try {
    if (Platform.OS === 'android') await criarCanalAvisos();
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && pedirPermissao && perm.canAskAgain) {
      perm = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    }
    if (!perm.granted) return null;
    const t = await Notifications.getDevicePushTokenAsync();
    atual = String(t.data);
    const versao = Constants.expoConfig?.version ?? '';
    const salvo = JSON.parse((await AsyncStorage.getItem(CHAVE)) ?? 'null') as { token: string; versao: string; em: number } | null;
    if (salvo && salvo.token === atual && salvo.versao === versao && Date.now() - salvo.em < 7 * 86400_000) return atual;
    await registrarDispositivo(atual, versao);
    await AsyncStorage.setItem(CHAVE, JSON.stringify({ token: atual, versao, em: Date.now() }));
    return atual;
  } catch {
    return atual; // sem internet ou sem permissão de push: tenta de novo na próxima abertura
  }
}
