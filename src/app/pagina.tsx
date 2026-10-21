// Página da aba Comunidade (história, Casa Porta Fidei, obras, ministérios, Benfeitor), montada a partir de blocos.

import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { RodapeContribuir } from '@/comunidade/Contribuir';
import { PAGINAS } from '@/comunidade/sobre';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Aviso, Botao, Fundo, Linha, Secao } from '@/ui/base';
import { abrirLink } from '@/ui/Midia';
import { abrirDoacao } from '@/comunidade/Contribuir';

export default function TelaPagina() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = usePaleta();
  const p = PAGINAS[id ?? ''];
  if (!p)
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Secao>
            <Aviso texto="Página não encontrada." />
          </Secao>
        </ScrollView>
      </Fundo>
    );

  return (
    <Fundo>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ paddingHorizontal: Espaco.xl, paddingTop: Espaco.s, paddingBottom: Espaco.l }}>
          {p.sobre ? <Text style={{ color: c.destaque, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>{p.sobre}</Text> : null}
          <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 30, marginTop: 4 }}>{p.titulo}</Text>
        </View>
        {p.blocos.map((b, i) => {
          switch (b.tipo) {
            case 'texto':
              return (
                <Text key={i} style={{ color: c.texto, fontSize: 16.5, lineHeight: 24, marginHorizontal: Espaco.xl, marginBottom: Espaco.l }}>
                  {b.texto}
                </Text>
              );
            case 'titulo':
              return (
                <Text key={i} style={{ color: c.textoSuave, fontSize: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginHorizontal: Espaco.xl, marginBottom: Espaco.s, marginTop: Espaco.s }}>
                  {b.texto}
                </Text>
              );
            case 'aviso':
              return (
                <Secao key={i}>
                  <Aviso icone="hourglass" texto={b.texto} />
                </Secao>
              );
            case 'citacao':
              return (
                <View key={i} style={{ marginHorizontal: Espaco.xl, marginBottom: Espaco.xl, borderLeftWidth: 2, borderLeftColor: c.destaque, paddingLeft: Espaco.l }}>
                  <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 18, lineHeight: 26, fontStyle: 'italic' }}>“{b.texto}”</Text>
                  {b.autor ? <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 6 }}>{b.autor}</Text> : null}
                </View>
              );
            case 'lista':
              return (
                <Secao key={i}>
                  {b.itens.map((it, k) => (
                    <Linha key={k} titulo={it.titulo} sub={it.sub} icone={it.icone as any} ultimo={k === b.itens.length - 1} />
                  ))}
                </Secao>
              );
            case 'links':
              return (
                <Secao key={i}>
                  {b.itens.map((it, k) => (
                    <Linha key={k} titulo={it.titulo} sub={it.sub} icone={it.icone as any} onPress={() => abrirLink(it.url)} ultimo={k === b.itens.length - 1} />
                  ))}
                </Secao>
              );
          }
        })}
        {p.id === 'benfeitor' ? (
          <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.xl, gap: 10 }}>
            <Botao titulo="Quero ser Benfeitor" icone="arrow.triangle.2.circlepath" onPress={() => abrirDoacao(true)} />
            <Botao titulo="Fazer uma doação única" icone="heart" tipo="secundario" onPress={() => abrirDoacao(false)} />
          </View>
        ) : (
          <RodapeContribuir />
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </Fundo>
  );
}
