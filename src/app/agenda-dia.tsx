// Missas e eventos de um dia (aberto pelo calendário da Agenda), com as rotinas daquele dia (missas da semana,
// adoração, grupos e a sua comissão) em linhas discretas, na ordem do horário.

import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { ocorrencias, rotinasDaAgenda } from '@/comunidade/rotinas';
import { useAjustes } from '@/estado/ajustes';
import { useServidor } from '@/servidor/api';
import { diaIso, LinhaEvento, LinhaRotina } from '@/ui/Agenda';
import { Aviso, Fundo, Secao } from '@/ui/base';
import { dataLonga } from '@/util/datas';

export default function AgendaDia() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const srv = useServidor();
  const aj = useAjustes();
  const eventos = srv.eventos.filter((e) => diaIso(new Date(e.inicio)) === data).map((e) => ({ k: e.id, t: new Date(e.inicio).getTime(), e, o: undefined }));
  const rotinas = data ? ocorrencias(rotinasDaAgenda(srv.comunidade?.rotinas, aj.suasComissoes), data, data) : [];
  const doDia = [...eventos, ...rotinas.map((o) => ({ k: `${o.rotina.id}-${o.data}`, t: o.inicio.getTime(), e: undefined, o }))].sort((x, y) => x.t - y.t);
  const [a, m, d] = (data ?? '').split('-').map(Number);
  const titulo = data ? dataLonga(new Date(a, m - 1, d)) : '';
  return (
    <Fundo>
      <Stack.Screen options={{ title: titulo.charAt(0).toUpperCase() + titulo.slice(1) }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 12 }}>
        <Secao>
          {doDia.length ? (
            doDia.map((it, i) =>
              it.e ? <LinhaEvento key={it.k} e={it.e} ultimo={i === doDia.length - 1} /> : <LinhaRotina key={it.k} o={it.o!} ultimo={i === doDia.length - 1} />,
            )
          ) : (
            <Aviso icone="calendar" texto="Nenhuma missa ou evento neste dia." />
          )}
        </Secao>
      </ScrollView>
    </Fundo>
  );
}
