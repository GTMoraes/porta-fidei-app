import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { Marca, usePaleta } from '@/tema';

// Antes do iOS 26 não existe o vidro líquido: a barra das abas ficava transparente sobre o conteúdo
// (o iOS a deixa assim quando acha que a tela está no fim da rolagem). Nesses aparelhos ela ganha
// fundo desfocado fixo.
const SEM_VIDRO = Platform.OS === 'ios' && !isLiquidGlassAvailable();

export default function Abas() {
  const c = usePaleta();
  const antigo = SEM_VIDRO
    ? ({ disableTransparentOnScrollEdge: true, blurEffect: c.escuro ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight' } as const)
    : {};
  return (
    <NativeTabs tintColor={c.escuro ? Marca.ouroClaro : Marca.vinho} minimizeBehavior="onScrollDown" {...antigo}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Hoje</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.horizon', selected: 'sun.horizon.fill' }} md="wb_twilight" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orar">
        <NativeTabs.Trigger.Label>Rezar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book.closed', selected: 'book.closed.fill' }} md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="agenda">
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="event" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
