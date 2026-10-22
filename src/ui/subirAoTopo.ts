// Tocar de novo na aba em que já se está sobe a tela até o topo (como nos apps da Apple).
// O iOS avisa o toque repetido como "tabPress" da própria aba; quando a aba ainda não está
// em foco (veio de outra aba), não faz nada.

import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, type ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSubirAoTopo() {
  const ref = useRef<ScrollView>(null);
  const navigation = useNavigation();
  const ins = useSafeAreaInsets();

  useEffect(() => {
    const sair = (navigation as any).addListener('tabPress', (e: any) => {
      if (!navigation.isFocused()) return;
      requestAnimationFrame(() => {
        if (e?.defaultPrevented) return;
        // a lista começa abaixo da barra de status (o iOS recua o conteúdo): o topo é o recuo negativo
        // (no Android o conteúdo já começa abaixo dela: o topo é zero)
        ref.current?.scrollTo({ y: Platform.OS === 'ios' ? -ins.top : 0, animated: true });
      });
    });
    return sair;
  }, [navigation, ins.top]);

  return ref;
}
