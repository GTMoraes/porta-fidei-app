import type { Proposta } from '@/servidor/api';

// Rascunho da Proposta que o admin está conferindo (a tela de leitura mostra antes de publicar)
let previa: Proposta | null = null;
export const definirPrevia = (p: Proposta | null) => {
  previa = p;
};
export const lerPrevia = (id?: string) => (previa && previa.id === id ? previa : null);
