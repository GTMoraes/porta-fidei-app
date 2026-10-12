// Lembretes das horas canônicas: notificações locais, agendadas no próprio aparelho
// (funcionam mesmo sem conta paga da Apple e sem internet).

import * as Notifications from 'expo-notifications';
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

export async function pedirPermissao(): Promise<boolean> {
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
  for (const h of ativos) {
    const l = aj.lembretes[h.id];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: h.nome,
        body: `${h.quando}. Toque para rezar.`,
        data: { hora: h.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: l.hora, minute: l.minuto },
    });
  }
}
