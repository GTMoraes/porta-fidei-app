// Trocar a senha (Ajustes › sua conta) ou escolher uma depois de entrar com a senha provisória que um administrador
// gerou (`provisoria=1`; a provisória acabou de ser digitada e não é pedida de novo). Os outros aparelhos saem da conta.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { pegarSenhaRecente } from '@/estado/conta';
import { trocarSenha } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Botao, Fundo, Secao } from '@/ui/base';
import { Campo } from '@/ui/Formulario';

export default function NovaSenha() {
  const { provisoria } = useLocalSearchParams<{ provisoria?: string }>();
  const router = useRouter();
  const c = usePaleta();
  const [recente] = useState(() => (provisoria ? pegarSenhaRecente() : null));
  const [atual, setAtual] = useState(recente ?? '');
  const [nova, setNova] = useState('');
  const [nova2, setNova2] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const erro = nova && nova.length < 8 ? 'Pelo menos 8 caracteres' : nova2 && nova !== nova2 ? 'As duas senhas não estão iguais' : '';
  const pronto = !!atual && nova.length >= 8 && nova === nova2;

  const salvar = async () => {
    setOcupado(true);
    try {
      await trocarSenha(atual, nova);
      Alert.alert('Senha nova salva', 'Nos outros aparelhos em que você tinha entrado, é preciso entrar de novo.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Não foi possível trocar a senha', String(e?.message ?? e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Fundo>
      <Stack.Screen options={{ title: provisoria ? 'Escolha sua senha' : 'Trocar a senha' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: Espaco.l }}>
        {provisoria ? (
          <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21, marginHorizontal: Espaco.xl, marginBottom: Espaco.l }}>
            Você entrou com uma senha provisória. Escolha agora uma senha sua, que só você vai saber.
          </Text>
        ) : null}
        <Secao>
          {recente ? null : (
            <Campo
              rotulo={provisoria ? 'Senha provisória' : 'Senha atual'}
              value={atual}
              onChangeText={setAtual}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
            />
          )}
          <Campo rotulo="Senha nova (pelo menos 8 caracteres)" value={nova} onChangeText={setNova} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
          <Campo rotulo="Repita a senha nova" value={nova2} onChangeText={setNova2} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
          {erro ? <Text style={{ color: '#D35400', fontSize: 13, marginHorizontal: Espaco.l, marginTop: -4, marginBottom: 10 }}>{erro}</Text> : null}
        </Secao>
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={ocupado ? 'Salvando…' : 'Salvar senha'} icone="key" desativado={!pronto || ocupado} onPress={salvar} />
          {provisoria ? <Botao titulo="Agora não" tipo="secundario" onPress={() => router.back()} /> : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
