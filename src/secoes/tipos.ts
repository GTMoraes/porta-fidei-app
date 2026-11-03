import type { SFSymbol } from 'expo-symbols';

/** Uma seção que, na aba, é uma linha (título, descrição e ícone num quadrado colorido) e abre a própria página */
export interface InfoSecao {
  id: string;
  titulo: string;
  sub: string;
  icone: SFSymbol;
  cor: string;
}
