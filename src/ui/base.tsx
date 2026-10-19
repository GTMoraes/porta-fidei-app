import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { lerAjustes } from '@/estado/ajustes';
import { Espaco, Fontes, Marca, Raio, usePaleta } from '@/tema';

const VIDRO = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function toque() {
  if (lerAjustes().feedbackTatil) Haptics.selectionAsync().catch(() => {});
}

/** Fundo do app: gradiente quente (claro) ou azul-noite (escuro) */
export function Fundo({ children }: { children: ReactNode }) {
  const c = usePaleta();
  return (
    // o degradê é desenhado pela própria View (camada, não subview): assim a lista da tela fica sendo a
    // primeira subview e o iOS a encontra para subir ao topo quando se toca de novo na aba atual
    <View
      style={{
        flex: 1,
        backgroundColor: c.fundo[0],
        experimental_backgroundImage: `linear-gradient(160deg, ${c.fundo[0]} 0%, ${c.fundo[1]} 50%, ${c.fundo[2]} 100%)`,
      }}>
      {children}
    </View>
  );
}

/** Superfície de vidro (Liquid Glass no iOS 26; translúcido nos demais) */
export function Vidro({
  children,
  style,
  interativo,
  tinta,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  interativo?: boolean;
  tinta?: string;
}) {
  const c = usePaleta();
  if (VIDRO) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={interativo}
        tintColor={tinta ?? c.vidroTinta}
        colorScheme={c.escuro ? 'dark' : 'light'}
        style={[{ borderRadius: Raio.m, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        { borderRadius: Raio.m, backgroundColor: tinta ?? c.cartao, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borda, overflow: 'hidden' },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Icone({ nome, cor, tamanho = 20 }: { nome: SFSymbol; cor?: string; tamanho?: number }) {
  const c = usePaleta();
  return (
    <SymbolView
      name={nome}
      tintColor={cor ?? c.destaque}
      size={tamanho}
      weight="medium"
      fallback={<Text style={{ color: cor ?? c.destaque, fontSize: tamanho * 0.8 }}>•</Text>}
    />
  );
}

export function TituloTela({ titulo, sobre }: { titulo: string; sobre?: string }) {
  const c = usePaleta();
  return (
    <View style={{ paddingHorizontal: Espaco.xl, paddingTop: Espaco.s, paddingBottom: Espaco.m }}>
      {sobre ? <Text style={{ color: c.textoFraco, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' }}>{sobre}</Text> : null}
      <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 34, marginTop: 2 }}>{titulo}</Text>
    </View>
  );
}

export function Secao({ titulo, children, acao }: { titulo?: string; children: ReactNode; acao?: ReactNode }) {
  const c = usePaleta();
  return (
    <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.xl }}>
      {titulo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Espaco.s, marginHorizontal: Espaco.s }}>
          <Text style={{ color: c.textoSuave, fontSize: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{titulo}</Text>
          {acao}
        </View>
      ) : null}
      <Vidro>{children}</Vidro>
    </View>
  );
}

export function Linha({
  titulo,
  sub,
  icone,
  corIcone,
  direita,
  onPress,
  ultimo,
  seta = !!onPress,
}: {
  titulo: string;
  sub?: string;
  icone?: SFSymbol;
  corIcone?: string;
  direita?: ReactNode;
  onPress?: () => void;
  ultimo?: boolean;
  seta?: boolean;
}) {
  const c = usePaleta();
  const conteudo = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: Espaco.l, gap: Espaco.m }}>
      {icone ? (
        <View style={{ width: 30, alignItems: 'center' }}>
          <Icone nome={icone} cor={corIcone} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.texto, fontSize: 17 }}>{titulo}</Text>
        {sub ? <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {direita}
      {seta ? <Icone nome="chevron.right" cor={c.textoFraco} tamanho={14} /> : null}
    </View>
  );
  return (
    <View>
      {onPress ? (
        <Pressable
          onPress={() => {
            toque();
            onPress();
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
          {conteudo}
        </Pressable>
      ) : (
        conteudo
      )}
      {!ultimo ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separador, marginLeft: icone ? 58 : Espaco.l }} /> : null}
    </View>
  );
}

export function Chave({ valor, mudar }: { valor: boolean; mudar: (v: boolean) => void }) {
  return (
    <Switch
      value={valor}
      onValueChange={(v) => {
        toque();
        mudar(v);
      }}
      trackColor={{ true: Marca.ouro, false: undefined }}
    />
  );
}

export function Botao({
  titulo,
  onPress,
  icone,
  tipo = 'principal',
  desativado,
}: {
  titulo: string;
  onPress: () => void;
  icone?: SFSymbol;
  tipo?: 'principal' | 'secundario' | 'perigo';
  desativado?: boolean;
}) {
  const c = usePaleta();
  const cor = tipo === 'perigo' ? '#C0392B' : tipo === 'principal' ? Marca.ouro : c.destaque;
  return (
    <Pressable
      disabled={desativado}
      onPress={() => {
        toque();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: desativado ? 0.4 : pressed ? 0.7 : 1 })}>
      <Vidro interativo tinta={tipo === 'principal' ? 'rgba(188,140,68,0.55)' : undefined} style={{ borderRadius: 26 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 20 }}>
          {icone ? <Icone nome={icone} cor={tipo === 'principal' ? '#fff' : cor} tamanho={17} /> : null}
          <Text style={{ color: tipo === 'principal' ? '#fff' : cor, fontSize: 16, fontWeight: '600' }}>{titulo}</Text>
        </View>
      </Vidro>
    </Pressable>
  );
}

export function Aviso({ texto, icone = 'info.circle' }: { texto: string; icone?: SFSymbol }) {
  const c = usePaleta();
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: Espaco.l, alignItems: 'flex-start' }}>
      <Icone nome={icone} tamanho={18} />
      <Text style={{ color: c.textoSuave, flex: 1, fontSize: 14.5, lineHeight: 20 }}>{texto}</Text>
    </View>
  );
}
