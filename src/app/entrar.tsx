// Entrar na conta (Ajustes): usuário ou e-mail e senha. Quem não tem conta cria uma (o cadastro é aberto).
// Esqueceu a senha: um administrador gera uma senha provisória em Administração › Pessoas (o app ainda não manda
// e-mail); com ela a pessoa entra e escolhe uma nova.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { guardarSenhaRecente } from '@/estado/conta';
import { registrarPush, tokenPush } from '@/estado/push';
import { entrarConta } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Botao, Fundo, Linha, Secao } from '@/ui/base';
import { Campo } from '@/ui/Formulario';

export default function Entrar() {
  const router = useRouter();
  const c = usePaleta();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const pronto = !!login.trim() && !!senha;

  const entrar = async () => {
    if (!pronto || ocupado) return;
    setOcupado(true);
    try {
      const aparelho = tokenPush() ?? (await registrarPush(false).catch(() => null));
      const conta = await entrarConta(login.trim(), senha, aparelho);
      if (conta.senhaProvisoria) {
        guardarSenhaRecente(senha);
        router.replace({ pathname: '/nova-senha', params: { provisoria: '1' } });
      } else router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível entrar', String(e?.message ?? e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Fundo>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21, marginHorizontal: Espaco.xl, marginBottom: Espaco.l }}>
          A conta é para quem participa da Comunidade. Sem ela, o app funciona do mesmo jeito.
        </Text>
        <Secao>
          <Campo
            rotulo="Usuário ou e-mail"
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
          />
          <Campo
            rotulo="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={entrar}
          />
        </Secao>
        <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.xl }}>
          <Botao titulo={ocupado ? 'Entrando…' : 'Entrar'} icone="person.crop.circle" desativado={!pronto || ocupado} onPress={entrar} />
        </View>
        <Secao>
          <Linha titulo="Criar uma conta" sub="Nome, usuário, e-mail e senha" icone="person.badge.plus" onPress={() => router.replace('/criar-conta')} />
          <Linha
            titulo="Esqueci a senha"
            icone="key"
            onPress={() =>
              Alert.alert(
                'Esqueceu a senha?',
                'Peça a um administrador do app uma senha provisória. Com ela você entra e escolhe uma senha nova.',
              )
            }
            ultimo
          />
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
