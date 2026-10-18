// Gestos de deslizar da lista de Avisos.
//
// DeslizarParaArquivar: deslize "com intenção" (rápido, ou passando de 40% da largura) e o cartão
// termina de sair para a esquerda e é arquivado na hora; um deslize curto volta para o lugar.
// Atrás do cartão, o ícone de arquivar cresce conforme o cartão anda.
//
// DeslizarComAcoes: os botões ficam por baixo da linha e vão aparecendo conforme ela desliza (como no Mail).

import { useRef, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Espaco } from '@/tema';
import { Icone, toque } from './base';

const MOLA = { damping: 22, stiffness: 240, mass: 0.9 };

export function DeslizarParaArquivar({
  onArquivar,
  cor,
  raio = 24,
  children,
}: {
  onArquivar: () => void;
  cor: string;
  raio?: number;
  children: (sair: () => void) => ReactNode;
}) {
  const x = useSharedValue(0);
  const largura = useSharedValue(360);
  const passou = useSharedValue(false);

  const vibrar = () => toque();
  const sair = () => {
    x.value = withTiming(-largura.value - 40, { duration: 230 }, (ok) => {
      if (ok) scheduleOnRN(onArquivar);
    });
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      x.value = Math.min(0, e.translationX);
      const alem = -x.value > largura.value * 0.4;
      if (alem !== passou.value) {
        passou.value = alem;
        scheduleOnRN(vibrar);
      }
    })
    .onEnd((e) => {
      const intencao = -x.value > largura.value * 0.4 || (e.velocityX < -650 && -x.value > 36);
      if (intencao) {
        // termina o movimento na velocidade do dedo
        const v = Math.max(650, -e.velocityX);
        const falta = largura.value + 40 + x.value;
        x.value = withTiming(-largura.value - 40, { duration: Math.max(120, Math.min(260, (falta / v) * 1000)) }, (ok) => {
          if (ok) scheduleOnRN(onArquivar);
        });
      } else {
        x.value = withSpring(0, MOLA);
      }
      passou.value = false;
    });

  const cartao = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // o fundo só ocupa o espaço que o cartão já deixou (não aparece através do vidro)
  const fundo = useAnimatedStyle(() => ({
    width: Math.max(0, -x.value - 8),
    opacity: interpolate(-x.value, [0, 30, 120], [0, 0.6, 1], Extrapolation.CLAMP),
  }));
  const icone = useAnimatedStyle(() => {
    const p = -x.value / (largura.value * 0.4);
    return {
      opacity: interpolate(p, [0.1, 0.6], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(p, [0, 1, 1.2], [0.5, 1, 1.15], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View onLayout={(e) => (largura.value = e.nativeEvent.layout.width)}>
      {/* fundo com o ícone, do tamanho do cartão (o cartão tem margem embaixo) */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, bottom: Espaco.l, right: Espaco.l, borderRadius: raio, backgroundColor: cor, justifyContent: 'center', alignItems: 'flex-end', overflow: 'hidden' },
          fundo,
        ]}>
        <Animated.View style={[{ alignItems: 'center', gap: 4, width: 96 }, icone]}>
          <Icone nome="archivebox.fill" cor="#fff" tamanho={24} />
          <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '600' }}>Arquivar</Text>
        </Animated.View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={cartao}>{children(sair)}</Animated.View>
      </GestureDetector>
    </View>
  );
}

export interface AcaoLinha {
  texto: string;
  icone: any;
  cor: string;
  onPress: (fechar: () => void) => void;
}

export function DeslizarComAcoes({ acoes, onTocar, children }: { acoes: AcaoLinha[]; onTocar: () => void; children: ReactNode }) {
  const LARG = 84 * acoes.length;
  const x = useSharedValue(0);
  const inicio = useSharedValue(0);
  const aberto = useRef(false);

  const fechar = () => {
    aberto.current = false;
    x.value = withSpring(0, MOLA);
  };
  const marcar = (v: boolean) => (aberto.current = v);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onStart(() => {
      inicio.value = x.value;
    })
    .onUpdate((e) => {
      const alvo = Math.min(0, inicio.value + e.translationX);
      // depois de abrir tudo, resiste (como borracha)
      x.value = alvo < -LARG ? -LARG + (alvo + LARG) * 0.25 : alvo;
    })
    .onEnd((e) => {
      const abrir = e.velocityX < -400 || (e.velocityX < 400 && -x.value > LARG * 0.45);
      x.value = withSpring(abrir ? -LARG : 0, MOLA);
      scheduleOnRN(marcar, abrir);
    });

  const linha = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // a faixa dos botões tem a largura que a linha já andou; cada botão ocupa a sua parte dela
  const faixa = useAnimatedStyle(() => ({ width: Math.max(0, -x.value) }));
  const conteudo = useAnimatedStyle(() => ({
    opacity: interpolate(-x.value, [LARG * 0.25, LARG * 0.8], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(-x.value, [0, LARG], [0.7, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, right: 0, flexDirection: 'row', overflow: 'hidden' }, faixa]}>
        {acoes.map((a) => (
          <Pressable
            key={a.texto}
            onPress={() => {
              toque();
              a.onPress(fechar);
            }}
            style={{ flex: 1, backgroundColor: a.cor, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={[{ alignItems: 'center', gap: 4, width: 84 }, conteudo]}>
              <Icone nome={a.icone} cor="#fff" tamanho={19} />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{a.texto}</Text>
            </Animated.View>
          </Pressable>
        ))}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={linha}>
          <Pressable
            onPress={() => {
              if (aberto.current) fechar();
              else {
                toque();
                onTocar();
              }
            }}
            style={({ pressed }) => ({ opacity: pressed && !aberto.current ? 0.55 : 1 })}>
            {children}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
