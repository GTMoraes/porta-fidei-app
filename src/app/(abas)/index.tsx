import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { semana } from '@/comunidade/html';
import { diaAtual, diasFeitos, jornadasDeHoje, periodo, useFeitos } from '@/comunidade/jornadas';
import { dispensado, dispensar, useArquivados, visivel } from '@/estado/arquivados';
import { instalarApk, useApkNovo } from '@/estado/apkNovo';
import { aplicarAtualizacao, buscarNova, useAtualizacaoPronta } from '@/estado/atualizacaoApp';
import { existe, imagemUri, usePacote } from '@/conteudo/pacote';
import { infoRemota, type InfoRemota } from '@/conteudo/remoto';
import { lerAjustes } from '@/estado/ajustes';
import { abrirRezarHoje } from '@/estado/dataRezar';
import { dataPorExtenso, diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { HORAS } from '@/liturgia/horas';
import { santosDoDia } from '@/liturgia/martirologio';
import { atualizar, encerrado, useServidor } from '@/servidor/api';
import { Espaco, Marca, fonteTitulo, usePaleta } from '@/tema';
import { Aviso, Fundo, Icone, IconeQuadrado, Linha, Secao, toque, Vidro } from '@/ui/base';
import { DeslizarParaArquivar } from '@/ui/Deslizar';
import { dataParaHora, horaSugerida } from '@/util/datas';
import { LinhaEvento } from '@/ui/Agenda';
import { AuraDourada } from '@/ui/Aura';
import { CartaoDoDia } from '@/ui/CartaoDoDia';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { useFolgaAbas } from '@/ui/AbasAndroid';

export default function Hoje() {
  const folga = useFolgaAbas();
  const lista = useSubirAoTopo();
  const c = usePaleta();
  const router = useRouter();
  const pacote = usePacote();
  const srv = useServidor();
  const [hoje, setHoje] = useState(hojeIso());
  // hora atual: refeita ao voltar para a tela, ao reabrir o app e a cada minuto
  // (antes ficava a da última vez que a tela foi desenhada, e sugeria Completas de manhã)
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000);
    const s = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        setAgora(new Date());
        setHoje(hojeIso());
      }
    });
    return () => {
      clearInterval(t);
      s.remove();
    };
  }, []);
  // o indicador de "atualizando" só aparece quando a pessoa puxa a tela
  const [puxando, setPuxando] = useState(false);
  const puxar = async () => {
    setPuxando(true);
    try {
      // puxar também procura versão nova do app (o card aparece quando terminar de baixar)
      await Promise.all([atualizar(), buscarNova()]);
    } finally {
      setPuxando(false);
    }
  };
  const jaAbriuMenu = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setHoje(hojeIso());
      setAgora(new Date());
    }, []),
  );

  // Ajuste "Iniciar com menu aberto": abre o menu das horas (Rezar › Liturgia das Horas) ao iniciar
  useEffect(() => {
    if (!jaAbriuMenu.current && lerAjustes().iniciarMenuAberto) {
      jaAbriuMenu.current = true;
      router.navigate('/orar');
      router.push({ pathname: '/secao', params: { id: 'horas' } });
    }
  }, [router]);

  // conteúdo novo no servidor (confere uma vez ao abrir)
  const [remoto, setRemoto] = useState<InfoRemota | null>(null);
  useEffect(() => {
    infoRemota().then(setRemoto);
  }, [pacote.manifest]);
  const haAtualizacao = !!(pacote.manifest && remoto && remoto.gerado !== pacote.manifest.gerado);

  const dia = useMemo(() => diaLiturgico(hoje), [hoje]);
  const cel = dia.celebracao;
  const sugerida = HORAS.find((h) => h.id === horaSugerida(agora))!;
  const santoArquivo = cel.slug && existe(`santos/${cel.slug}`) ? `santos/${cel.slug}` : undefined;
  const fotoSanto = cel.slug ? imagemUri(`santos/${cel.slug}`) : undefined;

  const agoraMs = agora.getTime();
  const proximos = srv.eventos.filter((e) => new Date(e.fim ?? e.inicio).getTime() >= agoraMs - 3600_000).slice(0, 4);
  const com = srv.comunidade;
  const proposta = com?.propostas.find((p) => p.id === com.atual && p.inicio && p.fim && p.inicio <= hoje && hoje <= p.fim);
  const jornadas = jornadasDeHoje(com?.jornadas, hoje);
  const feitos = useFeitos();
  const arquivados = useArquivados();
  // avisos encerrados (passou a validade) não aparecem mais aqui: ficam em Avisos › Arquivados
  const ativos = srv.avisos.filter((a) => !encerrado(a, agoraMs));
  const avisos = ativos.filter((a) => visivel(arquivados, a)).sort((a, b) => Number(!!b.fixado) - Number(!!a.fixado)).slice(0, 3);
  // avisos fixados: também no topo da tela (deslizar tira só daqui; o aviso continua em Avisos)
  // no topo, só o aviso fixado mais recente (quem instala o app não recebe uma pilha de fixados antigos;
  // os outros continuam em Avisos). Dispensado ou arquivado, o topo fica vazio até chegar um fixado novo.
  const fixadoTopo = ativos.filter((a) => a.fixado).sort((a, b) => b.criado.localeCompare(a.criado))[0];
  const fixados = fixadoTopo && visivel(arquivados, fixadoTopo) && !dispensado(arquivados, fixadoTopo) ? [fixadoTopo] : [];
  const atualizacaoPronta = useAtualizacaoPronta();
  const apk = useApkNovo();

  // "Para hoje": atalhos pequenos, embaixo de tudo
  const atalhos: { titulo: string; icone: SFSymbol; abrir: () => void }[] = [
    { titulo: 'Liturgia Diária', icone: 'book', abrir: () => router.push('/liturgia') },
    ...(santoArquivo
      ? [
          {
            titulo: 'Santo do dia',
            icone: 'person.crop.circle' as SFSymbol,
            abrir: () =>
              router.push({ pathname: '/texto', params: { arquivo: santoArquivo, titulo: cel.nome, imagem: fotoSanto ? `santos/${cel.slug}` : '', mart: hoje } }),
          },
        ]
      : []),
    ...(santosDoDia(hoje).length
      ? [{ titulo: 'Outros santos', icone: 'person.3' as SFSymbol, abrir: () => router.push({ pathname: '/martirologio', params: { data: hoje } }) }]
      : []),
    { titulo: 'Calendário Litúrgico', icone: 'calendar', abrir: () => router.push('/calendario') },
  ];

  return (
    <Fundo aba>
      <ScrollView
        ref={lista}
        scrollToOverflowEnabled
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={puxando} onRefresh={puxar} tintColor={c.destaque} colors={[c.destaque]} />}>
        {/* Cabeçalho: a logo oficial completa (brasão e nome), colorida ou branca no tema escuro */}
        <View style={{ paddingHorizontal: Espaco.xl, paddingTop: Espaco.xl }} accessible accessibilityRole="header" accessibilityLabel="Comunidade Católica Porta Fidei">
          <Image
            source={c.escuro ? require('@/comunidade/logo-horizontal-branco.png') : require('@/comunidade/logo-horizontal.png')}
            style={{ width: 224, height: 64 }}
            contentFit="contain"
            contentPosition="left"
          />
        </View>
        <Text style={{ color: c.textoSuave, paddingHorizontal: Espaco.xl, marginTop: Espaco.l, marginBottom: Espaco.s, fontSize: 15 }}>
          {dataPorExtenso(hoje)}
        </Text>

        {/* versão nova do app já baixada (atualização pelo ar) */}
        {atualizacaoPronta ? (
          <Pressable
            onPress={() => {
              toque();
              aplicarAtualizacao();
            }}
            style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.m }}>
            <Vidro tinta={c.ouroCheio} interativo style={{ borderRadius: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: Espaco.l }}>
                <Icone nome="arrow.down.app" cor="#fff" tamanho={22} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '600' }}>Há uma nova versão do app</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5 }}>Toque aqui para atualizar agora</Text>
                </View>
                <Icone nome="chevron.right" cor="#fff" tamanho={14} />
              </View>
            </Vidro>
          </Pressable>
        ) : null}

        {/* Android: versão nova do app que precisa de instalador (algo nativo, como as notificações) */}
        {apk.info ? (
          <AuraDourada style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.m }}>
            <Pressable
              disabled={apk.baixando}
              onPress={() => {
                toque();
                instalarApk();
              }}>
              <Vidro tinta={c.vinhoCheio} interativo style={{ borderRadius: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: Espaco.l }}>
                  <Icone nome="arrow.down.app" cor="#fff" tamanho={22} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '600' }}>Atualize o app</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5 }}>
                      {apk.baixando
                        ? `Baixando… ${Math.round(apk.progresso * 100)}%`
                        : apk.erro
                          ? 'Não deu certo. Toque para tentar de novo.'
                          : 'Nova versão com notificações. Toque para instalar.'}
                    </Text>
                  </View>
                  <Icone nome="chevron.right" cor="#fff" tamanho={14} />
                </View>
              </Vidro>
            </Pressable>
          </AuraDourada>
        ) : null}

        {/* conteúdo litúrgico ainda não baixado, ou versão nova: no alto e com a aura dourada até a pessoa baixar */}
        {!pacote.manifest || haAtualizacao ? (
          <AuraDourada style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l, marginTop: Espaco.xs }}>
            <Pressable
              onPress={() => {
                toque();
                router.push('/conteudo');
              }}>
              <Vidro style={{ borderRadius: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: Espaco.l }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: Marca.ouro, alignItems: 'center', justifyContent: 'center' }}>
                    <Icone nome="arrow.down" cor="#FFFFFF" tamanho={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.texto, fontSize: 17, fontWeight: '600' }}>
                      {pacote.manifest ? 'Atualize o conteúdo litúrgico' : 'Baixe o conteúdo litúrgico'}
                    </Text>
                    <Text style={{ color: c.textoSuave, fontSize: 14, lineHeight: 19, marginTop: 3 }}>
                      {pacote.manifest
                        ? 'Saiu uma versão nova dos textos. Toque para baixar'
                        : 'Necessário para a Liturgia das Horas e o Missal. Uma vez só; depois funciona sem internet'}
                      {remoto ? ` (${(remoto.tamanho / 1e6).toFixed(0)} MB).` : '.'}
                    </Text>
                  </View>
                  <Icone nome="chevron.right" cor={c.textoFraco} tamanho={15} />
                </View>
              </Vidro>
            </Pressable>
          </AuraDourada>
        ) : null}

        {/* avisos fixados no topo */}
        {fixados.map((a) => (
          <DeslizarParaArquivar key={a.id} cor={c.escuro ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'} simbolo="xmark" rotulo="Dispensar" onArquivar={() => dispensar(a)}>
            {() => (
              <Pressable
                onPress={() => {
                  toque();
                  router.push({ pathname: '/aviso', params: { id: a.id } });
                }}
                style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
                <Vidro style={{ borderRadius: 24 }}>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ width: 5, backgroundColor: Marca.ouro }} />
                    <View style={{ flex: 1, padding: Espaco.l }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icone nome="pin.fill" cor={c.destaque} tamanho={13} />
                        <Text style={{ color: c.destaque, fontSize: 12.5, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', flex: 1 }}>Aviso</Text>
                        {/* o único card da tela que desliza: a dica mostra que dá para tirar daqui */}
                        <Icone nome="chevron.left" cor={c.textoFraco} tamanho={10} />
                        <Text style={{ color: c.textoFraco, fontSize: 11.5 }}>arraste para dispensar</Text>
                      </View>
                      <Text style={{ color: c.texto, ...fonteTitulo(20), marginTop: 4 }}>{a.titulo}</Text>
                      <Text style={{ color: c.textoSuave, fontSize: 14.5, lineHeight: 20, marginTop: 4 }} numberOfLines={3}>
                        {a.texto}
                      </Text>
                    </View>
                  </View>
                </Vidro>
              </Pressable>
            )}
          </DeslizarParaArquivar>
        ))}

        {/* Celebração do dia: o toque leva ao Rezar já em hoje (que tem o card do dia, os próprios do dia e tudo o
            mais); a Hoje mostra sempre hoje, mesmo com outro dia escolhido no Rezar */}
        <CartaoDoDia
          data={hoje}
          onPress={abrirRezarHoje}
          style={{ marginBottom: proposta || jornadas.length ? Espaco.xxl : Espaco.xl }}
        />

        {/* Oração Pessoal: a proposta de oração pessoal da semana e as jornadas de hoje */}
        {proposta || jornadas.length ? (
          <Secao grande titulo="Oração Pessoal">
            {proposta ? (
              <Pressable
                onPress={() => {
                  toque();
                  router.push({ pathname: '/proposta', params: { id: proposta.id } });
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: Espaco.l }}>
                  <IconeQuadrado nome="doc.richtext" fundo={Marca.vinho} tamanho={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.destaque, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>Proposta da semana</Text>
                    <Text style={{ color: c.texto, ...fonteTitulo(19, 24), marginTop: 2 }} numberOfLines={2}>
                      {proposta.titulo}
                    </Text>
                    <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 2 }}>{semana(proposta)}</Text>
                  </View>
                  <Icone nome="chevron.right" cor={c.textoFraco} tamanho={14} />
                </View>
              </Pressable>
            ) : null}
            {proposta && jornadas.length ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separador, marginLeft: Espaco.l }} /> : null}
            {jornadas.map((j, i) => {
              const n = diaAtual(j, hoje)!;
              const p = periodo(j, hoje)!;
              const rezou = diasFeitos(feitos, j, p).includes(hoje);
              return (
                <Linha
                  key={j.id}
                  titulo={j.titulo}
                  sub={`Dia ${n} de ${j.dias}${rezou ? ' · rezado hoje' : ''}`}
                  icone={rezou ? 'checkmark.circle.fill' : 'figure.hiking'}
                  corIcone={rezou ? Marca.ouro : undefined}
                  onPress={() => router.push({ pathname: '/jornada', params: { id: j.id } })}
                  ultimo={i === jornadas.length - 1}
                />
              );
            })}
          </Secao>
        ) : null}

        {/* Rezar agora */}
        <Pressable
          onPress={() => {
            toque();
            router.push({ pathname: '/hora', params: { h: sugerida.id, data: dataParaHora(sugerida.id, agora) } });
          }}
          style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.xxl }}>
          <Vidro tinta={c.vinhoCheio} style={{ borderRadius: 24 }} interativo>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: Espaco.l, gap: 12 }}>
              <Icone nome="flame" cor="#fff" tamanho={26} />
              <View style={{ flex: 1 }}>
                {/* mesmo estilo de "PROPOSTA DA SEMANA" e "FÉRIA · TEMPO COMUM" (seminegrito, 12) */}
                <Text
                  style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}>
                  Rezar agora · Liturgia das Horas
                </Text>
                <Text style={{ color: '#fff', ...fonteTitulo(23) }}>{sugerida.nome}</Text>
              </View>
              <Icone nome="chevron.right" cor="#fff" tamanho={16} />
            </View>
          </Vidro>
        </Pressable>

        {/* Próximas missas e eventos: a data em destaque, como uma folhinha */}
        <Secao
          grande
          titulo="Próximas missas e eventos"
          acao={
            <Pressable onPress={() => router.navigate({ pathname: '/agenda', params: { aba: 'agenda', t: String(Date.now()) } })} hitSlop={8}>
              <Text style={{ color: c.destaque, fontSize: 15 }}>Ver tudo</Text>
            </Pressable>
          }>
          {proximos.length ? (
            proximos.map((e, i) => <LinhaEvento key={e.id} e={e} comData ultimo={i === proximos.length - 1} />)
          ) : (
            <Aviso
              icone={srv.erro ? 'wifi.slash' : 'calendar.badge.clock'}
              texto={srv.erro && !srv.atualizado ? 'Não foi possível falar com o servidor da Comunidade. Puxe para baixo para tentar de novo.' : 'Nenhuma missa ou evento agendado por enquanto.'}
            />
          )}
        </Secao>

        {/* Avisos: cada um no seu cartão, com a faixa dourada */}
        {avisos.length ? (
          <Secao
            grande
            solto
            titulo="Avisos"
            acao={
              <Pressable onPress={() => router.navigate({ pathname: '/agenda', params: { aba: 'avisos', t: String(Date.now()) } })} hitSlop={8}>
                <Text style={{ color: c.destaque, fontSize: 15 }}>Ver todos</Text>
              </Pressable>
            }>
            <View style={{ gap: Espaco.s }}>
              {avisos.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    toque();
                    router.push({ pathname: '/aviso', params: { id: a.id } });
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <Vidro style={{ borderRadius: 18 }}>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ width: 4, backgroundColor: Marca.ouro }} />
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 14, paddingRight: Espaco.l }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {a.fixado ? <Icone nome="pin.fill" cor={c.destaque} tamanho={12} /> : null}
                            <Text style={{ color: c.texto, fontSize: 16.5, fontWeight: '600', flex: 1 }} numberOfLines={2}>
                              {a.titulo}
                            </Text>
                          </View>
                          <Text style={{ color: c.textoSuave, fontSize: 14, lineHeight: 19, marginTop: 3 }} numberOfLines={2}>
                            {a.texto}
                          </Text>
                        </View>
                        <Icone nome="chevron.right" cor={c.textoFraco} tamanho={14} />
                      </View>
                    </View>
                  </Vidro>
                </Pressable>
              ))}
            </View>
          </Secao>
        ) : null}

        {/* Para hoje: atalhos menores */}
        <Secao grande solto titulo="Para hoje">
          <View style={{ flexDirection: 'row', gap: Espaco.s }}>
            {atalhos.map((a) => (
              <Pressable
                key={a.titulo}
                accessibilityRole="button"
                accessibilityLabel={a.titulo}
                onPress={() => {
                  toque();
                  a.abrir();
                }}
                style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}>
                <Vidro interativo style={{ borderRadius: 16 }}>
                  <View style={{ alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 76, paddingVertical: 10, paddingHorizontal: 4 }}>
                    <Icone nome={a.icone} tamanho={21} />
                    <Text style={{ color: c.texto, fontSize: 12.5, fontWeight: '500', textAlign: 'center', lineHeight: 15 }} numberOfLines={2}>
                      {a.titulo}
                    </Text>
                  </View>
                </Vidro>
              </Pressable>
            ))}
          </View>
        </Secao>
        <View style={{ height: 40 + folga }} />
      </ScrollView>
    </Fundo>
  );
}
