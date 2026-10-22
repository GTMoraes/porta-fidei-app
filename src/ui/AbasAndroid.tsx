// Barra de abas do Android, desenhada pelo app: translúcida, com o conteúdo passando por trás
// desfocado (Android 12 ou mais novo; nos mais antigos fica quase opaca, sem desfoque), e o brasão
// da Comunidade maior que os outros ícones. O iPhone continua com a barra nativa (vidro do iOS 26).
//
// O desfoque precisa que a barra fique FORA da área desfocada: por isso as abas (JS) ficam dentro de
// um BlurTargetView e a barra é desenhada ao lado, recebendo o estado das abas por uma "ponte".

import { BlurTargetView, BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNovidadesAgenda } from '@/estado/vistos';
import { Marca, usePaleta } from '@/tema';
import { toque } from './base';

// (o expo-blur já está nas builds de iPhone e Android desde 12/10: não precisou de APK nem build nova)
export const AlvoDesfoque = BlurTargetView;

/** Altura da barra (sem a faixa dos gestos do Android) */
export const ALTURA_BARRA = 66;
const COM_DESFOQUE = Platform.OS === 'android' && Number(Platform.Version) >= 31;

/** Espaço no fim das listas das abas, para o último item não ficar escondido atrás da barra (só Android) */
export function useFolgaAbas() {
  const ins = useSafeAreaInsets();
  return Platform.OS === 'android' ? ALTURA_BARRA + ins.bottom + 12 : 0;
}

// ------------------------------------------------------------ ponte entre as abas e a barra
type PropsAbas = { state: any; navigation: any; descriptors: any };
let atual: PropsAbas | null = null;
const ouvintes = new Set<() => void>();
const publicar = (p: PropsAbas) => {
  if (atual && atual.state === p.state && atual.navigation === p.navigation) return;
  atual = p;
  ouvintes.forEach((f) => f());
};
/** Vai no `tabBar` das abas: não desenha nada, só passa o estado para a barra */
export function PonteAbas(p: PropsAbas) {
  useEffect(() => publicar(p));
  return null;
}

// ------------------------------------------------------------ a barra
type Item = { rota: string; rotulo: string; android?: AndroidSymbol; brasao?: boolean };
const ITENS: Item[] = [
  { rota: 'index', rotulo: 'Hoje', android: 'wb_twilight' },
  { rota: 'orar', rotulo: 'Rezar', android: 'menu_book' },
  { rota: 'comunidade', rotulo: 'Comunidade', brasao: true },
  { rota: 'agenda', rotulo: 'Agenda', android: 'event' },
  { rota: 'ajustes', rotulo: 'Ajustes', android: 'settings' },
];
const BRASAO = require('@/comunidade/brasao-aba.png');

export function BarraAbasAndroid({ alvo }: { alvo: RefObject<View | null> }) {
  const p = useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
  );
  const c = usePaleta();
  const ins = useSafeAreaInsets();
  const novo = useNovidadesAgenda();
  const [teclado, setTeclado] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setTeclado(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setTeclado(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  if (!p || teclado) return null;

  const tint = c.escuro ? Marca.ouroClaro : Marca.vinho;
  const apagado = c.textoFraco;
  const realce = c.escuro ? 'rgba(222,190,130,0.20)' : 'rgba(129,50,52,0.12)';
  // cor por cima do desfoque: translúcida com desfoque; quase opaca sem ele (Android 11 ou mais antigo)
  const veu = c.escuro ? `rgba(16,22,44,${COM_DESFOQUE ? 0.62 : 0.96})` : `rgba(251,247,239,${COM_DESFOQUE ? 0.66 : 0.96})`;
  const focada = p.state.routes[p.state.index]?.name;

  const tocar = (rota: string) => {
    const r = p.state.routes.find((x: any) => x.name === rota);
    if (!r) return;
    toque();
    const ev = p.navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
    if (focada !== rota && !ev.defaultPrevented) p.navigation.navigate(r.name, r.params);
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <View style={{ height: ALTURA_BARRA + ins.bottom, overflow: 'hidden' }}>
        <BlurView
          blurTarget={alvo}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={70}
          tint={c.escuro ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: veu }]} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.borda }} />
        <View style={{ flexDirection: 'row', height: ALTURA_BARRA, paddingHorizontal: 4 }}>
          {ITENS.map((it) => {
            const sel = focada === it.rota;
            const cor = sel ? tint : apagado;
            const ponto = it.rota === 'agenda' && (novo.eventos || novo.avisos);
            return (
              <Pressable
                key={it.rota}
                onPress={() => tocar(it.rota)}
                android_ripple={{ color: realce, borderless: true, radius: 40 }}
                accessibilityRole="tab"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={ponto ? `${it.rotulo}, tem novidade` : it.rotulo}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {it.brasao ? (
                  // o brasão ocupa o lugar do ícone e da pílula, maior que os outros
                  <Image source={BRASAO} tintColor={cor} contentFit="contain" style={{ width: 38, height: 38, marginBottom: 1 }} />
                ) : (
                  <View style={{ width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? realce : 'transparent', marginBottom: 4 }}>
                    <SymbolView name={{ ios: 'circle', android: it.android! }} tintColor={cor} size={23} />
                    {ponto ? <View style={{ position: 'absolute', top: 3, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#D93025' }} /> : null}
                  </View>
                )}
                <Text numberOfLines={1} style={{ color: cor, fontSize: 12, fontWeight: sel ? '700' : '500' }}>
                  {it.rotulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: ins.bottom }} />
      </View>
    </View>
  );
}
