// Pílula discreta "App atualizado" no alto da tela, na primeira abertura depois de uma atualização pelo ar.
// Some sozinha em 3,5 s; também some ao tocar ou deslizar (para cima ou para os lados).

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { usePaleta } from '@/tema';
import { Icone } from './base';

const CHAVE = 'pf.ota.ultimaVista';

export function PilulaAtualizado() {
  const c = usePaleta();
  const ins = useSafeAreaInsets();
  const [mostrar, setMostrar] = useState(false);
  const y = useSharedValue(-20);
  const x = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const atual = Updates.isEmbeddedLaunch ? 'embutida' : (Updates.updateId ?? 'embutida');
    (async () => {
      try {
        const antes = await AsyncStorage.getItem(CHAVE);
        await AsyncStorage.setItem(CHAVE, atual);
        // só quando está rodando uma atualização pelo ar diferente da última vista (não na primeira vez do app)
        if (antes && antes !== atual && atual !== 'embutida') setMostrar(true);
      } catch {}
    })();
  }, []);

  const sumir = () => setMostrar(false);
  const fechar = (dx = 0, dy = -30) => {
    'worklet';
    x.value = withTiming(dx, { duration: 200 });
    y.value = withTiming(dy, { duration: 200 });
    op.value = withTiming(0, { duration: 200 }, (ok) => ok && scheduleOnRN(sumir));
  };

  useEffect(() => {
    if (!mostrar) return;
    y.value = withTiming(0, { duration: 260 });
    op.value = withTiming(1, { duration: 260 });
    const t = setTimeout(() => fechar(), 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrar]);

  const toque = Gesture.Tap().onEnd(() => fechar());
  const arrasto = Gesture.Pan()
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 40) fechar(e.translationX > 0 ? 220 : -220, 0);
      else if (e.translationY < -15) fechar(0, -40);
      else {
        x.value = withTiming(0);
        y.value = withTiming(0);
      }
    });

  const estilo = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: x.value }, { translateY: y.value }] }));

  if (!mostrar) return null;
  return (
    <GestureDetector gesture={Gesture.Exclusive(arrasto, toque)}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: ins.top + 6,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 16,
            backgroundColor: c.escuro ? 'rgba(40,48,80,0.92)' : 'rgba(255,252,246,0.95)',
            borderWidth: 0.5,
            borderColor: c.borda,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          },
          estilo,
        ]}>
        <Icone nome="checkmark.circle.fill" cor={c.destaque} tamanho={13} />
        <Text style={{ color: c.texto, fontSize: 13, fontWeight: '500' }}>App atualizado</Text>
      </Animated.View>
    </GestureDetector>
  );
}
