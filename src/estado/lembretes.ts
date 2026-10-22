// Lembretes das horas canônicas: notificações locais, agendadas no próprio aparelho
// (funcionam mesmo sem conta paga da Apple e sem internet).

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HORAS } from '@/liturgia/horas';
import { lerAjustes } from './ajustes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android: cada tipo de notificação tem um canal, que a pessoa pode ajustar nas Configurações do celular.
// O canal precisa existir antes de pedir a permissão (Android 13 ou mais novo).
const CANAL = 'lembretes';
async function criarCanal() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Lembretes das horas',
    description: 'Lembretes diários das horas canônicas que você ligou no app',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#BC8C44',
  }).catch(() => {});
}

export async function pedirPermissao(): Promise<boolean> {
  await criarCanal();
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  const r = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return r.granted;
}

export async function reagendarLembretes() {
  const aj = lerAjustes();
  const ativos = HORAS.filter((h) => aj.lembretes[h.id]?.ativo);
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!ativos.length) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await criarCanal();
  for (const h of ativos) {
    const l = aj.lembretes[h.id];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: h.nome,
        body: `${h.quando}. Toque para rezar.`,
        data: { hora: h.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: l.hora, minute: l.minuto, channelId: CANAL },
    });
  }
}
