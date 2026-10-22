import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { arquivado, arquivar, remover, removido, useArquivados, visivel } from '@/estado/arquivados';
import { eventosDaAgenda, marcarVisto, useNovidadesAgenda } from '@/estado/vistos';
import { atualizar, encerrado, useServidor, type Aviso as AvisoT, type Evento } from '@/servidor/api';
import { Espaco, Fontes, Marca, usePaleta } from '@/tema';
import { Aviso, Fundo, Icone, Linha, Secao, TituloTela, toque, Vidro } from '@/ui/base';
import { DeslizarComAcoes, DeslizarParaArquivar } from '@/ui/Deslizar';
import { dataLonga, diaEHora } from '@/util/datas';
import { CalendarioAgenda, LinhaEvento } from '@/ui/Agenda';
import { CapaVideo, ImagemInteira } from '@/ui/Midia';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { APARELHO } from '@/util/plataforma';

export default function Agenda() {
  const lista = useSubirAoTopo();
  const c = usePaleta();
  const router = useRouter();
  const srv = useServidor();
  const [aba, setAba] = useState<'agenda' | 'avisos'>('agenda');
  // links do app (botão "Ver avisos" etc.) escolhem a seção
  const { aba: abaPedida } = useLocalSearchParams<{ aba?: string }>();
  useEffect(() => {
    if (abaPedida === 'agenda' || abaPedida === 'avisos') setAba(abaPedida);
  }, [abaPedida]);
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
  const porDia = new Map<string, Evento[]>();
  for (const e of naJanela) {
    const k = new Date(e.inicio).toDateString();
    porDia.set(k, [...(porDia.get(k) ?? []), e]);
  }
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
        <TituloTela titulo="Agenda" sobre="Missas, eventos e avisos" />

        <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
          <Vidro style={{ borderRadius: 22, flexDirection: 'row', padding: 4 }}>
            {(['agenda', 'avisos'] as const).map((a) => (
              <Pressable
                key={a}
                style={{ flex: 1 }}
                onPress={() => {
                  toque();
                  setAba(a);
                }}>
                <View style={{ paddingVertical: 9, borderRadius: 18, backgroundColor: aba === a ? (c.escuro ? 'rgba(222,190,130,0.22)' : 'rgba(188,140,68,0.22)') : 'transparent' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: aba === a ? c.texto : c.textoSuave, fontWeight: '600' }}>{a === 'agenda' ? 'Missas e eventos' : 'Avisos'}</Text>
                    {(a === 'agenda' ? novo.eventos : novo.avisos) && aba !== a ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' }} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))}
          </Vidro>
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

        {aba === 'agenda' ? (
          <>
            <CalendarioAgenda eventos={srv.eventos} />
            {porDia.size ? (
              [...porDia.entries()].map(([k, doDia]) => (
                <Secao key={k} titulo={dataLonga(new Date(doDia[0].inicio))}>
                  {doDia.map((e, i) => (
                    <LinhaEvento key={e.id} e={e} ultimo={i === doDia.length - 1} />
                  ))}
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
                                  ? `Encerrado em ${diaEHora(new Date(a.venceEm!))} · deslize para remover`
                                  : `${dataLonga(new Date(a.criado))} · deslize para voltar ou remover`
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
        <View style={{ height: 40 }} />
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
              {dataLonga(new Date(a.criado))}
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
          <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 21, marginTop: 4 }}>{a.titulo}</Text>
          <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21, marginTop: 6 }} numberOfLines={4}>
            {a.texto}
          </Text>
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
