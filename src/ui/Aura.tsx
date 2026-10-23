// Aura dourada pulsando em volta de um card, para chamar a atenção até a pessoa agir
// (ex.: baixar ou atualizar o conteúdo litúrgico). Com "Reduzir movimento" ligado no aparelho,
// a aura fica parada, mas continua visível.

import { useEffect, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Marca } from '@/tema';

export function AuraDourada({ children, raio = 24, style }: { children: ReactNode; raio?: number; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pulso = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * v.value }));
  return (
    <View style={style}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: raio + 3,
            borderWidth: 2,
            borderColor: Marca.ouro,
            boxShadow: '0 0 18px 4px rgba(188,140,68,0.7)',
          },
          pulso,
        ]}
      />
      {children}
    </View>
  );
}
