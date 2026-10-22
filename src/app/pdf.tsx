// PDF original (ex.: Proposta de oração com a arte da Comissão), aberto dentro do app

import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { usePaleta } from '@/tema';
import { Aviso, Icone } from '@/ui/base';

// O WebView do Android não mostra PDF (só o do iOS). Lá o PDF é desenhado página a página pelo
// pdf.js (da Mozilla), carregado do cdnjs; a página nasce na origem do servidor para poder ler o PDF.
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38';
const paginaPdf = (url: string) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes">
<style>html,body{margin:0;background:#525659}canvas{display:block;width:100%;height:auto;margin:0 0 8px;background:#fff}</style>
</head><body><script>
(async () => {
  try {
    const pdfjs = await import('${PDFJS}/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument(${JSON.stringify(url)}).promise;
    const largura = document.documentElement.clientWidth * Math.min(window.devicePixelRatio || 1, 3);
    for (let i = 1; i <= doc.numPages; i++) {
      const pag = await doc.getPage(i);
      const vista = pag.getViewport({ scale: largura / pag.getViewport({ scale: 1 }).width });
      const tela = document.createElement('canvas');
      tela.width = Math.floor(vista.width);
      tela.height = Math.floor(vista.height);
      document.body.appendChild(tela);
      await pag.render({ canvasContext: tela.getContext('2d'), viewport: vista }).promise;
      if (i === 1) window.ReactNativeWebView.postMessage('pronto');
    }
  } catch (e) {
    window.ReactNativeWebView.postMessage('erro');
  }
})();
</script></body></html>`;

export default function TelaPdf() {
  const { url, titulo } = useLocalSearchParams<{ url: string; titulo?: string }>();
  const nav = useNavigation();
  const c = usePaleta();
  const [erro, setErro] = useState(false);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    nav.setOptions({
      title: titulo ?? '',
      headerRight: () => (
        <Pressable onPress={() => Share.share(Platform.OS === 'ios' ? { url } : { message: url })} hitSlop={10}>
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
  if (Platform.OS === 'android')
    return (
      <View style={{ flex: 1, backgroundColor: '#525659' }}>
        <WebView
          source={{ html: paginaPdf(url), baseUrl: (url.match(/^https?:\/\/[^/]+/)?.[0] ?? '') + '/' }}
          originWhitelist={['*']}
          style={{ flex: 1, backgroundColor: '#525659' }}
          onMessage={(e) => (e.nativeEvent.data === 'erro' ? setErro(true) : setCarregado(true))}
          onError={() => setErro(true)}
        />
        {!carregado ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
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
