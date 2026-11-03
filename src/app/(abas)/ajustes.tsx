import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { SECOES_AJUSTES } from '@/secoes/ajustes';
import { Fundo, Linha, Secao, TituloTela } from '@/ui/base';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { useFolgaAbas } from '@/ui/AbasAndroid';

// Aba Ajustes, como nos Ajustes do iPhone: uma linha por seção, e o toque abre a página dela
// (rota /secao, conteúdo em src/secoes/ajustes.tsx).
export default function TelaAjustes() {
  const folga = useFolgaAbas();
  const lista = useSubirAoTopo();
  const router = useRouter();

  return (
    <Fundo aba>
      <ScrollView ref={lista} scrollToOverflowEnabled contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Ajustes" />
        <Secao>
          {SECOES_AJUSTES.map((s, i) => (
            <Linha
              key={s.id}
              titulo={s.titulo}
              sub={s.sub}
              icone={s.icone}
              quadrado={s.cor}
              onPress={() => router.push({ pathname: '/secao', params: { id: s.id } })}
              ultimo={i === SECOES_AJUSTES.length - 1}
            />
          ))}
        </Secao>
        <View style={{ height: 50 + folga }} />
      </ScrollView>
    </Fundo>
  );
}
