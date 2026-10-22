// Lista de opções que sobe de baixo (ex.: "Abrir no mapa", ações do Missal).
// iOS: a folha de ações do próprio sistema. Android: não existe uma igual (o alerta aceita no
// máximo 3 botões), então a folha é desenhada aqui, montada uma vez na raiz do app.

import { useSyncExternalStore } from 'react';
import { ActionSheetIOS, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePaleta } from '@/tema';

export interface Opcao {
  rotulo: string;
  onPress: () => void;
  destrutivo?: boolean;
}

type Pedido = { titulo?: string; opcoes: Opcao[] } | null;

let atual: Pedido = null;
const ouvintes = new Set<() => void>();
const definir = (p: Pedido) => {
  atual = p;
  ouvintes.forEach((f) => f());
};

export function mostrarOpcoes(titulo: string | undefined, opcoes: Opcao[]) {
  if (Platform.OS === 'ios') {
    const destrutiva = opcoes.findIndex((o) => o.destrutivo);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: titulo,
        options: [...opcoes.map((o) => o.rotulo), 'Cancelar'],
        cancelButtonIndex: opcoes.length,
        destructiveButtonIndex: destrutiva >= 0 ? destrutiva : undefined,
      },
      (i) => i < opcoes.length && opcoes[i].onPress(),
    );
    return;
  }
  definir({ titulo, opcoes });
}

const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => void ouvintes.delete(f);
};

/** Folha de opções do Android. Fica montada na raiz (app/_layout.tsx). */
export function FolhaOpcoes() {
  const pedido = useSyncExternalStore(assinar, () => atual);
  const c = usePaleta();
  const ins = useSafeAreaInsets();
  if (Platform.OS === 'ios') return null;
  const fechar = () => definir(null);
  const escolher = (o: Opcao) => {
    fechar();
    // deixa a folha sair antes de abrir outra tela ou outro app
    setTimeout(o.onPress, 180);
  };
  const fundo = c.escuro ? '#1A2140' : '#FFFBF4';
  return (
    <Modal visible={!!pedido} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={fechar}>
      <Pressable onPress={fechar} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: fundo, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: ins.bottom + 8, maxHeight: '75%' }}>
          <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.separador, marginTop: 8, marginBottom: 4 }} />
          {pedido?.titulo ? (
            <Text style={{ color: c.textoFraco, fontSize: 13.5, textAlign: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 10 }}>{pedido.titulo}</Text>
          ) : null}
          <ScrollView bounces={false}>
            {pedido?.opcoes.map((o, i) => (
              <Pressable
                key={i}
                onPress={() => escolher(o)}
                android_ripple={{ color: c.separador }}
                style={{ paddingVertical: 16, paddingHorizontal: 24, borderTopWidth: i === 0 && !pedido.titulo ? 0 : 1, borderTopColor: c.separador }}>
                <Text style={{ color: o.destrutivo ? c.rubrica : c.texto, fontSize: 17 }}>{o.rotulo}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={fechar} android_ripple={{ color: c.separador }} style={{ paddingVertical: 16, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: c.separador }}>
            <Text style={{ color: c.destaque, fontSize: 17, fontWeight: '600' }}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
