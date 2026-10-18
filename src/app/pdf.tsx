// PDF original (ex.: Proposta de oração com a arte da Comissão), aberto dentro do app

import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { usePaleta } from '@/tema';
import { Aviso, Icone } from '@/ui/base';

export default function TelaPdf() {
  const { url, titulo } = useLocalSearchParams<{ url: string; titulo?: string }>();
  const nav = useNavigation();
  const c = usePaleta();
  const [erro, setErro] = useState(false);

  useEffect(() => {
    nav.setOptions({
      title: titulo ?? '',
      headerRight: () => (
        <Pressable onPress={() => Share.share({ url })} hitSlop={10}>
          <Icone nome="square.and.arrow.up" tamanho={19} />
        </Pressable>
      ),
    });
  }, [nav, titulo, url]);

  if (erro)
    return (
      <View style={{ flex: 1, backgroundColor: c.fundo[0], paddingTop: 120 }}>
        <Aviso icone="wifi.slash" texto="Não foi possível abrir o PDF. Confira a internet e tente de novo." />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: '#525659' }}>
      <WebView
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: '#525659' }}
        startInLoadingState
        renderLoading={() => (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        onError={() => setErro(true)}
        onHttpError={() => setErro(true)}
        contentInsetAdjustmentBehavior="automatic"
      />
    </View>
  );
}
