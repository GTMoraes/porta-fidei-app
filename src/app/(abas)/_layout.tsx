import { isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  createScrollEdgeAppearanceFromOptions,
  createStandardAppearanceFromOptions,
} from 'expo-router/build/native-tabs/appearance';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router/js-tabs';
import { useRef } from 'react';
import { Platform, View } from 'react-native';

import { useNovidadesAgenda } from '@/estado/vistos';
import { Marca, usePaleta } from '@/tema';
import { AlvoDesfoque, BarraAbasAndroid, PonteAbas } from '@/ui/AbasAndroid';

// Antes do iOS 26 não existe o vidro líquido: a barra das abas ficava transparente sobre o conteúdo
// (o iOS a deixa assim quando acha que a tela está no fim da rolagem). Nesses aparelhos ela ganha
// fundo desfocado fixo.
const SEM_VIDRO = Platform.OS === 'ios' && !isLiquidGlassAvailable();

// Nomes das abas um pouco mais baixos, perto da borda de baixo da barra, para o brasão da
// Comunidade caber maior. O NativeTabs não repassa esse ajuste (e zera no estado selecionado),
// então a aparência de cada aba é montada aqui do mesmo jeito que ele monta, com o ajuste incluído.
// Só na barra de vidro (iOS 26): na barra antiga, mais baixa, o nome desceria demais e o brasão grande
// cobriria o nome; lá ficam o brasão menor e os nomes no lugar de sempre.
const DESCE_NOME = { horizontal: 0, vertical: 4 };
const VIDRO = Platform.OS === 'ios' && isLiquidGlassAvailable();
const BRASAO = VIDRO ? require('@/comunidade/brasao-aba.png') : require('@/comunidade/brasao-aba-classica.png');
const ANDROID = Platform.OS === 'android';

function aparencia(tint: string, antigo: { disableTransparentOnScrollEdge?: boolean; blurEffect?: any }) {
  const opcoes: any = {
    ...antigo,
    selectedLabelStyle: { color: tint },
    selectedIconColor: tint,
    titlePositionAdjustment: DESCE_NOME,
    selectedTitlePositionAdjustment: DESCE_NOME,
  };
  return {
    ios: {
      standardAppearance: createStandardAppearanceFromOptions(opcoes),
      scrollEdgeAppearance: createScrollEdgeAppearanceFromOptions(opcoes),
    },
  } as any;
}

export default function Abas() {
  return ANDROID ? <AbasDoAndroid /> : <AbasDoIphone />;
}

/** Android: abas em JS com a barra desenhada pelo app (translúcida, com desfoque e o brasão grande) */
function AbasDoAndroid() {
  const c = usePaleta();
  const alvo = useRef<View>(null);
  return (
    <View style={{ flex: 1, backgroundColor: c.fundo[0] }}>
      <AlvoDesfoque ref={alvo} style={{ flex: 1 }}>
        <Tabs
          tabBar={(p) => <PonteAbas state={p.state} navigation={p.navigation} descriptors={p.descriptors} />}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.fundo[0] }, animation: 'none' }}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="orar" />
          <Tabs.Screen name="comunidade" />
          <Tabs.Screen name="agenda" />
          <Tabs.Screen name="ajustes" />
        </Tabs>
      </AlvoDesfoque>
      <BarraAbasAndroid alvo={alvo} />
    </View>
  );
}

function AbasDoIphone() {
  const c = usePaleta();
  const novo = useNovidadesAgenda();
  const antigo = SEM_VIDRO
    ? ({ disableTransparentOnScrollEdge: true, blurEffect: c.escuro ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight' } as const)
    : {};
  const tint = c.escuro ? Marca.ouroClaro : Marca.vinho;
  // as funções de aparência só existem no iOS (no Android o módulo é outro)
  const nativo = VIDRO ? aparencia(tint, antigo) : undefined;
  return (
    <NativeTabs tintColor={tint} minimizeBehavior="onScrollDown" {...antigo}>
      <NativeTabs.Trigger unstable_nativeProps={nativo} name="index">
        <NativeTabs.Trigger.Label>Hoje</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.horizon', selected: 'sun.horizon.fill' }} md="wb_twilight" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger unstable_nativeProps={nativo} name="orar">
        <NativeTabs.Trigger.Label>Rezar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book.closed', selected: 'book.closed.fill' }} md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger unstable_nativeProps={nativo} name="comunidade">
        <NativeTabs.Trigger.Label>Comunidade</NativeTabs.Trigger.Label>
        {/* o brasão da Comunidade, na cor da aba (cinza fora de foco, vinho ou dourado selecionado) */}
        <NativeTabs.Trigger.Icon src={BRASAO} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger unstable_nativeProps={nativo} name="agenda">
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="event" />
        {/* pontinho vermelho: missa, evento ou aviso novo (ou alterado) que a pessoa ainda não viu */}
        <NativeTabs.Trigger.Badge hidden={!(novo.eventos || novo.avisos)} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger unstable_nativeProps={nativo} name="ajustes">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
