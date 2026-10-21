// Convite a contribuir: o card do topo da aba Comunidade e a linha discreta no fim de cada página.
// A doação acontece no site (doar.portafidei.com.br), aberto no Safari: pelas regras da App Store,
// o app só pode receber doações dentro dele se a Comunidade for aprovada no programa de nonprofits da Apple.

import { Linking, Pressable, Text, View } from 'react-native';

import { Espaco, Fontes, Marca, usePaleta } from '@/tema';
import { Botao, Icone, toque, Vidro } from '@/ui/base';
import { BENFEITOR_URL, DOAR_URL } from './sobre';

export const abrirDoacao = (benfeitor = false) => Linking.openURL(benfeitor ? BENFEITOR_URL : DOAR_URL).catch(() => {});

export function CardContribuir() {
  const c = usePaleta();
  return (
    <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.xl }}>
      <Vidro tinta={c.escuro ? 'rgba(188,140,68,0.18)' : 'rgba(188,140,68,0.14)'} style={{ borderRadius: 26 }}>
        <View style={{ padding: Espaco.l, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icone nome="heart.fill" cor={Marca.ouro} tamanho={18} />
            <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 22 }}>Sustente esta obra</Text>
          </View>
          <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21 }}>
            A Casa Porta Fidei e todas as ações da Comunidade se mantêm com doações. Contribua uma vez ou torne-se Benfeitor, doando todos os meses.
          </Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            <Botao titulo="Doar agora" icone="heart" onPress={() => abrirDoacao(false)} />
            <Botao titulo="Ser Benfeitor" icone="arrow.triangle.2.circlepath" tipo="secundario" onPress={() => abrirDoacao(true)} />
          </View>
        </View>
      </Vidro>
    </View>
  );
}

/** Linha discreta no fim das páginas */
export function RodapeContribuir() {
  const c = usePaleta();
  return (
    <Pressable
      onPress={() => {
        toque();
        abrirDoacao(false);
      }}
      style={({ pressed }) => ({ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, opacity: pressed ? 0.5 : 1, marginBottom: Espaco.xl })}>
      <Icone nome="heart" cor={c.destaque} tamanho={14} />
      <Text style={{ color: c.textoFraco, fontSize: 14 }}>
        Esta obra é mantida por doações · <Text style={{ color: c.destaque, fontWeight: '600' }}>Contribuir</Text>
      </Text>
    </Pressable>
  );
}
