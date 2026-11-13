// Administração › Comissões: criar, renomear ou apagar uma comissão (só administradores). Renomear muda também o nome
// nas reuniões dela (Rotinas). Comissão com reunião cadastrada não é apagada (apague ou mude as reuniões antes).

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { apagarComissao, atualizar, criarComissao, renomearComissao } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Botao, Fundo, Secao } from '@/ui/base';
import { Campo } from '@/ui/Formulario';

export default function EditarComissao() {
  const { id, nome: nomeAtual } = useLocalSearchParams<{ id?: string; nome?: string }>();
  const router = useRouter();
  const c = usePaleta();
  const [nome, setNome] = useState(nomeAtual ?? '');
  const [ocupado, setOcupado] = useState(false);

  const salvar = async () => {
    setOcupado(true);
    try {
      if (id) await renomearComissao(id, nome.trim());
      else await criarComissao(nome.trim());
      atualizar(); // o nome novo aparece nas reuniões e em "Ver também"
      router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setOcupado(false);
    }
  };
  const apagar = () =>
    Alert.alert('Tem certeza?', `A comissão ${nomeAtual} é apagada e todos saem dela. Não dá para desfazer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagarComissao(id!);
            atualizar();
            router.dismissTo('/comissoes');
          } catch (e: any) {
            Alert.alert('Não foi possível apagar', String(e?.message ?? e));
          }
        },
      },
    ]);

  return (
    <Fundo>
      <Stack.Screen options={{ title: id ? 'Comissão' : 'Nova comissão' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Secao>
          <Campo rotulo="Nome da comissão" value={nome} onChangeText={setNome} autoCapitalize="words" maxLength={60} placeholder="Ex.: Comissão da Casa" />
        </Secao>
        {id ? (
          <Text style={{ color: c.textoFraco, fontSize: 13, marginHorizontal: Espaco.xl, marginTop: -Espaco.m, marginBottom: Espaco.xl, lineHeight: 18 }}>
            O nome novo vale também para as reuniões desta comissão em Rotinas.
          </Text>
        ) : null}
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={ocupado ? 'Salvando…' : id ? 'Salvar' : 'Criar comissão'} icone="checkmark" desativado={ocupado || nome.trim().length < 2 || nome.trim() === nomeAtual} onPress={salvar} />
          {id ? <Botao titulo="Apagar a comissão" icone="trash" tipo="perigo" desativado={ocupado} onPress={apagar} /> : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
