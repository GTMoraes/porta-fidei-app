// Card que sobe da Proposta de Oração com o ajuste "Pular instruções" (o convite no começo das instruções).
// Tocar fora fecha sem mudar nada; marcando, o card fica um instante para a pessoa ver e desce sozinho.

import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { Espaco, usePaleta } from '@/tema';
import { Chave, Fundo, Vidro } from '@/ui/base';

export default function AjusteInstrucoes() {
  const c = usePaleta();
  const router = useRouter();
  const aj = useAjustes();
  const brilho = useSharedValue(0);
  const saindo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // o mesmo contorno dourado das memórias facultativas, 0,7 s depois de o card aparecer
    const t = (v: number, ms: number) => withTiming(v, { duration: ms });
    brilho.value = withDelay(700, withSequence(t(1, 260), t(1, 200), t(0, 700)));
    return () => {
      if (saindo.current) clearTimeout(saindo.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const estiloBrilho = useAnimatedStyle(() => ({ opacity: brilho.value }));

  const mudar = (v: boolean) => {
    mudarAjustes({ pularInstrucoes: v });
    if (saindo.current) clearTimeout(saindo.current);
    if (v) saindo.current = setTimeout(() => router.back(), 1300);
  };

  return (
    <Fundo>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Espaco.l, paddingBottom: Espaco.l }}>
        <Text style={{ color: c.textoSuave, fontSize: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center', marginBottom: Espaco.m }}>Ajustes</Text>
        <View>
          <Vidro style={{ borderRadius: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Espaco.m, paddingVertical: 14, paddingHorizontal: Espaco.l }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.texto, fontSize: 17 }}>Pular instruções na Proposta de Oração</Text>
                <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 2 }}>As instruções de como rezar passam para o fim da proposta</Text>
              </View>
              <Chave valor={aj.pularInstrucoes} mudar={mudar} />
            </View>
          </Vidro>
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 20, borderWidth: 1.5, borderColor: c.destaque }, estiloBrilho]}
          />
        </View>
        <Text style={{ color: c.textoFraco, fontSize: 13, textAlign: 'center', marginTop: Espaco.m }}>Dá para mudar depois em Ajustes › Oração.</Text>
      </View>
    </Fundo>
  );
}
