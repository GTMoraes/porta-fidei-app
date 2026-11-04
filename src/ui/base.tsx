import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lerAjustes } from '@/estado/ajustes';
import { Espaco, Marca, Raio, fonteTitulo, usePaleta } from '@/tema';

import { MATERIAL } from './icones-android';

const VIDRO = Platform.OS === 'ios' && isLiquidGlassAvailable();
const ANDROID = Platform.OS === 'android';
const CHEIOS_ANDROID: Record<string, string> = { 'star.fill': '\u2605\uFE0E', 'heart.fill': '\u2665\uFE0E' };

// Símbolos que só existem a partir do iOS 17: nos iPhones que param no iOS 16 (8, 8 Plus e X) eles não aparecem.
// Lá entra o equivalente que já existe no 16; do 17 em diante, nada muda.
const VERSAO_IOS = Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) || 0 : 0;
const SO_NO_IOS_17: Record<string, string> = {
  'sun.horizon': 'sun.max',
  'sun.horizon.fill': 'sun.max.fill',
  'book.pages': 'book',
  'photo.badge.plus': 'photo',
};
export function simbolo(nome: SFSymbol): SFSymbol {
  return VERSAO_IOS > 0 && VERSAO_IOS < 17 ? ((SO_NO_IOS_17[nome] as SFSymbol | undefined) ?? nome) : nome;
}

export function toque() {
  if (lerAjustes().feedbackTatil) Haptics.selectionAsync().catch(() => {});
}

/** Fundo do app: gradiente quente (claro) ou azul-noite (escuro) */
/**
 * Altura do teclado no Android. Lá o app ocupa a tela inteira (de ponta a ponta) e a janela não
 * encolhe sozinha quando o teclado abre: a tela tem de abrir espaço, senão o campo fica por baixo dele.
 */
function useAlturaTecladoAndroid() {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    if (!ANDROID) return;
    const abre = Keyboard.addListener('keyboardDidShow', (e) => setAltura(e.endCoordinates.height));
    const fecha = Keyboard.addListener('keyboardDidHide', () => setAltura(0));
    return () => {
      abre.remove();
      fecha.remove();
    };
  }, []);
  return altura;
}

/**
 * Fundo das telas. No Android o app desenha atrás das barras do sistema e não existe o recuo
 * automático do iOS: as abas (sem cabeçalho) descem o conteúdo abaixo da barra de status, e as
 * demais telas sobem o fim do conteúdo acima da barra de navegação do aparelho.
 */
export function Fundo({ children, aba }: { children: ReactNode; aba?: boolean }) {
  const c = usePaleta();
  const ins = useSafeAreaInsets();
  const teclado = useAlturaTecladoAndroid();
  const recuo = ANDROID ? (aba ? { paddingTop: ins.top } : { paddingBottom: Math.max(ins.bottom, teclado) }) : null;
  return (
    <View style={[{ flex: 1, backgroundColor: c.fundo[0] }, recuo]}>
      <LinearGradient colors={c.fundo} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
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
  // a fonte do Material Symbols do Android só tem o desenho vazado: onde o cheio indica um estado
  // (estrela de favorito marcada), vai o caractere cheio
  const cheio = ANDROID ? CHEIOS_ANDROID[nome] : undefined;
  if (cheio)
    return (
      <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: cor ?? c.destaque, fontSize: tamanho * 1.05, lineHeight: tamanho * 1.25, includeFontPadding: false, textAlign: 'center' }}>{cheio}</Text>
      </View>
    );
  return (
    <SymbolView
      name={Platform.OS === 'android' ? { ios: nome, android: MATERIAL[nome] } : simbolo(nome)}
      tintColor={cor ?? c.destaque}
      size={tamanho}
      weight="medium"
      fallback={<Text style={{ color: cor ?? c.destaque, fontSize: tamanho * 0.8 }}>•</Text>}
    />
  );
}

/** Título grande das abas. O cabeçalho começa um pouco abaixo da barra de status (pedido do design);
 *  `sub`: uma linha de explicação embaixo do título (ex.: Agenda); `direita`: um controle ao lado do título
 *  (ex.: a folhinha com a data do Rezar). */
export function TituloTela({ titulo, sub, direita }: { titulo: string; sub?: string; direita?: ReactNode }) {
  const c = usePaleta();
  return (
    <View style={{ paddingHorizontal: Espaco.xl, paddingTop: Espaco.xl, paddingBottom: Espaco.m, flexDirection: 'row', alignItems: 'center', gap: Espaco.m }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.texto, ...fonteTitulo(34) }}>{titulo}</Text>
        {sub ? <Text style={{ color: c.textoSuave, fontSize: 15, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {direita}
    </View>
  );
}

/** Título no alto das telas que abrem por cima das abas (páginas de seção, da Comunidade);
 *  `sub`: uma linha embaixo (ex.: o dia escolhido no Rezar) */
export function TituloPagina({ titulo, sobre, sub }: { titulo: string; sobre?: string; sub?: string }) {
  const c = usePaleta();
  return (
    <View style={{ paddingHorizontal: Espaco.xl, paddingTop: Espaco.s, paddingBottom: Espaco.l }}>
      {sobre ? <Text style={{ color: c.destaque, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>{sobre}</Text> : null}
      <Text style={{ color: c.texto, ...fonteTitulo(30), marginTop: sobre ? 4 : 0 }}>{titulo}</Text>
      {sub ? <Text style={{ color: c.textoSuave, fontSize: 15, marginTop: 4 }}>{sub}</Text> : null}
    </View>
  );
}

/**
 * Grupo com título. `grande`: título forte, em negrito (as seções da Hoje, que precisam de hierarquia);
 * sem ele, o rótulo pequeno em maiúsculas dos grupos de lista. `solto`: sem o cartão em volta (o conteúdo
 * desenha os próprios cartões).
 */
export function Secao({ titulo, children, acao, grande, solto }: { titulo?: string; children: ReactNode; acao?: ReactNode; grande?: boolean; solto?: boolean }) {
  const c = usePaleta();
  return (
    <View style={{ marginHorizontal: Espaco.l, marginBottom: grande ? Espaco.xxl : Espaco.xl }}>
      {titulo ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: grande ? 'flex-end' : 'center',
            justifyContent: 'space-between',
            marginBottom: grande ? Espaco.m : Espaco.s,
            marginHorizontal: Espaco.s,
          }}>
          {grande ? (
            <Text style={{ color: c.texto, ...fonteTitulo(22), flex: 1 }} accessibilityRole="header">
              {titulo}
            </Text>
          ) : (
            <Text style={{ color: c.textoSuave, fontSize: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{titulo}</Text>
          )}
          {acao}
        </View>
      ) : null}
      {solto ? children : <Vidro>{children}</Vidro>}
    </View>
  );
}

/** Ícone branco num quadrado colorido (as linhas que abrem as seções do Rezar, dos Ajustes e da Comunidade) */
export function IconeQuadrado({ nome, fundo, tamanho = 30 }: { nome: SFSymbol; fundo: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, borderRadius: Math.round(tamanho * 0.27), backgroundColor: fundo, alignItems: 'center', justifyContent: 'center' }}>
      <Icone nome={nome} cor="#FFFFFF" tamanho={Math.round(tamanho * 0.56)} />
    </View>
  );
}

export function Linha({
  titulo,
  sub,
  icone,
  corIcone,
  quadrado,
  direita,
  onPress,
  ultimo,
  seta = !!onPress,
}: {
  titulo: string;
  sub?: string;
  icone?: SFSymbol;
  corIcone?: string;
  /** cor do quadrado atrás do ícone (ícone branco); sem ela, o ícone vai solto na cor do tema */
  quadrado?: string;
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
          {quadrado ? <IconeQuadrado nome={icone} fundo={quadrado} /> : <Icone nome={icone} cor={corIcone} />}
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
      thumbColor={ANDROID ? (valor ? '#FFF8EC' : '#F3F0EA') : undefined}
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
      <Vidro interativo tinta={tipo === 'principal' ? c.ouroCheio : undefined} style={{ borderRadius: 26 }}>
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
