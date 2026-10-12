import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

import { montarArquivo } from '@/conteudo/montar';
import { imagemUri, pastaUri } from '@/conteudo/pacote';
import { Leitor } from '@/ui/Leitor';

export default function Texto() {
  const { arquivo, titulo, desde, ate, imagem } = useLocalSearchParams<{ arquivo: string; titulo?: string; desde?: string; ate?: string; imagem?: string }>();
  const nav = useNavigation();
  const [corpo, setCorpo] = useState<string | null>(null);

  useEffect(() => {
    nav.setOptions({ title: '' });
    montarArquivo(arquivo, desde || undefined, ate || undefined).then((m) => {
      let html = m.faltando.length ? '<p class="c"><span class="lacuna">Este texto não está no pacote de conteúdo instalado.</span></p>' : m.corpo;
      const img = imagem ? imagemUri(imagem) : undefined;
      if (img) html = `<img src="${img}" style="width:100%;margin-bottom:18px"/>` + html;
      setCorpo(html);
    });
  }, [arquivo, desde, ate, imagem, nav]);

  const base = arquivo?.startsWith('rosario/') ? pastaUri('img/rosario') : imagem ? pastaUri('img') : undefined;
  return <Leitor corpo={corpo} titulo={titulo || undefined} baseUrl={base} />;
}
