// Dados da administração da oração (inclui rascunhos e itens desativados)

import { useSyncExternalStore } from 'react';

import { atualizar, comunidadeAdmin, type Comunidade } from '@/servidor/api';

let dados: Comunidade | null = null;
let erro: string | null = null;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());
let estado: { dados: Comunidade | null; erro: string | null } = { dados, erro };

export async function recarregarAdmin() {
  try {
    dados = await comunidadeAdmin();
    erro = null;
  } catch (e: any) {
    erro = String(e?.message ?? e);
  }
  estado = { dados, erro };
  emitir();
  atualizar(); // o que os membros veem
}

export function useAdminComunidade() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
  );
}
