// Santos do dia segundo o Martirológio Romano (nomes e títulos)

import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { dataPorExtenso, hojeIso } from '@/liturgia/calendario';
import { htmlMartirologio } from '@/liturgia/martirologio';
import { Leitor } from '@/ui/Leitor';

export default function Martirologio() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  const d = data || hojeIso();
  const corpo = useMemo(
    () => htmlMartirologio(d, 'Martirológio Romano') || '<p class="c" style="margin-top:24px"><span class="lacuna">Lista deste dia ainda não incluída.</span></p>',
    [d],
  );
  return <Leitor corpo={corpo} titulo="Santos do dia" subtitulo={dataPorExtenso(d)} />;
}
