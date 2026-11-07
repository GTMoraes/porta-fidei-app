// Lembretes: notificações locais, agendadas no próprio aparelho (funcionam sem internet).
// - Horas canônicas: todo dia, no horário escolhido (Ajustes › Lembretes › Liturgia das Horas).
// - Orações com lembrete sugerido pela Comunidade (ex.: toda 1ª sexta-feira), jornadas (o começo) e rotinas
//   (missas da semana, adoração, comissões): a pessoa liga no sino da tela ou em Ajustes › Lembretes,
//   na véspera, no dia ou um tempo antes. Agendamos as próximas ocorrências (até 45 dias) e reagendamos ao abrir o
//   app, quando os dados da Comunidade mudam (rotina cancelada ou remarcada, regra nova) e quando a pessoa muda algo.
// O iPhone guarda no máximo 64 notificações agendadas: as horas (até 8) e as mais próximas das outras.

import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { HORAS } from '@/liturgia/horas';
import { assinarServidor, lerServidor } from '@/servidor/api';
import { mostrarOpcoes } from '@/ui/Opcoes';
import { AJUSTES_DO_APARELHO } from '@/util/plataforma';
import { lerAjustes, mudarAjustes, type ModoLembrete } from './ajustes';
import { chaveLembrete, ligado, modoDe, proximosLembretes, textoAntes, type TipoLembrete } from './lembretesRegras';

export { chaveLembrete, ligado, modoDe, textoAntes, textoModo, type TipoLembrete } from './lembretesRegras';

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
    name: 'Lembretes',
    description: 'Horas canônicas, devoções, jornadas e horários que você pediu para lembrar',
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

// ------------------------------------------------------------------ orações, jornadas e rotinas
/** Folha de opções do sino (na tela do item e em Ajustes › Lembretes) */
export function escolherLembrete(t: TipoLembrete, id: string, titulo: string) {
  const antes = `${textoAntes(lerAjustes().minutosAntes)} antes`;
  const opcoes: [string, ModoLembrete][] =
    t === 'rotina'
      ? [
          [antes.charAt(0).toUpperCase() + antes.slice(1), { antes: true }],
          ['Na véspera', { vespera: true }],
          [`Na véspera e ${antes}`, { vespera: true, antes: true }],
        ]
      : [
          ['No dia', { noDia: true }],
          ['Na véspera', { vespera: true }],
          ['Na véspera e no dia', { vespera: true, noDia: true }],
        ];
  const atual = modoDe(lerAjustes(), t, id);
  mostrarOpcoes(`Lembrar: ${titulo}`, [
    ...opcoes.map(([rotulo, m]) => ({ rotulo, onPress: () => void definirLembrete(t, id, m) })),
    ...(ligado(atual) ? [{ rotulo: 'Não lembrar', destrutivo: true, onPress: () => void definirLembrete(t, id, null) }] : []),
  ]);
}

export async function definirLembrete(t: TipoLembrete, id: string, m: ModoLembrete | null) {
  if (m) {
    const ok = await pedirPermissao();
    if (!ok) {
      Alert.alert('Notificações desligadas', `Permita as notificações do app ${AJUSTES_DO_APARELHO} para receber os lembretes.`);
      return;
    }
  }
  const itens = { ...lerAjustes().lembretesItens };
  if (m) itens[chaveLembrete(t, id)] = m;
  else delete itens[chaveLembrete(t, id)];
  mudarAjustes({ lembretesItens: itens });
  await reagendarLembretes();
}

// os dados da Comunidade mudaram (rotina cancelada, regra nova): reagenda, se a pessoa tem lembretes desses
let ultimaVersao = '';
assinarServidor(() => {
  const d = lerServidor();
  if (!d.atualizado || d.atualizado === ultimaVersao) return;
  ultimaVersao = d.atualizado;
  if (Object.keys(lerAjustes().lembretesItens).length) setTimeout(() => void reagendarLembretes(), 400);
});

// ------------------------------------------------------------------ agendamento
// uma de cada vez (cancelar tudo e agendar de novo não pode se cruzar)
let fila: Promise<void> = Promise.resolve();
export function reagendarLembretes(): Promise<void> {
  fila = fila.then(agendarTudo).catch(() => {});
  return fila;
}

async function agendarTudo() {
  const aj = lerAjustes();
  const ativos = HORAS.filter((h) => aj.lembretes[h.id]?.ativo);
  const itens = proximosLembretes(aj, lerServidor().comunidade);
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!ativos.length && !itens.length) return;
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
  for (const l of itens.slice(0, Math.max(0, 60 - ativos.length))) {
    await Notifications.scheduleNotificationAsync({
      content: { title: l.titulo, body: l.corpo, data: l.data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: l.quando, channelId: CANAL },
    });
  }
}
