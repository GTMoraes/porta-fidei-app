import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { existe, imagemUri } from '@/conteudo/pacote';
import { COR_HEX, NOME_GRAU, NOME_TEMPO, dataPorExtenso, diaLiturgico } from '@/liturgia/calendario';
import { santosDoDia } from '@/liturgia/martirologio';
import { HORAS } from '@/liturgia/horas';
import { lerDiaCNBB, resumoLeituras } from '@/liturgia/cnbb';
import { missalDoDia } from '@/liturgia/missal';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Fundo, Linha, Secao, toque, Vidro } from '@/ui/base';

// espaço que não quebra: "Saltério I" nunca fica com o "I" sozinho na linha de baixo
const nb = (t: string) => t.replace(/ /g, '\u00A0');

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

  // toque no cartão: resumo das leituras do dia (como no iLiturgia)
  const mostrarLeituras = async () => {
    toque();
    const d = await lerDiaCNBB(data);
    const l = d ? resumoLeituras(d.html) : [];
    if (!l.length) {
      Alert.alert('Leituras do dia', 'As leituras deste dia ainda não foram carregadas. Abra a Liturgia Diária uma vez (com internet) e elas ficam guardadas.', [
        { text: 'Fechar', style: 'cancel' },
        { text: 'Abrir Liturgia Diária', onPress: () => router.push({ pathname: '/liturgia', params: { data } }) },
      ]);
      return;
    }
    Alert.alert('Leituras do dia', l.map((x) => `${x.titulo}: ${x.ref}`).join('\n'), [
      { text: 'OK', style: 'cancel' },
      { text: 'Abrir Liturgia Diária', onPress: () => router.push({ pathname: '/liturgia', params: { data } }) },
    ]);
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Pressable onPress={mostrarLeituras} style={({ pressed }) => ({ marginHorizontal: Espaco.l, marginVertical: Espaco.l, opacity: pressed ? 0.8 : 1 })}>
          <Vidro style={{ borderRadius: 28 }} interativo>
            {pintura ? <Image source={{ uri: pintura }} style={{ height: 200 }} contentFit="cover" /> : null}
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 6, backgroundColor: COR_HEX[cel.cor] }} />
              <View style={{ flex: 1, padding: Espaco.l }}>
                <Text style={{ color: c.textoFraco, fontSize: 14 }}>{dataPorExtenso(data)}</Text>
                <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 25, lineHeight: 31, marginTop: 6 }}>{cel.nome}</Text>
                <Text style={{ color: c.textoSuave, fontSize: 14.5, marginTop: 6 }}>
                  {[nb(NOME_GRAU[cel.grau]), nb(NOME_TEMPO[dia.tempo]), dia.semana ? nb(`${dia.semana}ª semana`) : '', nb(`Saltério ${['', 'I', 'II', 'III', 'IV'][dia.semanaSalterio]}`)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 4 }}>
                  {[nb(`Ano ${dia.anoDominical} (domingos)`), nb(`Ano ${dia.anoFerial} (dias de semana)`), nb(`cor ${cel.cor}`)].join(' · ')}
                </Text>
                {cel.nome !== dia.feria ? <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 4 }}>{dia.feria}</Text> : null}
              </View>
            </View>
          </Vidro>
          <Text style={{ color: c.textoFraco, fontSize: 12.5, textAlign: 'center', marginTop: 8 }}>Toque para ver as leituras do dia</Text>
        </Pressable>

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

        <Secao titulo="Missa e santo">
          <Linha titulo="Liturgia Diária" icone="book" onPress={() => router.push({ pathname: '/liturgia', params: { data } })} ultimo={!santo && !missal && !santosDoDia(data).length} />
          {santo ? (
            <Linha
              titulo="Vida do santo"
              icone="sparkles"
              onPress={() => router.push({ pathname: '/texto', params: { arquivo: santo, titulo: cel.nome, imagem: imagemUri(`santos/${cel.slug}`) ? `santos/${cel.slug}` : '', mart: data } })}
              ultimo={!missal && !santosDoDia(data).length}
            />
          ) : null}
          {santosDoDia(data).length ? (
            <Linha titulo="Outros santos do dia" sub="Martirológio Romano" icone="person.3" onPress={() => router.push({ pathname: '/martirologio', params: { data } })} ultimo={!missal} />
          ) : null}
          {missal ? <Linha titulo="Orações da Missa (Missal)" icone="text.book.closed" onPress={() => router.push({ pathname: '/texto', params: { arquivo: missal, titulo: cel.nome } })} ultimo /> : null}
        </Secao>

        <Secao titulo="Liturgia das Horas">
          {HORAS.map((h, i) => (
            <Linha key={h.id} titulo={h.nome} onPress={() => router.push({ pathname: '/hora', params: { h: h.id, data } })} ultimo={i === HORAS.length - 1} />
          ))}
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
