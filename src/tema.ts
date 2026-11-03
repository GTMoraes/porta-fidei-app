import { Platform, useColorScheme, type TextStyle } from 'react-native';
import { lerAjustes, useAjustes } from '@/estado/ajustes';

// Cores tiradas do logo da Comunidade (a Comunicação pode ajustar depois)
export const Marca = {
  ouro: '#BC8C44',
  ouroClaro: '#DEBE82',
  vinho: '#813234',
  azul: '#223A73',
};

export interface Paleta {
  escuro: boolean;
  fundo: [string, string, string];
  texto: string;
  textoSuave: string;
  textoFraco: string;
  destaque: string; // dourado
  rubrica: string; // vermelho litúrgico
  vidroTinta: string;
  cartao: string; // fundo do "vidro" onde o vidro nativo não existe (Android e iPhone sem iOS 26): opaco, um tom diferente do fundo
  borda: string;
  separador: string;
  preenchimento: string; // etiquetas e campos dentro dos cartões
  folha: string; // folha de opções que sobe de baixo
  // superfícies cheias com texto branco por cima (botão principal, "Rezar agora"): quase opacas, para o texto ler bem
  vinhoCheio: string;
  ouroCheio: string;
  leitorFundo: string;
  leitorTexto: string;
}

// Claro: no padrão do iPhone (fundo branco, cartões no cinza claro do sistema, textos em preto e cinzas neutros)
const claro: Paleta = {
  escuro: false,
  fundo: ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
  texto: '#000000',
  textoSuave: 'rgba(60,60,67,0.85)',
  textoFraco: 'rgba(60,60,67,0.62)',
  destaque: '#8F6424',
  rubrica: '#A3262A',
  vidroTinta: 'rgba(242,242,247,0.85)',
  cartao: '#F2F2F7',
  borda: 'rgba(60,60,67,0.10)',
  separador: 'rgba(60,60,67,0.18)',
  preenchimento: 'rgba(118,118,128,0.12)',
  folha: '#FFFFFF',
  vinhoCheio: 'rgba(129,50,52,0.94)',
  ouroCheio: 'rgba(156,111,44,0.94)',
  leitorFundo: '#FFFFFF',
  leitorTexto: '#111111',
};

// Escuro: azul-noite liso e mais fundo, cartões um tom acima, títulos em branco e cinzas neutros (sem o bege)
const escuro: Paleta = {
  escuro: true,
  fundo: ['#080C18', '#080C18', '#080C18'],
  texto: '#FFFFFF',
  textoSuave: 'rgba(235,235,245,0.78)',
  textoFraco: 'rgba(235,235,245,0.58)',
  destaque: '#DEBE82',
  rubrica: '#E58A86',
  vidroTinta: 'rgba(30,38,64,0.85)',
  cartao: '#1C2339',
  borda: 'rgba(255,255,255,0.09)',
  separador: 'rgba(255,255,255,0.12)',
  preenchimento: 'rgba(255,255,255,0.10)',
  folha: '#1C2339',
  // no escuro, um vinho mais fechado (o cheio ficava gritante sobre o azul-noite)
  vinhoCheio: 'rgba(129,50,52,0.78)',
  ouroCheio: 'rgba(156,111,44,0.82)',
  leitorFundo: '#0B1020',
  // texto longo: cinza bem claro (branco puro no escuro cansa a vista), sem puxar para o bege
  leitorTexto: '#E6E6EB',
};

// Sépia: cor de papel, com o fundo mais claro que os cartões
const sepia: Paleta = {
  escuro: false,
  fundo: ['#F8F2E6', '#F8F2E6', '#F8F2E6'],
  texto: '#2B2116',
  textoSuave: '#5E5142',
  textoFraco: '#7E705E',
  destaque: '#8F6424',
  rubrica: '#A3262A',
  vidroTinta: 'rgba(239,229,209,0.85)',
  cartao: '#EFE5D1',
  borda: 'rgba(120,90,40,0.14)',
  separador: 'rgba(90,70,40,0.16)',
  preenchimento: 'rgba(120,90,40,0.10)',
  folha: '#FBF6EC',
  vinhoCheio: 'rgba(129,50,52,0.94)',
  ouroCheio: 'rgba(156,111,44,0.94)',
  leitorFundo: '#F3E5C6',
  leitorTexto: '#3B2C1A',
};

/** As três paletas (para testes e prévias; nas telas, use usePaleta) */
export const PALETAS = { claro, escuro, sepia };

export function usePaleta(): Paleta {
  const sistema = useColorScheme();
  const { tema } = useAjustes();
  if (tema === 'escuro') return escuro;
  if (tema === 'claro') return claro;
  if (tema === 'sepia') return sepia;
  return sistema === 'dark' ? escuro : claro;
}

export const Fontes = {
  serifa: Platform.select({ ios: 'Georgia', default: 'serif' }) as string,
  // citações em itálico (o carisma, trechos em destaque): ficam sempre com serifa, não são títulos
  citacao: Platform.select({ ios: 'Baskerville', default: 'serif' }) as string,
};

/**
 * Fonte dos títulos: sempre em negrito; sem serifa (a do próprio sistema: a do iPhone no iPhone, a do Android
 * no Android) ou com serifa (Baskerville), conforme Ajustes. A sem serifa em negrito é mais larga que a Baskerville,
 * então entra 10% menor para os títulos não quebrarem em mais linhas. Quem usa já chama usePaleta(), que redesenha
 * a tela quando o ajuste muda.
 */
export function fonteTitulo(tamanho?: number, altura?: number): TextStyle {
  const serifa = lerAjustes().fonteTitulos === 'serifa';
  const fator = serifa ? 1 : 0.9;
  const medidas: TextStyle = {};
  if (tamanho) medidas.fontSize = Math.round(tamanho * fator * 2) / 2;
  if (altura) medidas.lineHeight = Math.round(altura * fator);
  const familia = serifa ? Platform.select({ ios: 'Baskerville', default: 'serif' }) : Platform.select({ ios: 'System', default: 'sans-serif' });
  return { fontFamily: familia, fontWeight: '700', ...medidas };
}

/** "#RRGGBB" com transparência (ex.: o véu da barra de abas do Android, na cor da folha do tema) */
export function comAlfa(hex: string, alfa: number): string {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return `rgba(${n(0)},${n(2)},${n(4)},${alfa})`;
}

/** Quadrados coloridos dos ícones das seções (Rezar, Ajustes, Comunidade): iguais nos três temas, como nos
 *  Ajustes do iPhone. O azul é mais claro que o da marca para não sumir no cartão do tema escuro. */
export const Quadrado = {
  vinho: Marca.vinho,
  ouro: Marca.ouro,
  azul: '#3A5BA0',
  verde: '#2E7D4F',
  cinza: '#8E8E93',
};

export const Espaco = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };
export const Raio = { s: 12, m: 20, l: 28 };
