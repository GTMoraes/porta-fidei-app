import { Platform, useColorScheme } from 'react-native';
import { useAjustes } from '@/estado/ajustes';

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
  cartao: string; // usado quando o vidro nativo não existe
  borda: string;
  separador: string;
  leitorFundo: string;
  leitorTexto: string;
}

const claro: Paleta = {
  escuro: false,
  fundo: ['#FBF7EF', '#F3EADA', '#E9DCC4'],
  texto: '#231B12',
  textoSuave: '#5E5142',
  textoFraco: '#8C7E6C',
  destaque: '#9C6F2C',
  rubrica: '#A3262A',
  vidroTinta: 'rgba(255,250,240,0.35)',
  cartao: 'rgba(255,252,246,0.78)',
  borda: 'rgba(120,90,40,0.16)',
  separador: 'rgba(90,70,40,0.12)',
  leitorFundo: '#FBF7EF',
  leitorTexto: '#2A2118',
};

const escuro: Paleta = {
  escuro: true,
  fundo: ['#0C1124', '#121A33', '#1B1A2A'],
  texto: '#F2ECDF',
  textoSuave: '#C9BFAE',
  textoFraco: '#8F8778',
  destaque: '#DEBE82',
  rubrica: '#E58A86',
  vidroTinta: 'rgba(30,38,70,0.35)',
  cartao: 'rgba(30,36,60,0.72)',
  borda: 'rgba(222,190,130,0.16)',
  separador: 'rgba(222,190,130,0.12)',
  leitorFundo: '#0F1424',
  leitorTexto: '#ECE4D4',
};

const sepia: Paleta = {
  ...claro,
  fundo: ['#F4E8CE', '#EEDDBB', '#E4CFA6'],
  leitorFundo: '#F3E5C6',
  leitorTexto: '#3B2C1A',
  cartao: 'rgba(250,240,218,0.8)',
};

export function usePaleta(): Paleta {
  const sistema = useColorScheme();
  const { tema } = useAjustes();
  if (tema === 'escuro') return escuro;
  if (tema === 'claro') return claro;
  if (tema === 'sepia') return sepia;
  return sistema === 'dark' ? escuro : claro;
}

export const Fontes = {
  titulo: Platform.select({ ios: 'Baskerville', default: 'serif' }) as string,
  tituloNegrito: Platform.select({ ios: 'Baskerville-SemiBold', default: 'serif' }) as string,
  serifa: Platform.select({ ios: 'Georgia', default: 'serif' }) as string,
};

export const Espaco = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };
export const Raio = { s: 12, m: 20, l: 28 };
