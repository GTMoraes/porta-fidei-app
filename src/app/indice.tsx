// Índice de A a Z: tudo o que o app tem (orações, Confissão, Rosário, rituais, ofícios, Missal),
// em ordem alfabética, com o lugar onde cada um mora.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { abrirItem, disponivel } from '@/conteudo/abrir';
import { ondeEsta, semAcento, todasAsEntradas } from '@/conteudo/indice';
import { usePacote } from '@/conteudo/pacote';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';

export default function Indice() {
  const router = useRouter();
  const c = usePaleta();
  const pacote = usePacote();
  const [busca, setBusca] = useState('');
  const q = semAcento(busca.trim());

  const porLetra = useMemo(() => {
    const itens = todasAsEntradas()
      .filter(disponivel)
      .filter((e) => !q || semAcento(`${e.titulo} ${e.sub ?? ''} ${e.alias ?? ''}`).includes(q))
      .sort((a, b) => semAcento(a.titulo).localeCompare(semAcento(b.titulo), 'pt-BR'));
    const m = new Map<string, typeof itens>();
    for (const e of itens) {
      const l = semAcento(e.titulo).replace(/^[^a-z0-9]+/, '').charAt(0).toUpperCase() || '#';
      m.set(/[A-Z]/.test(l) ? l : '#', [...(m.get(/[A-Z]/.test(l) ? l : '#') ?? []), e]);
    }
    return [...m.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, pacote.manifest]);

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <View style={{ marginHorizontal: Espaco.l, marginTop: Espaco.s, marginBottom: Espaco.l }}>
          <TextInput underlineColorAndroid="transparent" cursorColor="#BC8C44"
            value={busca}
            onChangeText={setBusca}
            placeholder="Filtrar"
            placeholderTextColor={c.textoFraco}
            clearButtonMode="while-editing"
            autoCorrect={false}
            style={{ backgroundColor: c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: c.texto, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 }}
          />
        </View>
        {!porLetra.length ? (
          <Secao>
            <Aviso texto="Nada com esse nome." />
          </Secao>
        ) : null}
        {porLetra.map(([letra, itens]) => (
          <Secao key={letra} titulo={letra}>
            {itens.map((e, k) => (
              <Linha key={e.arquivo} titulo={e.titulo} sub={ondeEsta(e)} onPress={() => abrirItem(router, e)} ultimo={k === itens.length - 1} />
            ))}
          </Secao>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
