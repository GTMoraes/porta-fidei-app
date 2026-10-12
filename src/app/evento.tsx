import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Share, Text, View } from 'react-native';

import { useServidor } from '@/servidor/api';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Aviso, Botao, Fundo, Linha, Secao, Vidro } from '@/ui/base';
import { quando } from '@/util/datas';

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

  const compartilhar = () =>
    Share.share({ message: `${e.titulo}\n${quando(e.inicio, e.fim)}${e.local ? `\n${e.local}` : ''}${e.descricao ? `\n\n${e.descricao}` : ''}\n\nComunidade Católica Porta Fidei` });

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ margin: Espaco.l }}>
          <Vidro style={{ borderRadius: 28 }}>
            {e.imagem ? <Image source={{ uri: e.imagem }} style={{ height: 220 }} contentFit="cover" /> : null}
            <View style={{ padding: Espaco.xl }}>
              <Text style={{ color: c.destaque, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>{e.tipo === 'missa' ? 'Santa Missa' : 'Evento da Comunidade'}</Text>
              <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 27, marginTop: 6 }}>{e.titulo}</Text>
            </View>
          </Vidro>
        </View>
        <Secao>
          <Linha titulo={quando(e.inicio, e.fim)} icone="clock" />
          {e.local ? <Linha titulo={e.local} icone="mappin.and.ellipse" ultimo /> : null}
        </Secao>
        {e.descricao ? (
          <Secao>
            <Text style={{ color: c.texto, fontSize: 16, lineHeight: 23, padding: Espaco.l }}>{e.descricao}</Text>
          </Secao>
        ) : null}
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 50 }}>
          <Botao titulo="Compartilhar" icone="square.and.arrow.up" tipo="secundario" onPress={compartilhar} />
          {srv.admin ? <Botao titulo="Editar" icone="pencil" tipo="secundario" onPress={() => router.push({ pathname: '/editar-evento', params: { id: e.id } })} /> : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
