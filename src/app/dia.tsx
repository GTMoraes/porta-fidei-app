// Tela do dia litúrgico: o conteúdo dela passou para a aba Rezar (card do dia e Próprios do dia).
// A rota fica só para links antigos: abre o Rezar já no dia pedido.

import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { abrirRezarNoDia } from '@/estado/dataRezar';
import { hojeIso } from '@/liturgia/calendario';
import { Fundo } from '@/ui/base';

export default function Dia() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  useEffect(() => {
    abrirRezarNoDia(data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : hojeIso());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Fundo>{null}</Fundo>;
}
