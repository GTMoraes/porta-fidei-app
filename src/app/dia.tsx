import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { existe, imagemUri } from '@/conteudo/pacote';
import { COR_HEX, NOME_GRAU, NOME_TEMPO, dataPorExtenso, diaLiturgico } from '@/liturgia/calendario';
import { HORAS } from '@/liturgia/horas';
import { missalDoDia } from '@/liturgia/missal';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Fundo, Linha, Secao, Vidro } from '@/ui/base';

export default function Dia() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const nav = useNavigation();
  const router = useRouter();
  const c = usePaleta();
  const dia = useMemo(() => diaLiturgico(data), [data]);
  const cel = dia.celebracao;

  useEffect(() => nav.setOptions({ title: '' }), [nav]);

  const pintura = cel.slug ? imagemUri(`paints/${cel.slug}`) : undefined;
  const santo = cel.slug && existe(`santos/${cel.slug}`) ? `santos/${cel.slug}` : undefined;
  const missal = missalDoDia(dia, existe);

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ marginHorizontal: Espaco.l, marginVertical: Espaco.l }}>
          <Vidro style={{ borderRadius: 28 }}>
            {pintura ? <Image source={{ uri: pintura }} style={{ height: 200 }} contentFit="cover" /> : null}
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 6, backgroundColor: COR_HEX[cel.cor] }} />
              <View style={{ flex: 1, padding: Espaco.l }}>
                <Text style={{ color: c.textoFraco, fontSize: 14 }}>{dataPorExtenso(data)}</Text>
                <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 25, lineHeight: 31, marginTop: 6 }}>{cel.nome}</Text>
                <Text style={{ color: c.textoSuave, fontSize: 14.5, marginTop: 6 }}>
                  {NOME_GRAU[cel.grau]} · {NOME_TEMPO[dia.tempo]}
                  {dia.semana ? ` · ${dia.semana}ª semana` : ''} · Saltério {['', 'I', 'II', 'III', 'IV'][dia.semanaSalterio]}
                </Text>
                <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 4 }}>
                  Ano {dia.anoDominical} (domingos) · Ano {dia.anoFerial} (dias de semana) · cor {cel.cor}
                </Text>
                {cel.nome !== dia.feria ? <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 4 }}>{dia.feria}</Text> : null}
              </View>
            </View>
          </Vidro>
        </View>

        {dia.facultativas.length ? (
          <Secao titulo="Memórias facultativas">
            {dia.facultativas.map((f, i) => (
              <Linha
                key={f.nome}
                titulo={f.nome}
                onPress={f.slug && existe(`santos/${f.slug}`) ? () => router.push({ pathname: '/texto', params: { arquivo: `santos/${f.slug}`, titulo: f.nome, imagem: imagemUri(`santos/${f.slug}`) ? `santos/${f.slug}` : '' } }) : undefined}
                ultimo={i === dia.facultativas.length - 1}
              />
            ))}
          </Secao>
        ) : null}

        <Secao titulo="Liturgia das Horas">
          {HORAS.map((h, i) => (
            <Linha key={h.id} titulo={h.nome} onPress={() => router.push({ pathname: '/hora', params: { h: h.id, data } })} ultimo={i === HORAS.length - 1} />
          ))}
        </Secao>

        <Secao titulo="Missa e santo">
          {missal ? <Linha titulo="Orações da Missa (Missal)" icone="text.book.closed" onPress={() => router.push({ pathname: '/texto', params: { arquivo: missal, titulo: cel.nome } })} /> : null}
          {santo ? (
            <Linha
              titulo="Vida do santo"
              icone="sparkles"
              onPress={() => router.push({ pathname: '/texto', params: { arquivo: santo, titulo: cel.nome, imagem: imagemUri(`santos/${cel.slug}`) ? `santos/${cel.slug}` : '' } })}
            />
          ) : null}
          <Linha titulo="Liturgia Diária" icone="book" onPress={() => router.push({ pathname: '/liturgia', params: { data } })} ultimo />
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
