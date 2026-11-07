import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ocorrencias, rotinasDaAgenda, type Ocorrencia } from '@/comunidade/rotinas';
import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { COR_HEX, diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { arquivado, arquivar, remover, removido, useArquivados, visivel } from '@/estado/arquivados';
import { eventosDaAgenda, marcarVisto, useNovidadesAgenda } from '@/estado/vistos';
import { atualizar, encerrado, useServidor, type Aviso as AvisoT, type Evento } from '@/servidor/api';
import { Espaco, Marca, fonteTitulo, usePaleta } from '@/tema';
import { Aviso, Chave, Fundo, Icone, Linha, Secao, TituloTela, toque, Vidro } from '@/ui/base';
import { DeslizarComAcoes, DeslizarParaArquivar } from '@/ui/Deslizar';
import { dataHoraCurta, dataLonga } from '@/util/datas';
import { CalendarioAgenda, diaIso, LinhaEvento, LinhaRotina } from '@/ui/Agenda';
import { CapaVideo, ImagemInteira } from '@/ui/Midia';
import { Segmentos } from '@/ui/Segmentos';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { APARELHO } from '@/util/plataforma';
import { useFolgaAbas } from '@/ui/AbasAndroid';

export default function Agenda() {
  const folga = useFolgaAbas();
  const lista = useSubirAoTopo();
  const c = usePaleta();
  const router = useRouter();
  const srv = useServidor();
  const [aba, setAba] = useState<'agenda' | 'avisos'>('agenda');
  // links do app (botão "Ver avisos", "Ver todos" da Hoje etc.) escolhem a seção; `t` muda a cada toque,
  // para valer de novo mesmo quando a seção pedida é a mesma da última vez
  const { aba: abaPedida, t } = useLocalSearchParams<{ aba?: string; t?: string }>();
  useEffect(() => {
    if (abaPedida === 'agenda' || abaPedida === 'avisos') setAba(abaPedida);
  }, [abaPedida, t]);
  // a seção nova entra pelo lado dela (Avisos fica à direita de Missas e eventos)
  const desloc = useSharedValue(0);
  const largura = useSharedValue(375);
  const abaAnterior = useRef(aba);
  useEffect(() => {
    if (abaAnterior.current === aba) return;
    abaAnterior.current = aba;
    desloc.value = (aba === 'avisos' ? 1 : -1) * largura.value * 0.3;
    desloc.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);
  const estiloConteudo = useAnimatedStyle(() => ({ transform: [{ translateX: desloc.value }] }));

  const [puxando, setPuxando] = useState(false);
  const puxar = async () => {
    setPuxando(true);
    try {
      await atualizar();
    } finally {
      setPuxando(false);
    }
  };

  const agora = Date.now();
  const futuros = eventosDaAgenda(srv.eventos, agora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  // próximos 7 dias; "Ver mais…" estende para 30 e depois de 30 em 30
  const [dias, setDias] = useState(7);
  const meiaNoite = new Date();
  meiaNoite.setHours(0, 0, 0, 0);
  const ate = meiaNoite.getTime() + dias * 86400_000;
  const naJanela = futuros.filter((e) => new Date(e.inicio).getTime() < ate);
  const temMais = futuros.some((e) => new Date(e.inicio).getTime() >= ate);

  // rotinas (missas da semana, adoração, grupos, a sua comissão): com a chave desligada, só as de hoje e as
  // canceladas ou remarcadas (mudança é notícia); as que já terminaram somem, como os eventos
  const aj = useAjustes();
  const rotinas = rotinasDaAgenda(srv.comunidade?.rotinas, aj.suasComissoes);
  const hojeIso = diaIso(meiaNoite);
  const ultimoDia = diaIso(new Date(ate - 12 * 3600_000));
  const ocs = rotinas.length
    ? ocorrencias(rotinas, hojeIso, ultimoDia, srv.comunidade?.excecoes).filter(
        (o) => o.fim.getTime() > agora && (aj.mostrarRotinas || o.data === hojeIso || !!o.situacao),
      )
    : [];

  // por dia, eventos e rotinas na ordem do horário
  type Item = { k: string; t: number; e?: Evento; o?: Ocorrencia };
  const grupos = new Map<string, Item[]>();
  const porNoDia = (d: Date, it: Item) => grupos.set(d.toDateString(), [...(grupos.get(d.toDateString()) ?? []), it]);
  for (const e of naJanela) porNoDia(new Date(e.inicio), { k: e.id, t: new Date(e.inicio).getTime(), e });
  for (const o of ocs) porNoDia(o.inicio, { k: `${o.rotina.id}-${o.data}`, t: o.inicio.getTime(), o });
  const porDia = [...grupos.values()].map((l) => l.sort((x, y) => x.t - y.t)).sort((x, y) => x[0].t - y[0].t);
  const arquivados = useArquivados();
  const [verArquivados, setVerArquivados] = useState(false);
  const todos = [...srv.avisos].sort((a, b) => Number(!!b.fixado) - Number(!!a.fixado) || b.criado.localeCompare(a.criado));
  // encerrados (passou a validade) vão para Arquivados de todo mundo, com a data em que encerraram
  const avisos = todos.filter((a) => visivel(arquivados, a) && !encerrado(a, agora));
  const guardados = todos
    .filter((a) => (arquivado(arquivados, a) || encerrado(a, agora)) && !removido(arquivados, a))
    .sort((a, b) => b.criado.localeCompare(a.criado));
  const soEncerrados = guardados.every((a) => encerrado(a, agora));

  // o que está na seção aberta conta como visto (inclusive o que chegar enquanto a pessoa olha)
  const focada = useIsFocused();
  const novo = useNovidadesAgenda();
  useEffect(() => {
    if (!focada) return;
    if (aba === 'agenda') marcarVisto('eventos', futuros);
    else marcarVisto('avisos', avisos);
  });
  const confirmarRemover = (a: AvisoT, desfazer?: () => void) =>
    Alert.alert('Tem certeza?', `O aviso some deste ${APARELHO} de vez. Para os outros membros nada muda.`, [
      { text: 'Cancelar', style: 'cancel', onPress: desfazer },
      { text: 'Remover', style: 'destructive', onPress: () => remover(a) },
    ]);

  return (
    <Fundo aba>
      <ScrollView
        ref={lista}
        scrollToOverflowEnabled
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={puxando} onRefresh={puxar} tintColor={c.destaque} colors={[c.destaque]} />}>
        <TituloTela titulo="Agenda" sub="Missas, eventos e avisos" direita={<BotaoLiturgico onPress={() => router.push('/calendario')} />} />

        {/* Missas e eventos / Avisos: tocar ou arrastar a bolha (como na barra de abas) */}
        <View onLayout={(e) => (largura.value = e.nativeEvent.layout.width)}>
          <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
            <Segmentos
              valor={aba}
              mudar={setAba}
              segmentos={[
                { valor: 'agenda', rotulo: 'Missas e eventos', ponto: novo.eventos && aba !== 'agenda' },
                { valor: 'avisos', rotulo: 'Avisos', ponto: novo.avisos && aba !== 'avisos' },
              ]}
            />
          </View>

          {srv.admin ? (
            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
              <BotaoMais texto="Missa ou evento" onPress={() => router.push('/editar-evento')} />
              <BotaoMais texto="Aviso" onPress={() => router.push('/editar-aviso')} />
            </View>
          ) : null}

          {srv.erro && !srv.atualizado ? (
            <Secao>
              <Aviso icone="wifi.slash" texto={`Não foi possível falar com o servidor da Comunidade (${srv.erro}). Puxe para baixo para tentar de novo.`} />
            </Secao>
          ) : null}

          <Animated.View style={estiloConteudo}>
            {aba === 'agenda' ? (
              <>
                <CalendarioAgenda eventos={srv.eventos} />
                {rotinas.length ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Espaco.m, marginHorizontal: Espaco.xl, marginBottom: Espaco.l }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.texto, fontSize: 15 }}>Mostrar rotinas</Text>
                      <Text style={{ color: c.textoFraco, fontSize: 12.5, marginTop: 1 }}>
                        Horários fixos: missas da semana, adoração, grupos{aj.suasComissoes.length ? ', sua comissão' : ''}. Os de hoje aparecem sempre.
                      </Text>
                    </View>
                    <Chave valor={aj.mostrarRotinas} mudar={(v) => mudarAjustes({ mostrarRotinas: v })} />
                  </View>
                ) : null}
                {porDia.length ? (
                  porDia.map((doDia) => (
                    <Secao key={doDia[0].k} titulo={dataLonga(new Date(doDia[0].t))}>
                      {doDia.map((it, i) =>
                        it.e ? (
                          <LinhaEvento key={it.k} e={it.e} ultimo={i === doDia.length - 1} />
                        ) : (
                          <LinhaRotina key={it.k} o={it.o!} agora={agora} ultimo={i === doDia.length - 1} />
                        ),
                      )}
                    </Secao>
                  ))
                ) : (
                  <Secao>
                    <Aviso
                      icone="calendar.badge.clock"
                      texto={temMais ? `Nenhuma missa ou evento nos próximos ${dias} dias.` : 'Nenhuma missa ou evento agendado por enquanto.'}
                    />
                  </Secao>
                )}
                {temMais ? (
                  <Pressable
                    onPress={() => {
                      toque();
                      setDias((d) => (d < 30 ? 30 : d + 30));
                    }}
                    style={({ pressed }) => ({ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24, marginBottom: Espaco.l, opacity: pressed ? 0.5 : 1 })}>
                    <Text style={{ color: c.destaque, fontSize: 16, fontWeight: '600' }}>Ver mais…</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                {avisos.length ? (
                  avisos.map((a) => (
                    // os de baixo sobem devagar quando um sai
                    <Animated.View key={a.id} layout={LinearTransition.duration(280)}>
                      <DeslizarParaArquivar cor={Marca.ouro} onArquivar={() => arquivar(a, true, srv.avisos)}>
                        {(sair) => <CartaoAviso a={a} onArquivar={sair} />}
                      </DeslizarParaArquivar>
                    </Animated.View>
                  ))
                ) : (
                  <Secao>
                    <Aviso icone="megaphone" texto={guardados.length ? 'Nenhum aviso novo.' : 'Nenhum aviso por enquanto.'} />
                  </Secao>
                )}
                {guardados.length ? (
                  <Secao>
                    <Linha
                      titulo={`Arquivados (${guardados.length})`}
                      sub={soEncerrados ? 'Avisos que já passaram' : 'Os que você arquivou e os que já passaram'}
                      icone={verArquivados ? 'chevron.up' : 'archivebox'}
                      onPress={() => setVerArquivados((v) => !v)}
                      ultimo={!verArquivados}
                    />
                    {verArquivados
                      ? guardados.map((a, i) => {
                          const fim = encerrado(a, agora);
                          return (
                            <Animated.View key={a.id} layout={LinearTransition.duration(260)}>
                              <DeslizarComAcoes
                                onTocar={() => router.push({ pathname: '/aviso', params: { id: a.id } })}
                                acoes={[
                                  // encerrado não volta para a lista (a validade é para todos); só sai deste aparelho
                                  ...(fim ? [] : [{ texto: 'Voltar', icone: 'tray.and.arrow.up' as const, cor: Marca.ouro, onPress: (fechar: () => void) => (fechar(), arquivar(a, false)) }]),
                                  { texto: 'Remover', icone: 'trash', cor: '#C0392B', onPress: (fechar) => confirmarRemover(a, fechar) },
                                ]}>
                                <Linha
                                  titulo={a.titulo}
                                  sub={
                                    fim
                                      ? `Encerrado em ${dataHoraCurta(new Date(a.venceEm!))} · deslize para remover`
                                      : `${dataHoraCurta(new Date(a.criado))} · deslize para voltar ou remover`
                                  }
                                  seta
                                  ultimo={i === guardados.length - 1}
                                />
                              </DeslizarComAcoes>
                            </Animated.View>
                          );
                        })
                      : null}
                  </Secao>
                ) : null}
              </>
            )}
          </Animated.View>
        </View>
        <View style={{ height: 40 + folga }} />
      </ScrollView>
    </Fundo>
  );
}

function CartaoAviso({ a, onArquivar }: { a: AvisoT; onArquivar: () => void }) {
  const c = usePaleta();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push({ pathname: '/aviso', params: { id: a.id } })} style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
      <Vidro style={{ borderRadius: 24 }}>
        {a.imagem ? <ImagemInteira uri={a.imagem} /> : a.video ? <CapaVideo video={a.video} /> : null}
        <View style={{ padding: Espaco.l }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {a.fixado ? <Icone nome="pin.fill" tamanho={13} /> : null}
            <Text style={{ color: c.textoFraco, fontSize: 12.5, flex: 1 }}>
              {dataHoraCurta(new Date(a.criado))}
              {a.venceEm ? ` → ${dataHoraCurta(new Date(a.venceEm))}` : ''}
              {a.atualizado && Date.parse(a.atualizado) - Date.parse(a.criado) > 60_000 ? ' · corrigido' : ''}
            </Text>
            <Pressable
              onPress={() => {
                toque();
                onArquivar();
              }}
              hitSlop={10}>
              <Icone nome="archivebox" cor={c.textoFraco} tamanho={17} />
            </Pressable>
          </View>
          <Text style={{ color: c.texto, ...fonteTitulo(21), marginTop: 4 }}>{a.titulo}</Text>
          <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21, marginTop: 6 }} numberOfLines={4}>
            {a.texto}
          </Text>
        </View>
      </Vidro>
    </Pressable>
  );
}

/** Atalho para o Calendário litúrgico, no alto da Agenda: a palavra "Litúrgico" (um ícone só seria lido como o
 *  calendário dos eventos) e o ponto na cor litúrgica de hoje. Não acompanha a data escolhida no Rezar: a Agenda é
 *  sempre de hoje em diante. */
function BotaoLiturgico({ onPress }: { onPress: () => void }) {
  const c = usePaleta();
  const cor = diaLiturgico(hojeIso()).celebracao.cor;
  return (
    <Pressable
      onPress={() => {
        toque();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Calendário litúrgico"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Vidro interativo style={{ borderRadius: 18 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
          <Icone nome="calendar" tamanho={15} />
          <Text style={{ color: c.destaque, fontSize: 14.5, fontWeight: '600' }}>Litúrgico</Text>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COR_HEX[cor],
              borderWidth: cor === 'branco' ? 0.6 : 0,
              borderColor: c.textoFraco,
            }}
          />
        </View>
      </Vidro>
    </Pressable>
  );
}

function BotaoMais({ texto, onPress }: { texto: string; onPress: () => void }) {
  const c = usePaleta();
  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={() => {
        toque();
        onPress();
      }}>
      <Vidro interativo style={{ borderRadius: 18 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 }}>
          <Icone nome="plus" tamanho={15} />
          <Text style={{ color: c.destaque, fontWeight: '600' }}>{texto}</Text>
        </View>
      </Vidro>
    </Pressable>
  );
}
