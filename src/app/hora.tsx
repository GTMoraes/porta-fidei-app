import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { montarHora } from '@/conteudo/montar';
import { existe, usePacote } from '@/conteudo/pacote';
import { useAjustes } from '@/estado/ajustes';
import { diaLiturgico, hojeIso, somaDias } from '@/liturgia/calendario';
import { planoDaHora, type Hora } from '@/liturgia/horas';
import { usePaleta } from '@/tema';
import { Icone, toque, Vidro } from '@/ui/base';
import { Leitor } from '@/ui/Leitor';
import { dataCurta } from '@/util/datas';

export default function TelaHora() {
  const p = useLocalSearchParams<{ h: Hora; data?: string }>();
  const aj = useAjustes();
  const pacote = usePacote();
  const c = usePaleta();
  const [data, setData] = useState(p.data || hojeIso());
  const [memoria, setMemoria] = useState<string | undefined>();
  const [corpo, setCorpo] = useState<string | null>(null);

  const dia = useMemo(() => diaLiturgico(data), [data]);
  const plano = useMemo(
    () => planoDaHora(data, p.h, { existe, bienal: aj.bienal, memoriaEscolhida: memoria, invitatorio: aj.invitatorio }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, p.h, aj.bienal, aj.invitatorio, memoria, pacote.manifest],
  );

  useEffect(() => {
    let vivo = true;
    setCorpo(null);
    if (!pacote.manifest) {
      setCorpo('<p class="c"><span class="lacuna">O conteúdo litúrgico ainda não foi instalado. Vá em Ajustes › Conteúdo litúrgico.</span></p>');
      return;
    }
    montarHora(plano, aj).then((m) => {
      if (!vivo) return;
      let html = m.corpo;
      if (!html) html = `<p class="c"><span class="lacuna">${plano.avisos[0] ?? 'Texto indisponível.'}</span></p>`;
      if (dia.comemoracao && (p.h === 'laudes' || p.h === 'vesperas'))
        html = `<p class="c"><span class="lacuna">Comemoração: ${dia.comemoracao.nome}</span></p>` + html;
      setCorpo(html);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano, aj.repetirRespostas, aj.laudesAmpliada]);

  const mudarDia = (n: number) => {
    toque();
    setMemoria(undefined);
    setData((d) => somaDias(d, n));
  };

  const topo = (
    <View style={{ gap: 8 }}>
      <Vidro style={{ borderRadius: 22 }} interativo>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => mudarDia(-1)} hitSlop={8} style={{ padding: 12 }}>
            <Icone nome="chevron.left" tamanho={16} />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => setData(hojeIso())}>
            <Text style={{ color: c.texto, textAlign: 'center', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
              {dataCurta(new Date(data + 'T12:00:00'))}
              {data === hojeIso() ? ' · hoje' : ''}
            </Text>
            <Text style={{ color: c.textoFraco, textAlign: 'center', fontSize: 12 }} numberOfLines={1}>
              {plano.diaCelebrado.celebracao.nome}
            </Text>
          </Pressable>
          <Pressable onPress={() => mudarDia(1)} hitSlop={8} style={{ padding: 12 }}>
            <Icone nome="chevron.right" tamanho={16} />
          </Pressable>
        </View>
      </Vidro>
      {dia.facultativas.length && !plano.primeirasVesperas && p.h !== 'completas' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Chip texto="Féria" ativo={!memoria} onPress={() => setMemoria(undefined)} />
          {dia.facultativas
            .filter((f) => f.slug)
            .map((f) => (
              <Chip key={f.slug} texto={f.nome.split(',')[0]} ativo={memoria === f.slug} onPress={() => setMemoria(f.slug)} />
            ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const comChips = dia.facultativas.length > 0 && !plano.primeirasVesperas && p.h !== 'completas';
  return (
    <Leitor
      alturaTopo={comChips ? 108 : 64}
      corpo={corpo}
      titulo={plano.titulo}
      subtitulo={plano.diaCelebrado.celebracao.nome}
      permitirSilencio={p.h === 'laudes' || p.h === 'vesperas'}
      topo={topo}
    />
  );
}

function Chip({ texto, ativo, onPress }: { texto: string; ativo: boolean; onPress: () => void }) {
  const c = usePaleta();
  return (
    <Pressable
      onPress={() => {
        toque();
        onPress();
      }}>
      <Vidro style={{ borderRadius: 16 }} tinta={ativo ? 'rgba(188,140,68,0.6)' : undefined}>
        <Text style={{ color: ativo ? '#fff' : c.textoSuave, fontSize: 13, paddingVertical: 6, paddingHorizontal: 12 }}>{texto}</Text>
      </Vidro>
    </Pressable>
  );
}
