import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { Pressable, Switch, Text, View } from 'react-native';

import { montarHora } from '@/conteudo/montar';
import { existe, lerDado, usePacote } from '@/conteudo/pacote';
import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { DIAS_SEMANA, diaLiturgico, hojeIso, somaDias } from '@/liturgia/calendario';
import { planoDaHora, type Hora } from '@/liturgia/horas';
import { antifonaInvitatorio, type DadosInvitatorio } from '@/liturgia/invitatorio';
import { usePaleta } from '@/tema';
import { Icone, toque, Vidro } from '@/ui/base';
import { SeletorDataLiturgica } from '@/ui/CalendarioLiturgico';
import { Leitor } from '@/ui/Leitor';
import { mostrarOpcoes } from '@/ui/Opcoes';
import { dataCurta, dataParaHora } from '@/util/datas';

export default function TelaHora() {
  const p = useLocalSearchParams<{ h: Hora; data?: string }>();
  // memória facultativa só muda Invitatório, Ofício das Leituras, Laudes e Vésperas (na Hora Média e nas Completas vale o dia)
  const aceitaMemoria = ['invitatorio', 'leituras', 'laudes', 'vesperas'].includes(p.h);
  const aj = useAjustes();
  const pacote = usePacote();
  const c = usePaleta();
  const [data, setData] = useState(p.data || dataParaHora(p.h));
  const [memoria, setMemoria] = useState<string | undefined>();
  const [escolhendoDia, setEscolhendoDia] = useState(false); // calendário aberto (tocar na data)
  const [corpo, setCorpo] = useState<string | null>(null);
  const [dadosInv, setDadosInv] = useState<DadosInvitatorio | null | undefined>(undefined);
  const ehInvitatorio = p.h === 'invitatorio';
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
  const madrugada = p.h === 'completas' && data !== hojeIso() && data === somaDias(hojeIso(), -1) && new Date().getHours() < 4;
  const nomeDia = DIAS_SEMANA[dia.diaSemana].toLowerCase();
  const plano = useMemo(
    () =>
      planoDaHora(data, p.h, {
        existe,
        bienal: aj.bienal,
        memoriaEscolhida: memoria,
        invitatorio: aj.invitatorio,
        antifonaNasEstrofes: aj.antifonaNasEstrofes,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, p.h, aj.bienal, aj.invitatorio, aj.antifonaNasEstrofes, memoria, pacote.manifest],
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
      if (dia.comemoracao && (p.h === 'laudes' || p.h === 'vesperas'))
        html = `<p class="c"><span class="lacuna">Comemoração: ${dia.comemoracao.nome}</span></p>` + html;
      setCorpo(html);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano, aj.repetirRespostas, aj.laudesAmpliada, dadosInv, madrugada]);

  const mudarDia = (n: number) => {
    toque();
    setMemoria(undefined);
    setData((d) => somaDias(d, n));
  };
  const irParaDia = (d: string) => {
    setEscolhendoDia(false);
    setMemoria(undefined);
    setData(d);
  };

  const topo = (
    <View style={{ gap: 6 }}>
      <Vidro style={{ borderRadius: 22 }} interativo>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => mudarDia(-1)} hitSlop={8} style={{ padding: 12 }}>
            <Icone nome="chevron.left" tamanho={16} />
          </Pressable>
          {/* tocar na data abre o calendário litúrgico para escolher o dia */}
          <Pressable
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityHint="Abre o calendário para escolher o dia"
            onPress={() => {
              toque();
              setEscolhendoDia(true);
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
              <Text style={{ color: c.texto, fontSize: 14, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
                {dataCurta(new Date(data + 'T12:00:00'))}
                {data === hojeIso() ? ' · hoje' : ''}
              </Text>
              <Icone nome="chevron.down" cor={c.textoFraco} tamanho={10} />
            </View>
            {/* a celebração fica só embaixo do título da hora (pedido do seminarista: não repetir na barra) */}
          </Pressable>
          <Pressable onPress={() => mudarDia(1)} hitSlop={8} style={{ padding: 12 }}>
            <Icone nome="chevron.right" tamanho={16} />
          </Pressable>
        </View>
      </Vidro>
      {dia.facultativas.length && !plano.primeirasVesperas && aceitaMemoria ? (
        <SeletorMemoria
          opcoes={dia.facultativas.filter((f) => !!f.slug).map((f) => ({ slug: f.slug!, nome: f.nome }))}
          escolhida={memoria}
          aoEscolher={setMemoria}
          pulso={pulso}
          tentarPulsar={tentarPulsar}
        />
      ) : null}
    </View>
  );

  const comChips = dia.facultativas.length > 0 && !plano.primeirasVesperas && aceitaMemoria;

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
      <Leitor
        tipo="horas"
        rodape={rodape}
        alturaTopo={comChips ? 98 : 64}
        corpo={corpo}
        titulo={plano.titulo}
        subtitulo={plano.diaCelebrado.celebracao.nome}
        permitirSilencio={p.h === 'laudes' || p.h === 'vesperas'}
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
