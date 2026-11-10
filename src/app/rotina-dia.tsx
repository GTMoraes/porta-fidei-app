// Um dia de uma rotina (aberto pela linha da Agenda ou por um lembrete): quando, onde, se foi cancelada ou mudou
// de horário naquele dia, o lembrete e, para a Administração, cancelar ou remarcar só aquele dia (ou desfazer).
// `data`: o dia da regra (para uma remarcada, o dia original).
// Cancelado ou mudado: mostra o motivo (o texto do aviso que saiu, mesmo depois de o aviso vencer), o aviso, quando
// ainda existe, e o evento que ocupou o horário, quando a Administração ligou um.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';

import { avisoDaExcecao, diaHoraCurtos, faixaHoras, ICONE_ROTINA, textoRegra } from '@/comunidade/rotinas';
import { useAjustes } from '@/estado/ajustes';
import { escolherLembrete, ligado, modoDe, textoModo } from '@/estado/lembretes';
import { atualizar, desfazerExcecao, useServidor } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { COR_CANCELADO, COR_REAGENDADO, LinhaEvento } from '@/ui/Agenda';
import { Aviso, Fundo, Linha, Secao, TituloPagina } from '@/ui/base';
import { dataLonga } from '@/util/datas';
import { abrirNoMapa } from '@/util/mapas';

export default function RotinaDia() {
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();
  const router = useRouter();
  const c = usePaleta();
  const aj = useAjustes();
  const srv = useServidor();
  const r = srv.comunidade?.rotinas?.find((x) => x.id === id);
  if (!r)
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Secao>
            <Aviso texto="Este horário não está mais na agenda da Comunidade." />
          </Secao>
        </ScrollView>
      </Fundo>
    );

  const dia = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null;
  const ex = dia ? srv.comunidade?.excecoes?.find((e) => e.rotina === r.id && e.data === dia) : undefined;
  const [a, m, d] = (dia ?? '2000-01-01').split('-').map(Number);
  const nomeDia = dia ? dataLonga(new Date(a, m - 1, d)) : '';
  const modo = modoDe(aj, 'rotina', r.id);
  const aviso = avisoDaExcecao(ex, r, srv.avisos);
  const motivo = ex?.motivo || aviso?.texto;
  const eventoNoLugar = ex?.evento ? srv.eventos.find((e) => e.id === ex.evento) : undefined;

  const desfazer = () =>
    Alert.alert('Tem certeza?', 'O dia volta ao horário normal para todos. Se você publicou um aviso, ele continua: encerre ou corrija o aviso pela Agenda.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desfazer',
        style: 'destructive',
        onPress: async () => {
          try {
            await desfazerExcecao(r.id, dia!);
            await atualizar();
          } catch (e: any) {
            Alert.alert('Não foi possível desfazer', String(e?.message ?? e));
          }
        },
      },
    ]);

  return (
    <Fundo>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <TituloPagina titulo={r.titulo} sobre="Horário fixo" sub={`${textoRegra(r)}, ${faixaHoras(r.hora, r.fim)}${r.local ? ` · ${r.local}` : ''}`} />

        {dia ? (
          <Secao titulo={nomeDia}>
            {ex?.situacao === 'cancelado' ? (
              <Linha titulo="Cancelado neste dia" sub={`Não acontece ${diaHoraCurtos(dia, r.hora)}`} icone="xmark.circle" corIcone={COR_CANCELADO} ultimo />
            ) : ex?.situacao === 'remarcado' && ex.novaData && ex.novaHora ? (
              <Linha
                titulo={`Mudou para ${diaHoraCurtos(ex.novaData, ex.novaHora)}`}
                sub={`Em vez de ${diaHoraCurtos(dia, r.hora)}`}
                icone="arrow.uturn.right"
                corIcone={COR_REAGENDADO}
                ultimo
              />
            ) : (
              <Linha titulo={r.fim ? `Das ${faixaHoras(r.hora, r.fim)}` : `Às ${faixaHoras(r.hora)}`} sub={r.local ?? undefined} icone={ICONE_ROTINA[r.tipo] as any} ultimo />
            )}
          </Secao>
        ) : null}

        {motivo ? (
          <Secao titulo={ex?.situacao === 'cancelado' ? 'Por que foi cancelado' : 'Aviso'}>
            <Text style={{ color: c.texto, fontSize: 15.5, lineHeight: 22, paddingHorizontal: Espaco.l, paddingVertical: Espaco.m }}>{motivo}</Text>
            {aviso ? (
              <Linha titulo="Ver o aviso" icone="megaphone" onPress={() => router.push({ pathname: '/aviso', params: { id: aviso.id } })} ultimo />
            ) : null}
          </Secao>
        ) : null}

        {eventoNoLugar ? (
          <Secao titulo={ex?.situacao === 'cancelado' ? 'No lugar, neste horário' : 'Neste dia'}>
            <LinhaEvento e={eventoNoLugar} ultimo />
          </Secao>
        ) : null}

        <Secao>
          <Linha
            titulo="Lembrar-me"
            sub={ligado(modo) ? textoModo(modo, aj) : 'Na véspera ou um pouco antes, toda vez que acontecer'}
            icone={ligado(modo) ? 'bell.fill' : 'bell'}
            onPress={() => escolherLembrete('rotina', r.id, r.titulo)}
          />
          {r.lat != null || r.endereco ? (
            <Linha
              titulo="Abrir no mapa"
              sub={r.endereco || r.local || undefined}
              icone="map"
              onPress={() => abrirNoMapa({ nome: r.titulo, local: r.lat != null ? r.local || r.titulo : r.endereco, lat: r.lat, lng: r.lng })}
            />
          ) : null}
          <Linha titulo="Todos os horários da Comunidade" icone="clock" onPress={() => router.push({ pathname: '/pagina', params: { id: 'horarios' } })} ultimo />
        </Secao>

        {r.obs ? <Text style={{ color: c.textoSuave, fontSize: 14.5, marginHorizontal: Espaco.xl, marginBottom: Espaco.xl }}>{r.obs}</Text> : null}

        {srv.admin && dia ? (
          <Secao titulo="Administração">
            {ex ? (
              <Linha titulo="Desfazer" sub="Volta este dia ao horário normal" icone="arrow.counterclockwise" onPress={desfazer} />
            ) : (
              <>
                <Linha
                  titulo="Cancelar só este dia"
                  sub="Com notificação e aviso, se quiser"
                  icone="xmark.circle"
                  onPress={() => router.push({ pathname: '/editar-excecao', params: { id: r.id, data: dia, acao: 'cancelar' } })}
                />
                <Linha
                  titulo="Mudar o horário só deste dia"
                  sub="Outro dia ou outro horário, com notificação e aviso"
                  icone="arrow.uturn.right"
                  onPress={() => router.push({ pathname: '/editar-excecao', params: { id: r.id, data: dia, acao: 'remarcar' } })}
                />
              </>
            )}
            <Linha titulo="Editar a rotina" sub="Muda todas as semanas" icone="pencil" onPress={() => router.push({ pathname: '/editar-rotina', params: { id: r.id } })} ultimo />
          </Secao>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
