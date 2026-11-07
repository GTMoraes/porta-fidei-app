// Oração da Comunidade (Ó Divino Esposo, Ladainha da Humildade, Cerco de Jericó...)

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { oracaoHtml } from '@/comunidade/html';
import { useAjustes } from '@/estado/ajustes';
import { alternarFavorito, ehFavorito, itemComunidade, registrarRecente, useSalvos } from '@/estado/favoritos';
import { escolherLembrete, ligado, modoDe } from '@/estado/lembretes';
import { useServidor } from '@/servidor/api';
import { Leitor } from '@/ui/Leitor';

export default function TelaOracao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const srv = useServidor();
  const o = srv.comunidade?.oracoes.find((x) => x.id === id || x.slug === id);
  const corpo = useMemo(
    () => (o ? oracaoHtml(o.texto) : '<p class="c" style="margin-top:24px"><span class="lacuna">Esta oração não está mais disponível.</span></p>'),
    [o],
  );
  // favorito (estrela na barra) e abertos recentemente, como os textos do pacote
  const salvos = useSalvos();
  const aj = useAjustes();
  const item = o ? itemComunidade('oracao', o.id, o.titulo) : null;
  useEffect(() => {
    if (item) registrarRecente(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o?.id]);
  return (
    <Leitor
      corpo={corpo}
      titulo={o?.titulo ?? 'Oração'}
      subtitulo={o?.subtitulo ?? undefined}
      favorito={item ? { ativo: ehFavorito(salvos, item), alternar: () => alternarFavorito(item) } : undefined}
      // sino: só nas orações em que a Comunidade sugeriu um lembrete (ex.: toda 1ª sexta-feira)
      extra={o?.lembrete ? { icone: ligado(modoDe(aj, 'oracao', o.id)) ? 'bell.fill' : 'bell', onPress: () => escolherLembrete('oracao', o.id, o.titulo) } : undefined}
    />
  );
}
