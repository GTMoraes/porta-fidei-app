// Liturgia Diária: leituras da CNBB (API do site oficial, buscada numa página invisível do próprio site)
// com as orações do Missal intercaladas como na Missa. Guarda os próximos 30 dias no aparelho.

import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { montarArquivo } from '@/conteudo/montar';
import { existe } from '@/conteudo/pacote';
import { diaLiturgico, hojeIso, somaDias } from '@/liturgia/calendario';
import { DIAS_ADIANTE, faltando, guardarDiaCNBB, jsBaixar, lerDiaCNBB, limparAntigos, URL_CNBB, type DiaCNBB } from '@/liturgia/cnbb';
import { missalDoDia } from '@/liturgia/missal';
import { usePaleta } from '@/tema';
import { Icone, toque, Vidro } from '@/ui/base';
import { Leitor } from '@/ui/Leitor';
import { dataCurta } from '@/util/datas';

/** Separa o próprio do Missal em: antes das leituras (entrada, coleta) e depois (oferendas, comunhão) */
function dividirMissal(html: string): [string, string] {
  const i = html.search(/<span class="r">\s*(Sobre as oferendas|Oração sobre as oferendas)/);
  if (i < 0) return [html, ''];
  return [html.slice(0, i), html.slice(i)];
}

export default function LiturgiaDiaria() {
  const p = useLocalSearchParams<{ data?: string }>();
  const nav = useNavigation();
  const router = useRouter();
  const c = usePaleta();
  const hoje = hojeIso();
  const [data, setData] = useState(p.data || hoje);
  const dia = useMemo(() => diaLiturgico(data), [data]);
  const [cnbb, setCnbb] = useState<DiaCNBB | null | undefined>(undefined); // undefined = procurando
  const [missal, setMissal] = useState<string>('');
  const [baixar, setBaixar] = useState<string[]>([]); // datas que a página invisível vai buscar
  const [baixando, setBaixando] = useState(false);
  const dataAtual = useRef(data);
  dataAtual.current = data;
  const tentadas = useRef(new Set<string>()); // datas já pedidas à CNBB nesta abertura da tela

  const pedir = (datas: string[]) => {
    datas.forEach((d) => tentadas.current.add(d));
    setBaixar(datas);
    setBaixando(true);
  };

  useEffect(() => {
    nav.setOptions({
      title: '',
      headerRight: () => (
        <Pressable onPress={() => WebBrowser.openBrowserAsync(URL_CNBB)} hitSlop={10}>
          <Icone nome="safari" tamanho={20} />
        </Pressable>
      ),
    });
  }, [nav]);

  // ao abrir: completa o que falta de hoje até +30 dias (e o dia escolhido, se estiver fora disso)
  useEffect(() => {
    limparAntigos(hoje);
    const datas = Array.from({ length: DIAS_ADIANTE + 1 }, (_, i) => somaDias(hoje, i));
    faltando(datas).then((f) => {
      if (f.length) pedir(f);
    });
  }, [hoje]);

  // dia mostrado
  useEffect(() => {
    let vivo = true;
    setCnbb(undefined);
    lerDiaCNBB(data).then((d) => {
      if (!vivo) return;
      if (d) setCnbb(d);
      else {
        const naJanela = data >= hoje && data <= somaDias(hoje, DIAS_ADIANTE);
        const jaTentou = tentadas.current.has(data) && !baixando;
        if (naJanela && !jaTentou) return; // vem com a busca dos próximos 30 dias (aberta junto com a tela)
        if (tentadas.current.has(data) && !baixando) setCnbb(null);
        else if (!baixando) pedir([data]); // fora da janela: busca só este dia
      }
    });
    const arq = missalDoDia(dia, existe);
    setMissal('');
    if (arq) montarArquivo(arq).then((m) => vivo && setMissal(m.corpo));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dia]);

  const corpo = useMemo(() => {
    if (cnbb === undefined) return null;
    const [antes, depois] = dividirMissal(missal);
    const partes: string[] = [];
    partes.push('<section class="parte cnbb">');
    if (cnbb?.celebracao) partes.push(`<p class="cel">${cnbb.celebracao}</p>`);
    if (cnbb?.nota) partes.push(`<p class="nota">${cnbb.nota}</p>`);
    if (antes) partes.push(`<div class="missa">${antes}</div>`);
    if (cnbb) partes.push(cnbb.html);
    else
      partes.push(
        '<p class="c" style="margin-top:24px"><span class="lacuna">Não foi possível carregar as leituras deste dia (sem internet ou o site da CNBB não respondeu). Os dias já abertos ficam guardados no aparelho.</span></p>',
      );
    if (depois) partes.push(`<div class="missa" style="margin-top:1.6em">${depois}</div>`);
    if (cnbb) partes.push('<p class="fonte">Leituras: Liturgia Diária, Edições CNBB</p>');
    partes.push('</section>');
    return partes.join('');
  }, [cnbb, missal, baixando]);

  const mudarDia = (n: number) => {
    toque();
    setData((d) => somaDias(d, n));
  };

  const abrirComentario = () => {
    const arq = cnbb?.arquivo ? `comentarios/${cnbb.arquivo}` : '';
    if (arq && existe(arq)) router.push({ pathname: '/texto', params: { arquivo: arq, titulo: 'Comentário' } });
    else Alert.alert('Comentários', 'Não há comentário no pacote de conteúdo para as leituras deste dia.');
  };

  const topo = (
    <Vidro style={{ borderRadius: 22 }} interativo>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => mudarDia(-1)} hitSlop={8} style={{ padding: 12 }}>
          <Icone nome="chevron.left" tamanho={16} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => setData(hoje)}>
          <Text style={{ color: c.texto, textAlign: 'center', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {dataCurta(new Date(data + 'T12:00:00'))}
            {data === hoje ? ' · hoje' : ''}
          </Text>
          <Text style={{ color: c.textoFraco, textAlign: 'center', fontSize: 12 }} numberOfLines={1}>
            {dia.celebracao.nome}
          </Text>
        </Pressable>
        <Pressable onPress={() => mudarDia(1)} hitSlop={8} style={{ padding: 12 }}>
          <Icone nome="chevron.right" tamanho={16} />
        </Pressable>
      </View>
    </Vidro>
  );

  // atalhos do Missal: menu discreto na barra do leitor (são mais usados por ministros e acólitos)
  const temComentario = !!cnbb?.arquivo && existe(`comentarios/${cnbb.arquivo}`);
  const acoes = [
    { rotulo: 'Ordinário da Missa', onPress: () => router.push({ pathname: '/lista', params: { tipo: 'ordinario' } }) },
    { rotulo: 'Prefácios', onPress: () => router.push({ pathname: '/lista', params: { tipo: 'prefacios', data } }) },
    { rotulo: 'Orações Eucarísticas', onPress: () => router.push({ pathname: '/lista', params: { tipo: 'eucaristicas' } }) },
    ...(temComentario ? [{ rotulo: 'Comentário das leituras', onPress: abrirComentario }] : []),
  ];

  return (
    <View style={{ flex: 1 }}>
      <Leitor corpo={corpo} titulo="Liturgia Diária" topo={topo} acoes={acoes} iconeAcoes="text.book.closed" tituloAcoes="Missal" />
      {baixando && baixar.length ? (
        <View style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }} pointerEvents="none">
          <WebView
            key={baixar.join(',')}
            source={{ uri: URL_CNBB }}
            injectedJavaScript={jsBaixar(baixar)}
            onMessage={(e) => {
              let m: any;
              try {
                m = JSON.parse(e.nativeEvent.data);
              } catch {
                return;
              }
              if (m.tipo === 'dia' && m.html) {
                const d: DiaCNBB = { data: m.data, html: m.html, arquivo: m.arquivo ?? '', celebracao: m.celebracao ?? '', nota: m.nota ?? '' };
                guardarDiaCNBB(d);
                if (m.data === dataAtual.current) setCnbb(d);
              } else if (m.tipo === 'erro' && m.data === dataAtual.current) {
                setCnbb(null);
              } else if (m.tipo === 'fim') {
                setBaixando(false);
                setBaixar([]);
                const atual = dataAtual.current;
                lerDiaCNBB(atual).then((d) => {
                  if (d) setCnbb(d);
                  else if (tentadas.current.has(atual)) setCnbb(null);
                  else pedir([atual]);
                });
              }
            }}
            onError={() => {
              setBaixando(false);
              setBaixar([]);
              setCnbb((v) => (v === undefined ? null : v));
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
