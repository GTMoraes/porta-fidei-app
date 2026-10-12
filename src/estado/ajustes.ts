import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { Hora } from '@/liturgia/horas';

export interface Lembrete {
  ativo: boolean;
  hora: number;
  minuto: number;
}

export interface Ajustes {
  telaLigada: boolean;
  bienal: boolean;
  evangelhoAoAcaso: boolean;
  iniciarMenuAberto: boolean;
  velocidadeRolagem: number; // 0 = sem rolagem automática
  coletasSalmodicas: boolean;
  repetirRespostas: boolean;
  esconderBarraStatus: boolean;
  feedbackTatil: boolean;
  expandirTexto: boolean;
  timerSilencio: boolean;
  minutosSilencio: number;
  voz: boolean;
  velocidadeVoz: number; // 0.5 a 1.5
  laudesAmpliada: boolean;
  tamanhoFonte: number; // px no leitor
  tema: 'sistema' | 'claro' | 'escuro' | 'sepia';
  alinhamento: 'centro' | 'esquerda';
  fonte: 'serifa' | 'sem-serifa';
  invitatorio: '94' | '99' | '66' | '23';
  antifonaNasEstrofes: boolean;
  lembretes: Record<Hora, Lembrete>;
}

export const PADRAO: Ajustes = {
  telaLigada: true,
  bienal: false,
  evangelhoAoAcaso: false,
  iniciarMenuAberto: false,
  velocidadeRolagem: 5,
  coletasSalmodicas: false,
  repetirRespostas: false,
  esconderBarraStatus: false,
  feedbackTatil: true,
  expandirTexto: true,
  timerSilencio: false,
  minutosSilencio: 3,
  voz: false,
  velocidadeVoz: 1,
  laudesAmpliada: false,
  tamanhoFonte: 19,
  tema: 'sistema',
  alinhamento: 'centro',
  fonte: 'serifa',
  invitatorio: '94',
  antifonaNasEstrofes: true,
  lembretes: {
    invitatorio: { ativo: false, hora: 6, minuto: 0 },
    leituras: { ativo: false, hora: 6, minuto: 15 },
    laudes: { ativo: false, hora: 6, minuto: 30 },
    terca: { ativo: false, hora: 9, minuto: 0 },
    sexta: { ativo: false, hora: 12, minuto: 0 },
    nona: { ativo: false, hora: 15, minuto: 0 },
    vesperas: { ativo: false, hora: 18, minuto: 0 },
    completas: { ativo: false, hora: 21, minuto: 30 },
  },
};

const CHAVE = 'pf.ajustes.v1';
let atual: Ajustes = PADRAO;
let carregado = false;
const ouvintes = new Set<() => void>();

export async function carregarAjustes() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    if (bruto) {
      const salvo = JSON.parse(bruto);
      atual = { ...PADRAO, ...salvo, lembretes: { ...PADRAO.lembretes, ...(salvo.lembretes ?? {}) } };
    }
  } catch {
    atual = PADRAO;
  }
  carregado = true;
  ouvintes.forEach((f) => f());
}

export function ajustesCarregados() {
  return carregado;
}

export function lerAjustes(): Ajustes {
  return atual;
}

export function mudarAjustes(parcial: Partial<Ajustes>) {
  atual = { ...atual, ...parcial };
  ouvintes.forEach((f) => f());
  AsyncStorage.setItem(CHAVE, JSON.stringify(atual)).catch(() => {});
}

export function useAjustes(): Ajustes {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
  );
}
