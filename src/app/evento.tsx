import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useServidor } from '@/servidor/api';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Aviso, Botao, Fundo, Linha, Secao, Vidro } from '@/ui/base';
import { BotoesLink, ImagemInteira, PlayerVideo, TextoComLinks } from '@/ui/Midia';
import { quando } from '@/util/datas';
import { abrirNoMapa, linkMapa, temPonto } from '@/util/mapas';
import { salvarNaAgenda } from '@/util/salvarNaAgenda';

export default function TelaEvento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const srv = useServidor();
  const router = useRouter();
  const c = usePaleta();
  const e = srv.eventos.find((x) => x.id === id);

  if (!e)
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Secao>
            <Aviso texto="Este evento não existe mais." />
          </Secao>
        </ScrollView>
      </Fundo>
    );

  const lugar = { nome: e.titulo, local: e.local, lat: e.lat, lng: e.lng };
  const compartilhar = () =>
    Share.share({
      message: `${e.titulo}\n${quando(e.inicio, e.fim)}${e.local ? `\n${e.local}` : ''}${temPonto(lugar) ? `\n${linkMapa(lugar)}` : ''}${e.descricao ? `\n\n${e.descricao}` : ''}${(e.botoes ?? []).map((b) => `\n\n${b.texto}: ${b.url}`).join('')}\n\nComunidade Católica Porta Fidei`,
    });

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ margin: Espaco.l }}>
          <Vidro style={{ borderRadius: 28 }}>
            {e.imagem ? <ImagemInteira uri={e.imagem} /> : null}
            <View style={{ padding: Espaco.xl }}>
              <Text style={{ color: c.destaque, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>{e.tipo === 'missa' ? 'Santa Missa' : 'Evento da Comunidade'}</Text>
              <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 27, marginTop: 6 }}>{e.titulo}</Text>
            </View>
          </Vidro>
        </View>
        <Secao>
          <Linha titulo={quando(e.inicio, e.fim)} icone="clock" />
          {e.local || temPonto(lugar) ? (
            <Linha titulo={e.local || 'Ver no mapa'} sub="Abrir no mapa" icone="mappin.and.ellipse" onPress={() => abrirNoMapa(lugar)} ultimo />
          ) : null}
        </Secao>
        {temPonto(lugar) ? (
          <Pressable onPress={() => abrirNoMapa(lugar)} style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l, borderRadius: 22, overflow: 'hidden', height: 170 }}>
            <View pointerEvents="none" style={{ flex: 1 }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={{ latitude: e.lat!, longitude: e.lng!, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsPointsOfInterests>
                <Marker coordinate={{ latitude: e.lat!, longitude: e.lng! }} />
              </MapView>
            </View>
          </Pressable>
        ) : null}
        {e.video ? <PlayerVideo video={e.video} /> : null}
        {e.descricao ? (
          <Secao>
            <TextoComLinks texto={e.descricao} style={{ color: c.texto, fontSize: 16, lineHeight: 23, padding: Espaco.l }} />
          </Secao>
        ) : null}
        <BotoesLink botoes={e.botoes} />
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 50 }}>
          {new Date(e.fim ?? e.inicio).getTime() > Date.now() ? (
            <Botao titulo="Adicionar à agenda" icone="calendar.badge.plus" tipo="secundario" onPress={() => salvarNaAgenda(e)} />
          ) : null}
          <Botao titulo="Compartilhar" icone="square.and.arrow.up" tipo="secundario" onPress={compartilhar} />
          {srv.admin ? <Botao titulo="Editar" icone="pencil" tipo="secundario" onPress={() => router.push({ pathname: '/editar-evento', params: { id: e.id } })} /> : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
