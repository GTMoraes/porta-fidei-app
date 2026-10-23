import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { semana } from '@/comunidade/html';
import { diaAtual, diasFeitos, jornadasDeHoje, periodo, useFeitos } from '@/comunidade/jornadas';
import { dispensado, dispensar, useArquivados, visivel } from '@/estado/arquivados';
import { aplicarAtualizacao, buscarNova, useAtualizacaoPronta } from '@/estado/atualizacaoApp';
import { existe, imagemUri, usePacote } from '@/conteudo/pacote';
import { infoRemota, type InfoRemota } from '@/conteudo/remoto';
import { lerAjustes } from '@/estado/ajustes';
import { COR_HEX, NOME_GRAU, NOME_TEMPO, dataPorExtenso, diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { HORAS } from '@/liturgia/horas';
import { santosDoDia } from '@/liturgia/martirologio';
import { atualizar, encerrado, useServidor } from '@/servidor/api';
import { Espaco, Fontes, Marca, usePaleta } from '@/tema';
import { Aviso, Fundo, Icone, Linha, Secao, toque, Vidro } from '@/ui/base';
import { DeslizarParaArquivar } from '@/ui/Deslizar';
import { dataParaHora, horaSugerida, quando } from '@/util/datas';
import { LinhaEvento } from '@/ui/Agenda';
import { AuraDourada } from '@/ui/Aura';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { useFolgaAbas } from '@/ui/AbasAndroid';

const ROMANO = ['', 'I', 'II', 'III', 'IV'];

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

  // Ajuste "Iniciar com menu aberto": abre a aba Orar ao iniciar
  useEffect(() => {
    if (!jaAbriuMenu.current && lerAjustes().iniciarMenuAberto) {
      jaAbriuMenu.current = true;
      router.navigate('/orar');
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
  const pintura = cel.slug ? imagemUri(`paints/${cel.slug}`) : undefined;
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

  return (
    <Fundo aba>
      <ScrollView
        ref={lista}
        scrollToOverflowEnabled
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={puxando} onRefresh={puxar} tintColor={c.destaque} colors={[c.destaque]} />}>
        {/* Cabeçalho com o logo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Espaco.xl, paddingTop: Espaco.s }}>
          <Image source={require('@/assets/marca/logo-cor.png')} style={{ width: 44, height: 48 }} contentFit="contain" tintColor={c.escuro ? '#FFFFFF' : undefined} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.textoFraco, fontSize: 12.5, letterSpacing: 0.8, textTransform: 'uppercase' }}>Comunidade Católica</Text>
            <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 24 }}>Porta Fidei</Text>
          </View>
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
            <Vidro tinta="rgba(188,140,68,0.45)" interativo style={{ borderRadius: 20 }}>
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
                      <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 20, marginTop: 4 }}>{a.titulo}</Text>
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

        {/* Celebração do dia */}
        <Pressable
          onPress={() => {
            toque();
            router.push({ pathname: '/dia', params: { data: hoje } });
          }}
          style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.xl }}>
          <Vidro style={{ borderRadius: 28 }}>
            {pintura ? <Image source={{ uri: pintura }} style={{ height: 190 }} contentFit="cover" transition={250} /> : null}
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 6, backgroundColor: COR_HEX[cel.cor], opacity: cel.cor === 'branco' ? 1 : 0.9 }} />
              <View style={{ flex: 1, padding: Espaco.l, paddingLeft: Espaco.l }}>
                <Text style={{ color: c.destaque, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {NOME_GRAU[cel.grau]} · {NOME_TEMPO[dia.tempo]}
                </Text>
                <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 25, lineHeight: 31, marginTop: 6 }}>{cel.nome}</Text>
                {cel.nome !== dia.feria ? <Text style={{ color: c.textoSuave, fontSize: 14.5, marginTop: 6 }}>{dia.feria}</Text> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <Etiqueta texto={`Cor: ${cel.cor}`} cor={COR_HEX[cel.cor]} />
                  <Etiqueta texto={`Saltério: semana ${ROMANO[dia.semanaSalterio]}`} />
                  <Etiqueta texto={`Ano ${dia.anoDominical} · ${dia.anoFerial === 'I' ? 'ímpar' : 'par'}`} />
                </View>
                {dia.facultativas.length ? (
                  <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 10 }}>
                    Memória facultativa: {dia.facultativas.map((f) => f.nome).join('; ')}
                  </Text>
                ) : null}
                {dia.comemoracao ? (
                  <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 10 }}>Comemoração: {dia.comemoracao.nome}</Text>
                ) : null}
              </View>
            </View>
          </Vidro>
        </Pressable>


        {/* Rezar agora */}
        <Pressable
          onPress={() => {
            toque();
            router.push({ pathname: '/hora', params: { h: sugerida.id, data: dataParaHora(sugerida.id, agora) } });
          }}
          style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
          <Vidro tinta="rgba(129,50,52,0.55)" style={{ borderRadius: 24 }} interativo>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: Espaco.l, gap: 14 }}>
              <Icone nome="flame" cor="#fff" tamanho={26} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' }}>Rezar agora</Text>
                <Text style={{ color: '#fff', fontFamily: Fontes.titulo, fontSize: 23 }}>{sugerida.nome}</Text>
              </View>
              <Icone nome="chevron.right" cor="#fff" tamanho={16} />
            </View>
          </Vidro>
        </Pressable>

        {/* Grade das horas */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Espaco.l - 5, marginBottom: Espaco.xl }}>
          {HORAS.map((h) => (
            <View key={h.id} style={{ width: '50%', padding: 5 }}>
              <Pressable
                onPress={() => {
                  toque();
                  router.push({ pathname: '/hora', params: { h: h.id, data: dataParaHora(h.id) } });
                }}>
                <Vidro interativo style={{ borderRadius: 18 }}>
                  <View style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                    <Text style={{ color: c.texto, fontSize: 16.5, fontWeight: '600' }}>{h.curto}</Text>
                    <Text style={{ color: c.textoFraco, fontSize: 12.5, marginTop: 2 }}>{h.quando}</Text>
                  </View>
                </Vidro>
              </Pressable>
            </View>
          ))}
        </View>

        {proposta || jornadas.length ? (
          <Secao titulo="Oração da Comunidade">
            {proposta ? (
              <Linha
                titulo={proposta.titulo}
                sub={`Proposta de oração da semana · ${semana(proposta)}`}
                icone="doc.richtext"
                corIcone={Marca.vinho}
                onPress={() => router.push({ pathname: '/proposta', params: { id: proposta.id } })}
                ultimo={!jornadas.length}
              />
            ) : null}
            {jornadas.map((j, i) => {
              const n = diaAtual(j, hoje)!;
              const p = periodo(j, hoje)!;
              const rezou = diasFeitos(feitos, j, p).includes(hoje);
              return (
                <Linha
                  key={j.id}
                  titulo={j.titulo}
                  sub={`Dia ${n} de ${j.dias}${rezou ? ' · rezado hoje' : ''}`}
                  icone={rezou ? 'checkmark.circle.fill' : 'sparkles'}
                  corIcone={rezou ? Marca.ouro : undefined}
                  onPress={() => router.push({ pathname: '/jornada', params: { id: j.id } })}
                  ultimo={i === jornadas.length - 1}
                />
              );
            })}
          </Secao>
        ) : null}

        <Secao titulo="Para hoje">
          <Linha titulo="Liturgia Diária" sub="Leituras e orações da Missa" icone="book" onPress={() => router.push('/liturgia')} />
          {santoArquivo ? (
            <Linha
              titulo="Santo do dia"
              sub={cel.nome}
              icone="sparkles"
              onPress={() => router.push({ pathname: '/texto', params: { arquivo: santoArquivo, titulo: cel.nome, imagem: fotoSanto ? `santos/${cel.slug}` : '', mart: hoje } })}
            />
          ) : null}
          {santosDoDia(hoje).length ? (
            <Linha titulo="Outros santos de hoje" sub="Martirológio Romano" icone="person.3" onPress={() => router.push({ pathname: '/martirologio', params: { data: hoje } })} />
          ) : null}
          <Linha titulo="Calendário litúrgico" sub="Tempos, festas e cores" icone="calendar" onPress={() => router.push('/calendario')} ultimo />
        </Secao>

        <Secao
          titulo="Próximas missas e eventos"
          acao={
            <Pressable onPress={() => router.navigate('/agenda')}>
              <Text style={{ color: c.destaque, fontSize: 14 }}>Ver tudo</Text>
            </Pressable>
          }>
          {proximos.length ? (
            proximos.map((e, i) => (
              <LinhaEvento key={e.id} e={e} comData ultimo={i === proximos.length - 1} />
            ))
          ) : (
            <Aviso
              icone={srv.erro ? 'wifi.slash' : 'calendar.badge.clock'}
              texto={srv.erro && !srv.atualizado ? 'Não foi possível falar com o servidor da Comunidade. Puxe para baixo para tentar de novo.' : 'Nenhuma missa ou evento agendado por enquanto.'}
            />
          )}
        </Secao>

        {avisos.length ? (
          <Secao titulo="Avisos">
            {avisos.map((a, i) => (
              <Linha
                key={a.id}
                titulo={a.titulo}
                sub={a.texto.length > 90 ? a.texto.slice(0, 90) + '…' : a.texto}
                icone={a.fixado ? 'pin.fill' : 'megaphone'}
                onPress={() => router.push({ pathname: '/aviso', params: { id: a.id } })}
                ultimo={i === avisos.length - 1}
              />
            ))}
          </Secao>
        ) : null}
        <View style={{ height: 40 + folga }} />
      </ScrollView>
    </Fundo>
  );
}

function Etiqueta({ texto, cor }: { texto: string; cor?: string }) {
  const c = usePaleta();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
      {cor ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: cor, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.2)' }} /> : null}
      <Text style={{ color: c.textoSuave, fontSize: 12.5 }}>{texto}</Text>
    </View>
  );
}
