// Imagem, vídeo, texto com links e botões de link dos eventos e avisos.

import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Text, useWindowDimensions, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { SERVIDOR, type BotaoLink, type VideoMidia } from '@/servidor/api';
import { Espaco, Marca, usePaleta } from '@/tema';
import { ehLinkDoApp, irPara } from '@/util/destinos';
import { Botao, Icone } from './base';

// ---------------------------------------------------------------- imagem inteira (sem cortes)
const proporcoes = new Map<string, number>();
/** Mostra a imagem inteira, no formato dela (de 9:16 em pé até panorâmica). */
export function ImagemInteira({ uri, style, padrao = 4 / 3 }: { uri: string; style?: StyleProp<ViewStyle>; padrao?: number }) {
  const [p, setP] = useState<number | undefined>(proporcoes.get(uri));
  const prop = p ?? padrao;
  const limitada = Math.max(0.5625, prop);
  return (
    <Image
      source={{ uri }}
      style={[{ width: '100%', aspectRatio: limitada }, style as any]}
      contentFit={prop < 0.5625 ? 'contain' : 'cover'}
      transition={200}
      onLoad={(e) => {
        const n = e.source.width / e.source.height;
        if (n > 0 && Number.isFinite(n)) {
          proporcoes.set(uri, n);
          setP(n);
        }
      }}
    />
  );
}

// ---------------------------------------------------------------- vídeo
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export const capaDoVideo = (v: VideoMidia) => v.capa || v.capaAuto || null;

/** Player com os controles do iPhone; só toca quando a pessoa aperta o play (e só baixa a partir daí). */
export function PlayerVideo({ video, style }: { video: VideoMidia; style?: StyleProp<ViewStyle> }) {
  const { width, height } = useWindowDimensions();
  const larg = width - 2 * Espaco.l;
  const prop = video.largura && video.altura ? video.largura / video.altura : 16 / 9;
  const alt = Math.round(Math.min(larg / prop, height * 0.7));
  const capa = capaDoVideo(video);
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;object-fit:contain;display:block;background:#000}</style></head><body><video src="${esc(video.url)}"${capa ? ` poster="${esc(capa)}"` : ''} controls playsinline preload="none"></video></body></html>`;
  return (
    <View style={[{ marginHorizontal: Espaco.l, marginBottom: Espaco.l, height: alt, borderRadius: 22, overflow: 'hidden', backgroundColor: '#000' }, style]}>
      <WebView
        source={{ html, baseUrl: SERVIDOR }}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        allowsFullscreenVideo
        scrollEnabled={false}
        bounces={false}
        style={{ backgroundColor: '#000' }}
        containerStyle={{ backgroundColor: '#000' }}
      />
    </View>
  );
}

/** Capa do vídeo com o símbolo de play (nos cartões da lista) */
export function CapaVideo({ video }: { video: VideoMidia }) {
  const capa = capaDoVideo(video);
  const prop = video.largura && video.altura ? video.largura / video.altura : 16 / 9;
  return (
    <View style={{ backgroundColor: '#000' }}>
      {capa ? <ImagemInteira uri={capa} padrao={prop} /> : <View style={{ width: '100%', aspectRatio: Math.max(0.5625, prop) }} />}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nome="play.fill" cor="#fff" tamanho={22} />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- links
const APPS = /(^|\.)(wa\.me|whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|facebook\.com|fb\.me|maps\.apple\.com|spotify\.com|t\.me)$/i;

/** Abre um link: WhatsApp, Instagram, YouTube etc. no app deles; o resto no navegador dentro do app */
export async function abrirLink(bruto: string) {
  let url = bruto.trim();
  if (ehLinkDoApp(url)) return irPara(url);
  if (/^www\./i.test(url)) url = `https://${url}`;
  try {
    if (!/^https?:\/\//i.test(url)) return void (await Linking.openURL(url));
    const host = url.replace(/^https?:\/\//i, '').split(/[/?#:]/)[0];
    if (APPS.test(host)) return void (await Linking.openURL(url));
    await WebBrowser.openBrowserAsync(url, { controlsColor: Marca.ouro, dismissButtonStyle: 'close' });
  } catch {
    Linking.openURL(url).catch(() => {});
  }
}

const RE_LINK = /\b(?:https?:\/\/|portafidei:\/\/|www\.)[^\s<>"]+/gi;
/** Texto com os links (http://, https://, www.) clicáveis */
export function TextoComLinks({ texto, style }: { texto: string; style?: StyleProp<TextStyle> }) {
  const c = usePaleta();
  const partes: (string | { url: string })[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(RE_LINK)) {
    let url = m[0];
    // pontuação no fim da frase não faz parte do link
    const sobra = url.match(/[.,;:!?)\]}»"']+$/)?.[0] ?? '';
    if (sobra) url = url.slice(0, -sobra.length);
    const i = m.index ?? 0;
    if (i > ultimo) partes.push(texto.slice(ultimo, i));
    partes.push({ url });
    ultimo = i + url.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  const temLink = partes.some((p) => typeof p !== 'string');
  return (
    <Text selectable={!temLink} style={style}>
      {partes.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <Text key={i} onPress={() => abrirLink(p.url)} style={{ color: c.destaque, textDecorationLine: 'underline' }}>
            {p.url}
          </Text>
        ),
      )}
    </Text>
  );
}

/** Botões de link (inscrição etc.) e uma separação antes dos botões de ação */
export function BotoesLink({ botoes }: { botoes?: BotaoLink[] | null }) {
  const c = usePaleta();
  if (!botoes?.length) return null;
  return (
    <>
      <View style={{ marginHorizontal: Espaco.l, gap: 12 }}>
        {botoes.map((b, i) => (
          <Botao key={`${i}-${b.url}`} titulo={b.texto} icone={ehLinkDoApp(b.url) ? 'arrow.right' : 'arrow.up.right'} onPress={() => abrirLink(b.url)} />
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: c.separador, marginHorizontal: Espaco.xl * 2, marginTop: 26, marginBottom: 22 }} />
    </>
  );
}
