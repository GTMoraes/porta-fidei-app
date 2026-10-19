// Missas e eventos de um dia (aberto pelo calendário da Agenda)

import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { useServidor } from '@/servidor/api';
import { diaIso, LinhaEvento } from '@/ui/Agenda';
import { Aviso, Fundo, Secao } from '@/ui/base';
import { dataLonga } from '@/util/datas';

export default function AgendaDia() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const srv = useServidor();
  const doDia = srv.eventos.filter((e) => diaIso(new Date(e.inicio)) === data).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const [a, m, d] = (data ?? '').split('-').map(Number);
  const titulo = data ? dataLonga(new Date(a, m - 1, d)) : '';
  return (
    <Fundo>
      <Stack.Screen options={{ title: titulo.charAt(0).toUpperCase() + titulo.slice(1) }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 12 }}>
        <Secao>
          {doDia.length ? (
            doDia.map((e, i) => <LinhaEvento key={e.id} e={e} ultimo={i === doDia.length - 1} />)
          ) : (
            <Aviso icone="calendar" texto="Nenhuma missa ou evento neste dia." />
          )}
        </Secao>
      </ScrollView>
    </Fundo>
  );
}
