// Push silencioso do servidor ("tem novidade"): o app busca agenda, avisos e oração da Comunidade
// mesmo em segundo plano. A tarefa precisa ser definida no início do bundle (este arquivo é importado pelo _layout).

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { atualizar } from '@/servidor/api';

export const TAREFA_PUSH = 'pf-atualizar-por-push';

TaskManager.defineTask(TAREFA_PUSH, async () => {
  try {
    await atualizar();
  } catch {}
});

export function registrarTarefaPush() {
  Notifications.registerTaskAsync(TAREFA_PUSH).catch(() => {});
}
