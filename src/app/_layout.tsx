import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState } from 'react-native';

import { carregarPacote } from '@/conteudo/pacote';
import { carregarChaveConteudo } from '@/conteudo/remoto';
import { carregarAjustes } from '@/estado/ajustes';
import { buscarNova } from '@/estado/atualizacaoApp';
import { registrarTarefaPush } from '@/estado/segundoPlano';
import { PilulaAtualizado } from '@/ui/PilulaAtualizado';
import { reagendarLembretes } from '@/estado/lembretes';
import { registrarPush } from '@/estado/push';
import { atualizar, carregarCache, carregarToken } from '@/servidor/api';
import { Fontes, usePaleta } from '@/tema';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Raiz() {
  const [pronto, setPronto] = useState(false);
  const c = usePaleta();

  useEffect(() => {
    Promise.allSettled([carregarAjustes(), carregarPacote(), carregarCache(), carregarToken(), carregarChaveConteudo()]).finally(() => {
      setPronto(true);
      SplashScreen.hideAsync().catch(() => {});
      atualizar();
      reagendarLembretes().catch(() => {});
      registrarPush(true);
      registrarTarefaPush();
    });
    // push recebido com o app aberto: atualiza avisos e agenda
    const sub = Notifications.addNotificationReceivedListener((n) => {
      if (n.request.trigger && (n.request.trigger as any).type === 'push') {
        atualizar();
        buscarNova();
      }
    });
    // ao voltar do segundo plano: busca proposta, avisos, agenda e jornadas novas (no máximo a cada 15 s).
    // Fora isso, quem avisa que tem novidade é o push silencioso do servidor (estado/segundoPlano.ts).
    let ultima = Date.now();
    const subApp = AppState.addEventListener('change', (st) => {
      if (st === 'active' && Date.now() - ultima > 15_000) {
        ultima = Date.now();
        atualizar();
      }
    });
    return () => {
      sub.remove();
      subApp.remove();
    };
  }, []);

  // toque numa notificação: abre o aviso, a proposta ou a jornada (push) ou a hora (lembrete local)
  const resposta = Notifications.useLastNotificationResponse();
  const tratada = useRef<string | null>(null);
  useEffect(() => {
    if (!pronto || !resposta) return;
    const id = resposta.notification.request.identifier;
    if (tratada.current === id || resposta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    tratada.current = id;
    const d = (resposta.notification.request.content.data ?? {}) as Record<string, unknown>;
    if (d.tipo === 'aviso' && typeof d.id === 'string') {
      const idAviso = d.id;
      atualizar().finally(() => setTimeout(() => router.push({ pathname: '/aviso', params: { id: idAviso } }), 300));
    } else if ((d.tipo === 'proposta' || d.tipo === 'jornada' || d.tipo === 'evento') && typeof d.id === 'string') {
      const rota = d.tipo === 'proposta' ? '/proposta' : d.tipo === 'jornada' ? '/jornada' : '/evento';
      const idItem = d.id;
      atualizar().finally(() => setTimeout(() => router.push({ pathname: rota, params: { id: idItem } }), 300));
    } else if (typeof d.hora === 'string') {
      const h = d.hora;
      setTimeout(() => router.push({ pathname: '/hora', params: { h } }), 300);
    }
  }, [pronto, resposta]);

  if (!pronto) return null;

  const base = c.escuro ? DarkTheme : DefaultTheme;
  const tema = { ...base, colors: { ...base.colors, background: 'transparent', primary: c.destaque, text: c.texto } };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        <Stack.Screen name="mapa-local" options={{ title: 'Marcar no mapa', presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="evento" options={{ title: '' }} />
        <Stack.Screen name="agenda-dia" options={{ title: '' }} />
        <Stack.Screen name="exame" options={{ title: '' }} />
        <Stack.Screen name="indice" options={{ title: 'Índice de A a Z' }} />
        <Stack.Screen name="sugestao" options={{ title: 'Enviar sugestão', presentation: 'modal' }} />
        <Stack.Screen name="sugestoes" options={{ title: 'Sugestões recebidas' }} />
        <Stack.Screen name="ir" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen
          name="ajuste-instrucoes"
          options={{ headerShown: false, presentation: 'formSheet', sheetAllowedDetents: [0.42], sheetGrabberVisible: true, sheetCornerRadius: 30, contentStyle: { backgroundColor: 'transparent' } }}
        />
        <Stack.Screen name="aviso" options={{ title: '' }} />
        <Stack.Screen name="sobre" options={{ title: 'Sobre o app' }} />
        <Stack.Screen name="buscar" options={{ title: 'Buscar' }} />
        <Stack.Screen name="martirologio" options={{ title: '' }} />
        <Stack.Screen name="pdf" options={{ title: '' }} />
        <Stack.Screen name="proposta" options={{ title: '' }} />
        <Stack.Screen name="propostas" options={{ title: 'Propostas de oração' }} />
        <Stack.Screen name="jornada" options={{ title: '' }} />
        <Stack.Screen name="jornadas" options={{ title: 'Jornadas de oração' }} />
        <Stack.Screen name="oracao" options={{ title: '' }} />
        <Stack.Screen name="admin-oracao" options={{ title: 'Oração da Comunidade' }} />
        <Stack.Screen name="editar-proposta" options={{ title: 'Proposta da semana', presentation: 'modal' }} />
        <Stack.Screen name="editar-jornada" options={{ title: 'Jornada', presentation: 'modal' }} />
        <Stack.Screen name="editar-oracao" options={{ title: 'Oração', presentation: 'modal' }} />
      </Stack>
      <PilulaAtualizado />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
