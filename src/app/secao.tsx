// Página de uma seção do Rezar ou dos Ajustes: a aba mostra só uma linha por seção, e o toque abre esta
// página com a lista daquela seção (como já acontecia com as páginas da Comunidade).

import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { ConteudoAjustes, SECOES_AJUSTES } from '@/secoes/ajustes';
import { ConteudoRezar, SECOES_REZAR } from '@/secoes/rezar';
import { Aviso, Fundo, Secao, TituloPagina } from '@/ui/base';

export default function TelaSecao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rezar = SECOES_REZAR.find((s) => s.id === id);
  const ajustes = SECOES_AJUSTES.find((s) => s.id === id);
  const info = rezar ?? ajustes;

  return (
    <Fundo>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {info ? <TituloPagina titulo={info.titulo} /> : null}
        {rezar ? (
          <ConteudoRezar id={rezar.id} />
        ) : ajustes ? (
          <ConteudoAjustes id={ajustes.id} />
        ) : (
          <Secao>
            <Aviso texto="Seção não encontrada." />
          </Secao>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
