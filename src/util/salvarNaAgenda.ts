// "Adicionar à agenda": abre a tela do próprio iPhone já preenchida (a pessoa escolhe o calendário e o alerta).
// No iOS 17 ou mais novo essa tela não pede permissão; nos mais antigos o iPhone pergunta uma vez.

import { createEventInCalendarAsync, requestCalendarPermissionsAsync } from 'expo-calendar/legacy';
import { Alert } from 'react-native';

import type { Evento } from '@/servidor/api';
import { linkMapa } from './mapas';

export async function salvarNaAgenda(e: Evento) {
  const inicio = new Date(e.inicio);
  const fim = e.fim ? new Date(e.fim) : new Date(inicio.getTime() + (e.tipo === 'missa' ? 1 : 2) * 3600_000);
  const dados = {
    title: e.titulo,
    startDate: inicio,
    endDate: fim,
    location: e.local ?? undefined,
    notes: [e.descricao, 'Comunidade Católica Porta Fidei'].filter(Boolean).join('\n\n'),
    url: e.local || e.lat != null ? linkMapa({ nome: e.titulo, local: e.local, lat: e.lat, lng: e.lng }) : undefined,
  };
  try {
    await createEventInCalendarAsync(dados);
  } catch {
    // iPhone mais antigo: precisa da permissão antes de mostrar a tela
    try {
      const p = await requestCalendarPermissionsAsync();
      if (!p.granted) {
        Alert.alert('Sem acesso à agenda', 'Para salvar, permita o acesso aos calendários em Ajustes > Porta Fidei.');
        return;
      }
      await createEventInCalendarAsync(dados);
    } catch (err: any) {
      Alert.alert('Não foi possível abrir a agenda', String(err?.message ?? err));
    }
  }
}
