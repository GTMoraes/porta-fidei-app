// Leitor de textos litúrgicos: HTML com o visual do app + barra flutuante de vidro
// (tamanho da letra, rolagem automática, voz e timer de oração silenciosa).

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  busca?: string; // abre já procurando esta palavra (vindo da busca geral)
  acoes?: { rotulo: string; onPress: () => void }[]; // menu discreto na barra (ex.: atalhos do Missal)
  iconeAcoes?: any;
  tituloAcoes?: string;
}

const ALTURA_RODAPE = 58;

export function Leitor({ corpo, titulo, subtitulo, permitirSilencio, topo, baseUrl, alturaTopo = 64, rodape, tipo = 'texto', busca, acoes, iconeAcoes = 'ellipsis.circle', tituloAcoes }: Props) {
  const aj = useAjustes();
  const c = usePaleta();
  const web = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rolando, setRolando] = useState(false);
  const [falando, setFalando] = useState(false);
  const [barraVisivel, setBarraVisivel] = useState(true);
  const [silencio, setSilencio] = useState<number | null>(null); // segundos restantes
  // índice das partes (vem da página) e busca no texto
  const [indice, setIndice] = useState<{ id: string; titulo: string; nivel: number }[]>([]);
  const [parteAtual, setParteAtual] = useState(0);
  const [indiceAberto, setIndiceAberto] = useState(false);
  const [buscando, setBuscando] = useState(!!busca);
  const [termo, setTermo] = useState(busca ?? '');
  const [achados, setAchados] = useState({ total: 0, atual: 0 });
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const js = (codigo: string) => web.current?.injectJavaScript(`${codigo};true;`);

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

  // controles: com a rolagem automática ligada eles somem sozinhos e voltam por alguns segundos
  // a cada toque na tela; o botão de voltar (cabeçalho) fica sempre visível
  const timerBarra = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrarBarra = (seg: number | null) => {
    setBarraVisivel(true);
    if (timerBarra.current) clearTimeout(timerBarra.current);
    timerBarra.current = seg ? setTimeout(() => setBarraVisivel(false), seg * 1000) : null;
  };
  useEffect(() => () => void (timerBarra.current && clearTimeout(timerBarra.current)), []);

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

  // página nova (outro texto ou outra aparência): o índice vem de novo dela
  useEffect(() => {
    setIndice([]);
    setParteAtual(0);
    setAchados({ total: 0, atual: 0 });
  }, [html]);

  const mudarFonte = (delta: number) => {
    const novo = Math.max(14, Math.min(34, aj.tamanhoFonte + delta));
    mudarAjustes({ tamanhoFonte: novo });
    web.current?.injectJavaScript(`window.pfFonte(${novo});true;`);
  };

  const alternarRolagem = () => {
    const v = rolando ? 0 : aj.velocidadeRolagem;
    web.current?.injectJavaScript(`window.pfRolar(${v});true;`);
    setRolando(!rolando);
    mostrarBarra(rolando ? null : 3); // ligou: os controles saem em 3 s; parou: ficam
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
    } else if (m.tipo === 'tocou') {
      // dedo na tela durante a rolagem automática: mostra os controles por 5 s
      if (rolando) mostrarBarra(5);
    } else if (m.tipo === 'toque') {
      if (rolando) mostrarBarra(5);
      else if (barraVisivel && aj.expandirTexto) setBarraVisivel(false);
      else mostrarBarra(null);
    } else if (m.tipo === 'rolou') {
      if (!rolando) setBarraVisivel(!m.desce || m.y < 80);
    } else if (m.tipo === 'fimRolagem') {
      setRolando(false);
      mostrarBarra(null);
    } else if (m.tipo === 'indice') {
      setIndice(Array.isArray(m.itens) ? m.itens : []);
    } else if (m.tipo === 'indiceAtual') {
      setParteAtual(m.i ?? 0);
    } else if (m.tipo === 'busca') {
      setAchados({ total: m.total ?? 0, atual: m.atual ?? 0 });
    }
  };

  const mudarTermo = (t: string) => {
    setTermo(t);
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => js(`window.pfBuscar(${JSON.stringify(t)})`), 280);
  };
  const fecharBusca = () => {
    setBuscando(false);
    setTermo('');
    setAchados({ total: 0, atual: 0 });
    js('window.pfLimparBusca && window.pfLimparBusca()');
  };
  const irPara = (id: string) => {
    setIndiceAberto(false);
    js(`window.pfIr(${JSON.stringify(id)})`);
  };
  const topoBusca = insets.top + 50 + (topo ? alturaTopo + 8 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.leitorFundo }}>
      <StatusBar hidden={aj.esconderBarraStatus} style={c.escuro ? 'light' : 'dark'} />
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
          onLoadEnd={() => {
            if (buscando && termo.trim().length >= 2) js(`window.pfBuscar(${JSON.stringify(termo)})`);
          }}
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

      {topo && barraVisivel ? <View style={{ position: 'absolute', top: insets.top + 50, left: 12, right: 12 }}>{topo}</View> : null}

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

      {rodape && barraVisivel && html != null ? (
        <View style={{ position: 'absolute', bottom: insets.bottom + 8, left: 12, right: 12 }}>
          <Vidro style={{ borderRadius: 26, minHeight: ALTURA_RODAPE - 8, justifyContent: 'center' }} interativo>
            {rodape}
          </Vidro>
        </View>
      ) : null}

      {barraVisivel && html != null ? (
        <View style={{ position: 'absolute', bottom: insets.bottom + 12 + (rodape ? ALTURA_RODAPE : 0), alignSelf: 'center' }}>
          <Vidro style={{ borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }} interativo>
            {indice.length ? <BotaoBarra icone="list.bullet" onPress={() => setIndiceAberto(true)} /> : null}
            {acoes?.length ? (
              <BotaoBarra
                icone={iconeAcoes}
                onPress={() =>
                  ActionSheetIOS.showActionSheetWithOptions(
                    { title: tituloAcoes, options: [...acoes.map((a) => a.rotulo), 'Cancelar'], cancelButtonIndex: acoes.length },
                    (i) => i < acoes.length && acoes[i].onPress(),
                  )
                }
              />
            ) : null}
            <BotaoBarra icone="magnifyingglass" onPress={() => (buscando ? fecharBusca() : setBuscando(true))} ativo={buscando} />
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
      {buscando && html != null ? (
        <View style={{ position: 'absolute', top: topoBusca, left: 12, right: 12 }}>
          <Vidro style={{ borderRadius: 22 }} interativo>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4 }}>
              <Icone nome="magnifyingglass" cor={c.textoFraco} tamanho={16} />
              <TextInput
                value={termo}
                onChangeText={mudarTermo}
                autoFocus={!busca}
                placeholder="Buscar neste texto"
                placeholderTextColor={c.textoFraco}
                returnKeyType="search"
                autoCorrect={false}
                onSubmitEditing={() => js('window.pfProxima(1)')}
                style={{ flex: 1, color: c.texto, fontSize: 16, paddingVertical: 11, paddingHorizontal: 8 }}
              />
              {termo.trim().length >= 2 ? (
                <Text style={{ color: c.textoFraco, fontSize: 13, fontVariant: ['tabular-nums'], marginRight: 2 }}>
                  {achados.total ? `${achados.atual} de ${achados.total}` : 'nada'}
                </Text>
              ) : null}
              <BotaoBarra icone="chevron.up" onPress={() => js('window.pfProxima(-1)')} />
              <BotaoBarra icone="chevron.down" onPress={() => js('window.pfProxima(1)')} />
              <BotaoBarra icone="xmark" onPress={fecharBusca} />
            </View>
          </Vidro>
        </View>
      ) : null}

      {indiceAberto ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={() => setIndiceAberto(false)} />
          <View style={{ position: 'absolute', left: 10, right: 10, bottom: insets.bottom + 10, maxHeight: '62%' }}>
            <Vidro style={{ borderRadius: 28 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingHorizontal: 20, paddingBottom: 6 }}>
                <Text style={{ flex: 1, color: c.textoFraco, fontSize: 12.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>Índice</Text>
                <Pressable onPress={() => setIndiceAberto(false)} hitSlop={10}>
                  <Icone nome="xmark" cor={c.textoFraco} tamanho={15} />
                </Pressable>
              </View>
              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 12 }}>
                {indice.map((it, i) => (
                  <Pressable
                    key={it.id}
                    onPress={() => {
                      toque();
                      irPara(it.id);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 11,
                      paddingLeft: 20 + it.nivel * 16,
                      paddingRight: 20,
                      opacity: pressed ? 0.5 : 1,
                    })}>
                    <Text
                      style={{
                        flex: 1,
                        color: i === parteAtual ? c.destaque : it.nivel >= 2 ? c.textoSuave : c.texto,
                        fontSize: it.nivel >= 2 ? 15 : 16.5,
                        fontWeight: i === parteAtual || it.nivel === 0 ? '600' : '400',
                      }}
                      numberOfLines={1}>
                      {it.titulo}
                    </Text>
                    {i === parteAtual ? <Icone nome="bookmark.fill" cor={c.destaque} tamanho={13} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            </Vidro>
          </View>
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
