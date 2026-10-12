import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Share, Text, View } from 'react-native';

import { useServidor } from '@/servidor/api';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Aviso as Caixa, Botao, Fundo, Secao, Vidro } from '@/ui/base';
import { dataLonga } from '@/util/datas';

export default function TelaAviso() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const srv = useServidor();
  const router = useRouter();
  const c = usePaleta();
  const a = srv.avisos.find((x) => x.id === id);

  if (!a)
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Secao>
            <Caixa texto="Este aviso não existe mais." />
          </Secao>
        </ScrollView>
      </Fundo>
    );

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ margin: Espaco.l }}>
          <Vidro style={{ borderRadius: 28 }}>
            {a.imagem ? <Image source={{ uri: a.imagem }} style={{ height: 240 }} contentFit="cover" /> : null}
            <View style={{ padding: Espaco.xl }}>
              <Text style={{ color: c.textoFraco, fontSize: 13 }}>{dataLonga(new Date(a.criado))}</Text>
              <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 27, marginTop: 6 }}>{a.titulo}</Text>
              <Text selectable style={{ color: c.texto, fontSize: 16.5, lineHeight: 24, marginTop: 14 }}>
                {a.texto}
              </Text>
            </View>
          </Vidro>
        </View>
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 50 }}>
          <Botao titulo="Compartilhar" icone="square.and.arrow.up" tipo="secundario" onPress={() => Share.share({ message: `${a.titulo}\n\n${a.texto}\n\nComunidade Católica Porta Fidei` })} />
          {srv.admin ? <Botao titulo="Editar" icone="pencil" tipo="secundario" onPress={() => router.push({ pathname: '/editar-aviso', params: { id: a.id } })} /> : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
