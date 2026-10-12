import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { carregarPacote } from '@/conteudo/pacote';
import { carregarAjustes } from '@/estado/ajustes';
import { reagendarLembretes } from '@/estado/lembretes';
import { atualizar, carregarCache, carregarToken } from '@/servidor/api';
import { Fontes, usePaleta } from '@/tema';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Raiz() {
  const [pronto, setPronto] = useState(false);
  const c = usePaleta();

  useEffect(() => {
    Promise.allSettled([carregarAjustes(), carregarPacote(), carregarCache(), carregarToken()]).finally(() => {
      setPronto(true);
      SplashScreen.hideAsync().catch(() => {});
      atualizar();
      reagendarLembretes().catch(() => {});
    });
  }, []);

  if (!pronto) return null;

  const base = c.escuro ? DarkTheme : DefaultTheme;
  const tema = { ...base, colors: { ...base.colors, background: 'transparent', primary: c.destaque, text: c.texto } };

  return (
    <ThemeProvider value={tema}>
      <StatusBar style={c.escuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerTintColor: c.destaque,
          headerTitleStyle: { fontFamily: Fontes.titulo, color: c.texto, fontSize: 19 },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.fundo[0] },
        }}>
        <Stack.Screen name="(abas)" options={{ headerShown: false }} />
        <Stack.Screen name="hora" options={{ title: '' }} />
        <Stack.Screen name="texto" options={{ title: '' }} />
        <Stack.Screen name="lista" options={{ title: '' }} />
        <Stack.Screen name="calendario" options={{ title: 'Calendário litúrgico' }} />
        <Stack.Screen name="dia" options={{ title: '' }} />
        <Stack.Screen name="liturgia" options={{ title: 'Liturgia Diária' }} />
        <Stack.Screen name="conteudo" options={{ title: 'Conteúdo litúrgico' }} />
        <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
        <Stack.Screen name="admin" options={{ title: 'Administração' }} />
        <Stack.Screen name="editar-evento" options={{ title: 'Missa ou evento', presentation: 'modal' }} />
        <Stack.Screen name="editar-aviso" options={{ title: 'Aviso', presentation: 'modal' }} />
        <Stack.Screen name="evento" options={{ title: '' }} />
        <Stack.Screen name="aviso" options={{ title: '' }} />
        <Stack.Screen name="sobre" options={{ title: 'Sobre o app' }} />
      </Stack>
    </ThemeProvider>
  );
}
