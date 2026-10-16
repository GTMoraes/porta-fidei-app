import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

import { montarArquivo } from '@/conteudo/montar';
import { imagemDataUri } from '@/conteudo/pacote';
import { Leitor } from '@/ui/Leitor';

// Figuras do Rosário, na ordem em que aparecem em cada arquivo (o original preenchia por código)
const FIGURAS_ROSARIO: Record<string, string[]> = {
  'rosario/misterios_alegria': ['anunciacao', 'visitacao', 'natividade', 'apresentacao', 'entredoutores'],
  'rosario/misterios_luz': ['batismo', 'bodas', 'pregacao', 'transfiguracao', 'eucaristia'],
  'rosario/misterios_dor': ['agonianohorto', 'flagelacao', 'espinhos', 'cruzcarregada', 'crucificacao'],
  'rosario/misterios_gloria': ['ressureicao', 'ascencao', 'pentecostes', 'assuncao', 'coroacao'],
};

export default function Texto() {
  const { arquivo, titulo, desde, ate, imagem } = useLocalSearchParams<{ arquivo: string; titulo?: string; desde?: string; ate?: string; imagem?: string }>();
  const nav = useNavigation();
  const [corpo, setCorpo] = useState<string | null>(null);

  useEffect(() => {
    nav.setOptions({ title: '' });
    (async () => {
      const m = await montarArquivo(arquivo, desde || undefined, ate || undefined);
      let html = m.faltando.length ? '<p class="c"><span class="lacuna">Este texto não está no pacote de conteúdo instalado.</span></p>' : m.corpo;

      // figuras do Rosário
      const figuras = FIGURAS_ROSARIO[arquivo];
      if (figuras) {
        const uris = await Promise.all(figuras.map((f) => imagemDataUri(`rosario/${f}`)));
        let i = 0;
        html = html.replace(/<img[^>]*>/g, () => {
          const u = uris[i++];
          return u ? `<img src="${u}" style="display:block;width:70%;max-width:280px;margin:14px auto"/>` : '';
        });
      }

      // foto do santo no topo
      const img = imagem ? await imagemDataUri(imagem) : undefined;
      if (img) html = `<img src="${img}" style="display:block;width:100%;margin-bottom:18px"/>` + html;
      setCorpo(html);
    })();
  }, [arquivo, desde, ate, imagem, nav]);

  return <Leitor corpo={corpo} titulo={titulo || undefined} />;
}
