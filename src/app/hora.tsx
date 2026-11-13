// Uma Hora da Liturgia das Horas. A data fica no cabeçalho, ao lado da seta de voltar (tocar abre o calendário;
// pedido do seminarista, 0.7.0). Aberta pelo "Rezar agora" da Hoje (`agora`), o toque na data também troca a Hora.
// Laudes e Ofício das Leituras têm o botão "Invitatório", que abre o Invitatório (ele não é uma Hora: é o começo da
// primeira oração do dia), com a escolha do salmo e da antífona entre as estrofes.

import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { Pressable, Switch, Text, View } from 'react-native';

import { montarHora } from '@/conteudo/montar';
import { existe, lerDado, usePacote } from '@/conteudo/pacote';
import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { DIAS_SEMANA, diaLiturgico, hojeIso, somaDias } from '@/liturgia/calendario';
import { HORAS_CANONICAS, planoDaHora, type Hora } from '@/liturgia/horas';
import { antifonaInvitatorio, type DadosInvitatorio } from '@/liturgia/invitatorio';
import { usePaleta } from '@/tema';
import { Icone, toque, Vidro } from '@/ui/base';
import { PilulaData, SeletorDataLiturgica } from '@/ui/CalendarioLiturgico';
import { Leitor } from '@/ui/Leitor';
import { mostrarOpcoes } from '@/ui/Opcoes';
import { dataParaHora } from '@/util/datas';

export default function TelaHora() {
  const p = useLocalSearchParams<{ h: Hora; data?: string; agora?: string }>();
  const router = useRouter();
  // a Hora pode mudar aqui mesmo (pela data no cabeçalho, quando veio do "Rezar agora")
  const [h, setH] = useState<Hora>(p.h);
  // memória facultativa só muda Invitatório, Ofício das Leituras, Laudes e Vésperas (na Hora Média e nas Completas vale o dia)
  const aceitaMemoria = ['invitatorio', 'leituras', 'laudes', 'vesperas'].includes(h);
  const aj = useAjustes();
  const pacote = usePacote();
  const c = usePaleta();
  const [data, setData] = useState(p.data || dataParaHora(p.h));
  const [mexeuNaData, setMexeuNaData] = useState(false);
  const [memoria, setMemoria] = useState<string | undefined>();
  const [escolhendoDia, setEscolhendoDia] = useState(false); // calendário aberto (tocar na data)
  const [corpo, setCorpo] = useState<string | null>(null);
  const [dadosInv, setDadosInv] = useState<DadosInvitatorio | null | undefined>(undefined);
  const ehInvitatorio = h === 'invitatorio';
  // o seletor de memória facultativa pulsa uma vez a cada vez que se entra na tela
  // (não de novo quando os controles somem e voltam)
  const [pulso, setPulso] = useState(0);
  const pulsado = useRef(0);
  useFocusEffect(useCallback(() => setPulso((n) => n + 1), []));
  const tentarPulsar = (n: number) => {
    if (n <= pulsado.current) return false;
    pulsado.current = n;
    return true;
  };

  useEffect(() => {
    if (!ehInvitatorio) return;
    lerDado<DadosInvitatorio>('invitatorio.json').then((d) => setDadosInv(d ?? null));
  }, [ehInvitatorio, pacote.manifest]);

  const dia = useMemo(() => diaLiturgico(data), [data]);
  // Completas de madrugada abertas com o dia anterior (dataParaHora): avisa no texto
  const madrugada = h === 'completas' && data !== hojeIso() && data === somaDias(hojeIso(), -1) && new Date().getHours() < 4;
  const nomeDia = DIAS_SEMANA[dia.diaSemana].toLowerCase();
  const plano = useMemo(
    () =>
      planoDaHora(data, h, {
        existe,
        bienal: aj.bienal,
        memoriaEscolhida: memoria,
        invitatorio: aj.invitatorio,
        antifonaNasEstrofes: aj.antifonaNasEstrofes,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, h, aj.bienal, aj.invitatorio, aj.antifonaNasEstrofes, memoria, pacote.manifest],
  );

  useEffect(() => {
    let vivo = true;
    setCorpo(null);
    if (!pacote.manifest) {
      setCorpo('<p class="c"><span class="lacuna">O conteúdo litúrgico ainda não foi instalado. Vá em Ajustes › Conteúdo e Comunidade › Conteúdo litúrgico.</span></p>');
      return;
    }
    if (ehInvitatorio && dadosInv === undefined) return; // espera as antífonas
    const antifona = ehInvitatorio ? antifonaInvitatorio(dia, dadosInv ?? null, memoria) : undefined;
    montarHora(plano, aj, { antifonaInvitatorio: antifona }).then((m) => {
      if (!vivo) return;
      let html = m.corpo;
      if (!html) html = `<p class="c"><span class="lacuna">${plano.avisos[0] ?? 'Texto indisponível.'}</span></p>`;
      if (madrugada)
        html = `<p class="c"><span class="lacuna">Apesar de já ter passado da meia-noite, estas são as Completas do dia que você está encerrando (${nomeDia}).</span></p>` + html;
      if (dia.comemoracao && (h === 'laudes' || h === 'vesperas'))
        html = `<p class="c"><span class="lacuna">Comemoração: ${dia.comemoracao.nome}</span></p>` + html;
      setCorpo(html);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano, aj.repetirRespostas, aj.laudesAmpliada, dadosInv, madrugada]);

  const irParaDia = (d: string) => {
    setEscolhendoDia(false);
    setMemoria(undefined);
    setMexeuNaData(true);
    setData(d);
  };
  // trocar a Hora (só aberta pelo "Rezar agora"): se a pessoa não escolheu outro dia, vale o dia certo da Hora nova
  // (as Completas de madrugada são as do dia que terminou)
  const mudarHora = (nova: Hora) => {
    setMemoria(undefined);
    if (!mexeuNaData) setData(dataParaHora(nova));
    setH(nova);
  };
  const nomeHora = HORAS_CANONICAS.find((x) => x.id === h)?.curto;
  const tocarData = () => {
    toque();
    if (!p.agora) return setEscolhendoDia(true);
    mostrarOpcoes('Liturgia das Horas', [
      ...HORAS_CANONICAS.map((x) => ({ rotulo: `${x.id === h ? '✓ ' : ''}${x.nome}`, onPress: () => mudarHora(x.id) })),
      { rotulo: 'Outro dia…', onPress: () => setEscolhendoDia(true) },
    ]);
  };

  const comChips = dia.facultativas.length > 0 && !plano.primeirasVesperas && aceitaMemoria;
  // o Invitatório começa a primeira oração do dia: Laudes ou Ofício das Leituras
  const comInvitatorio = h === 'laudes' || h === 'leituras';
  const topo =
    comChips || comInvitatorio ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        {comInvitatorio ? (
          <Pressable
            onPress={() => {
              toque();
              router.push({ pathname: '/hora', params: { h: 'invitatorio', data } });
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Abrir o Invitatório">
            <Vidro style={{ borderRadius: 15 }} interativo>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Icone nome="bell" tamanho={12} />
                <Text style={{ color: c.destaque, fontSize: 12.5, fontWeight: '600' }}>Invitatório</Text>
                <Icone nome="chevron.right" cor={c.textoFraco} tamanho={9} />
              </View>
            </Vidro>
          </Pressable>
        ) : null}
        {comChips ? (
          <SeletorMemoria
            opcoes={dia.facultativas.filter((f) => !!f.slug).map((f) => ({ slug: f.slug!, nome: f.nome }))}
            escolhida={memoria}
            aoEscolher={setMemoria}
            pulso={pulso}
            tentarPulsar={tentarPulsar}
          />
        ) : null}
      </View>
    ) : undefined;

  // Invitatório: escolha do salmo e da antífona entre as estrofes (como no iLiturgia)
  const rodape = ehInvitatorio ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6 }}>
      <Text style={{ color: c.textoSuave, fontSize: 14, marginRight: 6 }}>Salmo</Text>
      {(['94', '23', '66', '99'] as const).map((sl) => (
        <Pressable
          key={sl}
          hitSlop={4}
          onPress={() => {
            toque();
            mudarAjustes({ invitatorio: sl });
          }}
          style={{ paddingHorizontal: 7, paddingVertical: 6 }}>
          <Text style={{ fontSize: 19, fontWeight: aj.invitatorio === sl ? '700' : '400', color: aj.invitatorio === sl ? c.destaque : c.textoFraco }}>{sl}</Text>
        </Pressable>
      ))}
      <View style={{ flex: 1 }} />
      <Text style={{ color: c.textoSuave, fontSize: 13, marginRight: 8, textAlign: 'right' }} numberOfLines={2}>
        Antífona{'\n'}nas estrofes
      </Text>
      <Switch
        value={aj.antifonaNasEstrofes}
        onValueChange={(v) => {
          toque();
          mudarAjustes({ antifonaNasEstrofes: v });
        }}
        trackColor={{ true: c.destaque }}
      />
    </View>
  ) : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitleAlign: 'center',
          headerTitle: () => (
            <PilulaData
              data={data}
              antes={p.agora ? nomeHora : undefined}
              dica={p.agora ? 'Troca a Hora ou o dia' : 'Abre o calendário para escolher o dia'}
              onPress={tocarData}
            />
          ),
        }}
      />
      <Leitor
        tipo="horas"
        rodape={rodape}
        alturaTopo={comChips && comInvitatorio ? 72 : 34}
        corpo={corpo}
        titulo={plano.titulo}
        subtitulo={plano.diaCelebrado.celebracao.nome}
        permitirSilencio={h === 'laudes' || h === 'vesperas'}
        topo={topo}
      />
      <SeletorDataLiturgica visivel={escolhendoDia} data={data} aoEscolher={irParaDia} aoFechar={() => setEscolhendoDia(false)} />
    </>
  );
}

/** "Memória facultativa: não celebrar ▾": uma linha discreta embaixo da data; o toque abre as opções do dia */
function SeletorMemoria({
  opcoes,
  escolhida,
  aoEscolher,
  pulso,
  tentarPulsar,
}: {
  opcoes: { slug: string; nome: string }[];
  escolhida?: string;
  aoEscolher: (slug: string | undefined) => void;
  pulso: number;
  tentarPulsar: (n: number) => boolean;
}) {
  const c = usePaleta();
  const brilho = useSharedValue(0);
  useEffect(() => {
    if (!pulso || !tentarPulsar(pulso)) return;
    const t = (v: number, ms: number) => withTiming(v, { duration: ms });
    // só um contorno dourado que acende e apaga, uma vez
    brilho.value = withDelay(1500, withSequence(t(1, 260), t(1, 200), t(0, 700)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulso]);
  const estiloBrilho = useAnimatedStyle(() => ({ opacity: brilho.value }));
  const atual = opcoes.find((o) => o.slug === escolhida);
  const nomeCurto = (n: string) => n.split(',')[0];
  const abrir = () => {
    toque();
    const marca = (ativo: boolean) => (ativo ? '✓ ' : '');
    mostrarOpcoes('Memória facultativa', [
      { rotulo: `${marca(!atual)}Não celebrar (féria)`, onPress: () => aoEscolher(undefined) },
      ...opcoes.map((o) => ({ rotulo: `${marca(o.slug === escolhida)}${o.nome}`, onPress: () => aoEscolher(o.slug) })),
    ]);
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPress={abrir} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Memória facultativa: ${atual ? atual.nome : 'não celebrar'}`} style={{ maxWidth: '100%' }}>
        <Vidro style={{ borderRadius: 15 }} interativo>
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 15, borderWidth: 1.2, borderColor: c.destaque }, estiloBrilho]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12 }}>
            <Text style={{ color: c.textoFraco, fontSize: 12.5, flexShrink: 1 }} numberOfLines={1}>
              Memória facultativa:{' '}
              <Text style={{ color: atual ? c.destaque : c.textoSuave, fontWeight: '600' }}>{atual ? nomeCurto(atual.nome) : 'não celebrar'}</Text>
            </Text>
            <Icone nome="chevron.down" cor={c.textoFraco} tamanho={10} />
          </View>
        </Vidro>
      </Pressable>
    </View>
  );
}
