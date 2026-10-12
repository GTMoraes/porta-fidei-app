// Leitor de textos litúrgicos: HTML com o visual do app + barra flutuante de vidro
// (tamanho da letra, rolagem automática, voz e timer de oração silenciosa).

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNavigation, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { paginaHtml, textoParaVoz } from '@/conteudo/montar';
import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { usePaleta } from '@/tema';
import { Icone, toque, Vidro } from './base';

interface Props {
  corpo: string | null; // null = carregando
  titulo?: string;
  subtitulo?: string;
  permitirSilencio?: boolean;
  topo?: React.ReactNode; // conteúdo nativo acima do texto (ex.: seletor de dia)
  baseUrl?: string; // pasta local para imagens do texto
  alturaTopo?: number;
  rodape?: React.ReactNode; // barra fixa embaixo (ex.: atalhos da Missa, escolha do salmo do Invitatório)
  tipo?: 'horas' | 'texto';
}

const ALTURA_RODAPE = 58;

export function Leitor({ corpo, titulo, subtitulo, permitirSilencio, topo, baseUrl, alturaTopo = 64, rodape, tipo = 'texto' }: Props) {
  const aj = useAjustes();
  const c = usePaleta();
  const web = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const router = useRouter();
  const [rolando, setRolando] = useState(false);
  const [falando, setFalando] = useState(false);
  const [barraVisivel, setBarraVisivel] = useState(true);
  const [expandido, setExpandido] = useState(false);
  const [silencio, setSilencio] = useState<number | null>(null); // segundos restantes

  // tela sempre ligada enquanto se reza
  useEffect(() => {
    if (!aj.telaLigada) return;
    activateKeepAwakeAsync('leitor').catch(() => {});
    return () => {
      deactivateKeepAwake('leitor').catch(() => {});
    };
  }, [aj.telaLigada]);

  // para a voz ao sair
  useEffect(() => () => void Speech.stop(), []);

  // "expandir texto": toque esconde o cabeçalho e a barra
  useEffect(() => {
    nav.setOptions({ headerShown: !expandido });
  }, [expandido, nav]);

  // timer da oração silenciosa
  useEffect(() => {
    if (silencio == null) return;
    if (silencio <= 0) {
      setSilencio(null);
      toque();
      return;
    }
    const t = setTimeout(() => setSilencio((s) => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [silencio]);

  // a página só é recriada quando mudam o texto ou a aparência (não a cada toque)
  const html = useMemo(
    () =>
      corpo == null
        ? null
        : paginaHtml(corpo, aj, c, {
            titulo,
            subtitulo,
            tipo,
            topoExtra: insets.top + 44 + (topo ? alturaTopo + 8 : 0),
            rodapeExtra: insets.bottom + (rodape ? ALTURA_RODAPE : 0),
          }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [corpo, aj.fonte, aj.alinhamento, aj.tema, c.leitorFundo, titulo, subtitulo, insets.top, insets.bottom, !!topo, !!rodape, alturaTopo, tipo],
  );

  const mudarFonte = (delta: number) => {
    const novo = Math.max(14, Math.min(34, aj.tamanhoFonte + delta));
    mudarAjustes({ tamanhoFonte: novo });
    web.current?.injectJavaScript(`window.pfFonte(${novo});true;`);
  };

  const alternarRolagem = () => {
    const v = rolando ? 0 : aj.velocidadeRolagem;
    web.current?.injectJavaScript(`window.pfRolar(${v});true;`);
    setRolando(!rolando);
  };

  const alternarVoz = async () => {
    if (falando) {
      await Speech.stop();
      setFalando(false);
      return;
    }
    if (!corpo) return;
    setFalando(true);
    Speech.speak(textoParaVoz(corpo), {
      language: 'pt-BR',
      rate: aj.velocidadeVoz,
      onDone: () => setFalando(false),
      onStopped: () => setFalando(false),
      onError: () => setFalando(false),
    });
  };

  const aoMensagem = (e: WebViewMessageEvent) => {
    let m: any;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.tipo === 'link' && typeof m.href === 'string') {
      if (m.href.startsWith('pf://abrir/')) {
        router.push({ pathname: '/texto', params: { arquivo: m.href.replace('pf://abrir/', ''), titulo: m.titulo ?? '' } });
      }
    } else if (m.tipo === 'toque') {
      if (aj.expandirTexto) setExpandido((x) => !x);
    } else if (m.tipo === 'rolou') {
      setBarraVisivel(!m.desce || m.y < 80);
    } else if (m.tipo === 'fimRolagem') {
      setRolando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.leitorFundo }}>
      <StatusBar hidden={aj.esconderBarraStatus || expandido} style={c.escuro ? 'light' : 'dark'} />
      {html == null ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.destaque} />
        </View>
      ) : (
        <WebView
          ref={web}
          originWhitelist={['*']}
          source={{ html, baseUrl: baseUrl ?? '' }}
          allowFileAccess
          allowingReadAccessToURL={baseUrl}
          onMessage={aoMensagem}
          style={{ backgroundColor: c.leitorFundo }}
          containerStyle={{ backgroundColor: c.leitorFundo }}
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          dataDetectorTypes="none"
          textInteractionEnabled
          decelerationRate="normal"
          contentInsetAdjustmentBehavior="never"
        />
      )}

      {topo && !expandido && barraVisivel ? <View style={{ position: 'absolute', top: insets.top + 50, left: 12, right: 12 }}>{topo}</View> : null}

      {silencio != null ? (
        <View style={{ position: 'absolute', top: '38%', alignSelf: 'center' }}>
          <Vidro style={{ borderRadius: 32, paddingVertical: 20, paddingHorizontal: 32, alignItems: 'center' }}>
            <Text style={{ color: c.textoSuave, fontSize: 14 }}>Oração silenciosa</Text>
            <Text style={{ color: c.texto, fontSize: 44, fontVariant: ['tabular-nums'], marginTop: 4 }}>
              {Math.floor(silencio / 60)}:{String(silencio % 60).padStart(2, '0')}
            </Text>
            <Pressable onPress={() => setSilencio(null)} style={{ marginTop: 8 }}>
              <Text style={{ color: c.destaque, fontSize: 16 }}>Encerrar</Text>
            </Pressable>
          </Vidro>
        </View>
      ) : null}

      {rodape && !expandido && html != null ? (
        <View style={{ position: 'absolute', bottom: insets.bottom + 8, left: 12, right: 12 }}>
          <Vidro style={{ borderRadius: 26, minHeight: ALTURA_RODAPE - 8, justifyContent: 'center' }} interativo>
            {rodape}
          </Vidro>
        </View>
      ) : null}

      {barraVisivel && !expandido && html != null ? (
        <View style={{ position: 'absolute', bottom: insets.bottom + 12 + (rodape ? ALTURA_RODAPE : 0), alignSelf: 'center' }}>
          <Vidro style={{ borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }} interativo>
            <BotaoBarra icone="textformat.size.smaller" onPress={() => mudarFonte(-1)} />
            <BotaoBarra icone="textformat.size.larger" onPress={() => mudarFonte(1)} />
            {aj.velocidadeRolagem > 0 ? (
              <BotaoBarra icone={rolando ? 'pause.fill' : 'arrow.down.to.line.compact'} onPress={alternarRolagem} ativo={rolando} />
            ) : null}
            {aj.voz ? <BotaoBarra icone={falando ? 'stop.fill' : 'speaker.wave.2.fill'} onPress={alternarVoz} ativo={falando} /> : null}
            {aj.timerSilencio && permitirSilencio ? (
              <BotaoBarra icone="hourglass" onPress={() => setSilencio(aj.minutosSilencio * 60)} />
            ) : null}
          </Vidro>
        </View>
      ) : null}
    </View>
  );
}

function BotaoBarra({ icone, onPress, ativo }: { icone: any; onPress: () => void; ativo?: boolean }) {
  const c = usePaleta();
  return (
    <Pressable
      onPress={() => {
        toque();
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => ({ padding: 12, opacity: pressed ? 0.5 : 1 })}>
      <Icone nome={icone} cor={ativo ? c.rubrica : c.destaque} tamanho={20} />
    </Pressable>
  );
}
