// Seletor de seções com a "bolha" que desliza, como a barra de abas de baixo: tocar escolhe; arrastar leva a
// bolha com o dedo e, ao soltar, ela para na seção mais próxima. Só o seletor responde ao arrasto (o resto da
// tela, não). Usado na Agenda (Missas e eventos / Avisos).

import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { usePaleta } from '@/tema';
import { toque, Vidro } from './base';

const MOLA = { damping: 22, stiffness: 260, mass: 0.8 };

export interface Segmento<T extends string> {
  valor: T;
  rotulo: string;
  ponto?: boolean; // bolinha vermelha de novidade
}

export function Segmentos<T extends string>({ valor, segmentos, mudar }: { valor: T; segmentos: Segmento<T>[]; mudar: (v: T) => void }) {
  const c = usePaleta();
  const n = segmentos.length;
  const indice = Math.max(0, segmentos.findIndex((s) => s.valor === valor));
  const largura = useSharedValue(0);
  const pos = useSharedValue(indice); // onde está a bolha, em segmentos (0 = o primeiro)
  const inicio = useSharedValue(indice);

  // escolha por toque (ou de fora, por um link): a bolha anda até lá
  useEffect(() => {
    pos.value = withSpring(indice, MOLA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  // logo depois de um arrasto, o "toque" que o sistema às vezes solta junto (no botão onde o dedo começou) não vale
  const ultimoArrasto = useRef(0);
  const marcarArrasto = () => {
    ultimoArrasto.current = Date.now();
  };

  const escolher = (i: number) => {
    const s = segmentos[i];
    if (s && s.valor !== valor) {
      toque();
      mudar(s.valor);
    }
  };

  const arrasto = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onStart(() => {
      inicio.value = pos.value;
      scheduleOnRN(marcarArrasto);
    })
    .onUpdate((e) => {
      const seg = largura.value / n;
      if (seg <= 0) return;
      // acompanha o dedo, com uma folguinha nas pontas
      pos.value = Math.max(-0.12, Math.min(n - 1 + 0.12, inicio.value + e.translationX / seg));
    })
    .onEnd((e) => {
      const seg = largura.value / n;
      // soltar com o dedo ainda andando leva um pouco adiante (como na barra de abas)
      const projetado = seg > 0 ? pos.value + (e.velocityX / seg) * 0.08 : pos.value;
      const alvo = Math.max(0, Math.min(n - 1, Math.round(projetado)));
      pos.value = withSpring(alvo, MOLA);
      scheduleOnRN(marcarArrasto);
      scheduleOnRN(escolher, alvo);
    });

  const bolha = useAnimatedStyle(() => {
    const seg = largura.value / n;
    return { width: seg, transform: [{ translateX: pos.value * seg }] };
  });

  return (
    <GestureDetector gesture={arrasto}>
      <Vidro style={{ borderRadius: 22, padding: 4 }}>
        <View style={{ flexDirection: 'row' }} onLayout={(e) => (largura.value = e.nativeEvent.layout.width)}>
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 18, backgroundColor: c.escuro ? 'rgba(222,190,130,0.22)' : 'rgba(188,140,68,0.22)' },
              bolha,
            ]}
          />
          {segmentos.map((s, i) => (
            <Pressable
              key={s.valor}
              style={{ flex: 1 }}
              onPress={() => {
                if (Date.now() - ultimoArrasto.current > 350) escolher(i);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: s.valor === valor }}>
              <View style={{ paddingVertical: 9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: s.valor === valor ? c.texto : c.textoSuave, fontWeight: '600' }}>{s.rotulo}</Text>
                {s.ponto ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' }} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </Vidro>
    </GestureDetector>
  );
}
