// Um dia da Agenda (aberto por qualquer dia do calendário da Agenda): missas e eventos, com os horários fixos daquele
// dia (missas da semana, adoração, grupos e as suas comissões) em linhas discretas, na ordem do horário. Tocar num horário
// fixo abre o dia dele (lembrete e, para a Administração, cancelar ou mudar só aquele dia).
// Administração: quem cuida da Agenda vê todas as rotinas (também as comissões que não são as suas) e, do dia de hoje em
// diante, cria missa ou evento já para esse dia; quem cuida dos Avisos, um aviso.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { ocorrencias, rotinasDaAgenda } from '@/comunidade/rotinas';
import { useAjustes } from '@/estado/ajustes';
import { comissoesNaAgenda, coordena, pode, useConta } from '@/estado/conta';
import { useServidor } from '@/servidor/api';
import { diaIso, LinhaEvento, LinhaRotina } from '@/ui/Agenda';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';
import { dataLonga } from '@/util/datas';

export default function AgendaDia() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const router = useRouter();
  const srv = useServidor();
  const aj = useAjustes();
  const conta = useConta();
  const agenda = pode(conta, 'agenda');
  const avisos = pode(conta, 'avisos');
  const eventos = srv.eventos.filter((e) => diaIso(new Date(e.inicio)) === data).map((e) => ({ k: e.id, t: new Date(e.inicio).getTime(), e, o: undefined }));
  const rotinas = data ? ocorrencias(rotinasDaAgenda(srv.comunidade?.rotinas, agenda ? ['*'] : comissoesNaAgenda(conta, aj)), data, data, srv.comunidade?.excecoes) : [];
  const doDia = [...eventos, ...rotinas.map((o) => ({ k: `${o.rotina.id}-${o.data}`, t: o.inicio.getTime(), e: undefined, o }))].sort((x, y) => x.t - y.t);
  const [a, m, d] = (data ?? '').split('-').map(Number);
  const titulo = data ? dataLonga(new Date(a, m - 1, d)) : '';
  const futuro = !!data && data >= diaIso(new Date());
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
        {futuro && (agenda || avisos || rotinas.some((o) => coordena(conta, o.rotina.comissao))) ? (
          <Secao titulo="Administração">
            {rotinas.some((o) => agenda || coordena(conta, o.rotina.comissao)) ? (
              <Linha titulo="Cancelar ou mudar um horário fixo" sub="Toque no horário, acima" icone="info.circle" seta={false} ultimo={!agenda && !avisos} />
            ) : null}
            {agenda ? (
              <Linha
                titulo="Nova missa ou evento neste dia"
                icone="plus.circle"
                onPress={() => router.push({ pathname: '/editar-evento', params: { data } })}
                ultimo={!avisos}
              />
            ) : null}
            {avisos ? (
              <Linha
                titulo="Novo aviso"
                sub="Some sozinho no fim deste dia (dá para mudar)"
                icone="megaphone"
                onPress={() => router.push({ pathname: '/editar-aviso', params: { data } })}
                ultimo
              />
            ) : null}
          </Secao>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
