// Cartão do dia litúrgico: a celebração, o grau e o tempo, a cor, o saltério e o ano. Na Hoje mostra
// sempre hoje (e leva ao Rezar); no Rezar mostra o dia escolhido na folhinha, com a data por extenso em cima.

import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { imagemUri, usePacote } from '@/conteudo/pacote';
import { COR_HEX, NOME_COR, NOME_GRAU, NOME_TEMPO, dataPorExtenso, diaLiturgico } from '@/liturgia/calendario';
import { Espaco, fonteTitulo, usePaleta } from '@/tema';
import { toque, Vidro } from './base';

const ROMANO = ['', 'I', 'II', 'III', 'IV'];

export function CartaoDoDia({
  data,
  comData,
  onPress,
  alturaPintura = 190,
  style,
}: {
  data: string;
  comData?: boolean; // a data por extenso no alto do cartão (no Rezar, onde o dia pode não ser hoje)
  onPress: () => void;
  alturaPintura?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePaleta();
  usePacote(); // a pintura do dia vem do conteúdo litúrgico
  const dia = useMemo(() => diaLiturgico(data), [data]);
  const cel = dia.celebracao;
  const pintura = cel.slug ? imagemUri(`paints/${cel.slug}`) : undefined;
  return (
    <Pressable
      onPress={() => {
        toque();
        onPress();
      }}
      style={[{ marginHorizontal: Espaco.l }, style]}>
      <Vidro style={{ borderRadius: 28 }}>
        {pintura ? <Image source={{ uri: pintura }} style={{ height: alturaPintura }} contentFit="cover" transition={250} /> : null}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 6, backgroundColor: COR_HEX[cel.cor], opacity: cel.cor === 'branco' ? 1 : 0.9 }} />
          <View style={{ flex: 1, padding: Espaco.l }}>
            {comData ? <Text style={{ color: c.textoSuave, fontSize: 14.5, marginBottom: 6 }}>{dataPorExtenso(data)}</Text> : null}
            <Text style={{ color: c.destaque, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {NOME_GRAU[cel.grau]} · {NOME_TEMPO[dia.tempo]}
            </Text>
            <Text style={{ color: c.texto, ...fonteTitulo(25, 31), marginTop: 6 }}>{cel.nome}</Text>
            {cel.nome !== dia.feria ? <Text style={{ color: c.textoSuave, fontSize: 14.5, marginTop: 6 }}>{dia.feria}</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <Etiqueta texto={`Cor: ${NOME_COR[cel.cor]}`} cor={COR_HEX[cel.cor]} />
              <Etiqueta texto={`Saltério: semana ${ROMANO[dia.semanaSalterio]}`} />
              <Etiqueta texto={`Ano ${dia.anoDominical} · ${dia.anoFerial === 'I' ? 'ímpar' : 'par'}`} />
            </View>
            {dia.facultativas.length ? (
              <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 10 }}>Memória facultativa: {dia.facultativas.map((f) => f.nome).join('; ')}</Text>
            ) : null}
            {dia.comemoracao ? <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 10 }}>Comemoração: {dia.comemoracao.nome}</Text> : null}
          </View>
        </View>
      </Vidro>
    </Pressable>
  );
}

function Etiqueta({ texto, cor }: { texto: string; cor?: string }) {
  const c = usePaleta();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: c.preenchimento }}>
      {cor ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: cor, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.2)' }} /> : null}
      <Text style={{ color: c.textoSuave, fontSize: 12.5 }}>{texto}</Text>
    </View>
  );
}
