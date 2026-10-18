// Atualização pelo ar: o app confere ao abrir (sozinho) e ao voltar do segundo plano (aqui).
// Quando a versão nova já foi baixada, a tela Hoje mostra um card "Toque para atualizar",
// que reinicia o app na hora com a versão nova (sem precisar fechar e abrir duas vezes).

import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

let buscando = false;
async function buscarNova() {
  if (!Updates.isEnabled || buscando) return;
  buscando = true;
  try {
    const r = await Updates.checkForUpdateAsync();
    if (r.isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // sem internet ou servidor fora: tenta de novo na próxima vez
  } finally {
    buscando = false;
  }
}

/** true quando há versão nova baixada, esperando o reinício */
export function useAtualizacaoPronta(): boolean {
  const { isUpdatePending } = Updates.useUpdates();
  const ultima = useRef(0);
  useEffect(() => {
    const s = AppState.addEventListener('change', (st) => {
      // no máximo a cada 10 minutos
      if (st === 'active' && Date.now() - ultima.current > 10 * 60_000) {
        ultima.current = Date.now();
        buscarNova();
      }
    });
    return () => s.remove();
  }, []);
  return Updates.isEnabled && isUpdatePending;
}

export const aplicarAtualizacao = () => Updates.reloadAsync().catch(() => {});
