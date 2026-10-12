// Liturgia Diária: lê a página oficial da CNBB num navegador invisível, tira o texto
// e mostra com o visual do app. Fica guardada no aparelho para abrir sem internet.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { montarArquivo } from '@/conteudo/montar';
import { existe } from '@/conteudo/pacote';
import { diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { missalDoDia } from '@/liturgia/missal';
import { Icone } from '@/ui/base';
import { Leitor } from '@/ui/Leitor';

export const URL_CNBB = 'https://liturgiadiaria.edicoescnbb.com.br/';

const EXTRAIR = `
(function(){
  var n=0;
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  function tenta(){
    n++;
    var cands=[].slice.call(document.querySelectorAll('main,article,section,div'));
    var max=0, lista=[];
    cands.forEach(function(el){
      var t=(el.textContent||'');
      if(t.length<600) return;
      if(!/Evangelho/i.test(t) || !/Leitura/i.test(t)) return;
      lista.push([el,t.length]); if(t.length>max) max=t.length;
    });
    var melhor=null, menor=1e12;
    lista.forEach(function(p){ if(p[1]>=max*0.85 && p[1]<menor){ menor=p[1]; melhor=p[0]; } });
    if(melhor){
      var c=melhor.cloneNode(true);
      c.querySelectorAll('script,style,noscript,svg,button,nav,form,iframe,input,select,img,video,audio,picture').forEach(function(x){x.remove()});
      post({tipo:'ok', html:c.innerHTML, titulo:document.title});
    } else if(n<25){ setTimeout(tenta,800); }
    else post({tipo:'falhou'});
  }
  setTimeout(tenta,1200);
})(); true;`;

function sanear(html: string): string {
  return html
    .replace(/<(\/?)(h[1-6])[^>]*>/gi, (_m, b, t) => (b ? `</div>` : `<div class="tit ${t.toLowerCase()}">`))
    .replace(/<(?!\/?(p|br|strong|b|em|i|span|div|ul|ol|li|sup|sub)\b)[^>]*>/gi, '')
    .replace(/<(p|span|div|strong|b|em|i|ul|ol|li|sup|sub)\s+(?!class="tit)[^>]*>/gi, '<$1>')
    .replace(/(<div>\s*<\/div>|<span>\s*<\/span>|<p>\s*<\/p>)/g, '')
    .replace(/\s{2,}/g, ' ');
}

export default function LiturgiaDiaria() {
  const p = useLocalSearchParams<{ data?: string }>();
  const nav = useNavigation();
  const data = p.data || hojeIso();
  const ehHoje = data === hojeIso();
  const dia = useMemo(() => diaLiturgico(data), [data]);
  const chave = `pf.liturgia.${data}`;
  const [leituras, setLeituras] = useState<string | null | undefined>(undefined); // undefined = buscando
  const [missal, setMissal] = useState<string>('');
  const [buscar, setBuscar] = useState(false);

  useEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <Pressable onPress={() => WebBrowser.openBrowserAsync(URL_CNBB)} hitSlop={10}>
          <Icone nome="safari" tamanho={20} />
        </Pressable>
      ),
    });
  }, [nav]);

  useEffect(() => {
    AsyncStorage.getItem(chave).then((v) => {
      if (v) setLeituras(v);
      else if (ehHoje) setBuscar(true);
      else setLeituras(null);
    });
    const arq = missalDoDia(dia, existe);
    if (arq) montarArquivo(arq).then((m) => setMissal(m.corpo));
  }, [chave, ehHoje, dia]);

  const corpo = useMemo(() => {
    if (leituras === undefined) return null;
    const partes: string[] = [];
    if (leituras) partes.push(`<section class="parte cnbb">${leituras}<p class="fonte">Fonte: Liturgia Diária, Edições CNBB</p></section>`);
    else
      partes.push(
        `<p class="c"><span class="lacuna">${ehHoje ? 'Não foi possível carregar as leituras agora (sem internet ou o site da CNBB não respondeu).' : 'As leituras de outros dias entram numa próxima versão. Por enquanto, a Liturgia Diária mostra o dia de hoje.'}</span></p>`,
      );
    if (missal) partes.push(`<div class="faixa">Orações da Missa</div>${missal}`);
    return partes.join('');
  }, [leituras, missal, ehHoje]);

  return (
    <View style={{ flex: 1 }}>
      <Leitor corpo={corpo} titulo="Liturgia Diária" subtitulo={dia.celebracao.nome} />
      {buscar ? (
        <View style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }} pointerEvents="none">
          <WebView
            source={{ uri: URL_CNBB }}
            injectedJavaScript={EXTRAIR}
            onMessage={(e) => {
              try {
                const m = JSON.parse(e.nativeEvent.data);
                if (m.tipo === 'ok' && m.html) {
                  const limpo = sanear(m.html);
                  setLeituras(limpo);
                  AsyncStorage.setItem(chave, limpo).catch(() => {});
                } else setLeituras(null);
              } catch {
                setLeituras(null);
              }
              setBuscar(false);
            }}
            onError={() => {
              setLeituras(null);
              setBuscar(false);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
