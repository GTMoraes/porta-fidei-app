// "Adicionar à agenda": abre a tela do próprio iPhone já preenchida (a pessoa escolhe o calendário e o alerta).
// No iOS 17 ou mais novo essa tela não pede permissão; nos mais antigos o iPhone pergunta uma vez.

import { createEventInCalendarAsync, requestCalendarPermissionsAsync } from 'expo-calendar/legacy';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

import type { Evento } from '@/servidor/api';
import { linkMapa } from './mapas';

/** Endereço do ponto marcado (rua, número, bairro, cidade), para o Calendário achar o lugar */
async function enderecoDoPonto(lat: number, lng: number): Promise<string> {
  try {
    const r = await Promise.race([
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
      new Promise<never>((_, nao) => setTimeout(() => nao(new Error('demorou')), 3000)),
    ]);
    const a = r[0];
    if (!a) return '';
    const rua = [a.street, a.streetNumber].filter(Boolean).join(', ');
    return [rua, a.district, a.city].filter(Boolean).join(' - ');
  } catch {
    return '';
  }
}

// O Calendário do iPhone só mostra o mapinha quando reconhece o endereço: com o ponto marcado,
// vai "Nome do lugar, Rua, nº - Bairro - Cidade"; sem ponto, vai o texto do local como foi escrito.
async function localParaAgenda(e: Evento): Promise<string | undefined> {
  if (e.lat == null || e.lng == null) return e.local ?? undefined;
  const end = await enderecoDoPonto(e.lat, e.lng);
  if (!end) return e.local ?? undefined;
  return e.local && !end.toLowerCase().includes(e.local.toLowerCase()) ? `${e.local}, ${end}` : end;
}

export async function salvarNaAgenda(e: Evento) {
  const inicio = new Date(e.inicio);
  const fim = e.fim ? new Date(e.fim) : new Date(inicio.getTime() + (e.tipo === 'missa' ? 1 : 2) * 3600_000);
  const dados = {
    title: e.titulo,
    startDate: inicio,
    endDate: fim,
    location: await localParaAgenda(e),
    notes: [e.descricao, 'Comunidade Católica Porta Fidei'].filter(Boolean).join('\n\n'),
    url: e.local || e.lat != null ? linkMapa({ nome: e.titulo, local: e.local, lat: e.lat, lng: e.lng }) : undefined,
  };
  try {
    await createEventInCalendarAsync(dados);
  } catch (err: any) {
    // Android: a tela de novo evento é do app de agenda do celular e não precisa de permissão
    if (Platform.OS === 'android') {
      Alert.alert('Não foi possível abrir a agenda', String(err?.message ?? err));
      return;
    }
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
