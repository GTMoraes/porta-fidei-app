// Criar conta (cadastro aberto): nome, usuário, e-mail, senha e, se quiser, uma foto. A conta nasce sem nenhuma
// tarefa no app: as capacidades são dadas por um administrador e as comissões, pela coordenação.
// A foto é escolhida antes, mas só sobe depois que a conta existe (o envio precisa da conta).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { emailValido, usuarioValido } from '@/estado/conta';
import { registrarPush, tokenPush } from '@/estado/push';
import { cadastrarConta, enviarFotoPerfil, SERVIDOR } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Avatar, escolherFotoPerfil, type FotoEscolhida } from '@/ui/Avatar';
import { Botao, Chave, Fundo, Linha, Secao, toque } from '@/ui/base';
import { Campo } from '@/ui/Formulario';
import { abrirLink } from '@/ui/Midia';

export default function CriarConta() {
  const router = useRouter();
  const c = usePaleta();
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [aceite, setAceite] = useState(false);
  const [foto, setFoto] = useState<FotoEscolhida | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const u = usuario.trim().toLowerCase().replace(/^@/, '');
  const erroUsuario = u && !usuarioValido(u) ? 'De 3 a 30 caracteres: letras sem acento, números, ponto ou _ (sem espaços). Ex.: maria.silva' : '';
  const erroEmail = email.trim() && !emailValido(email) ? 'Confira o e-mail' : '';
  const erroSenha = senha && senha.length < 8 ? 'Pelo menos 8 caracteres' : senha2 && senha !== senha2 ? 'As duas senhas não estão iguais' : '';
  const pronto = nome.trim().length >= 2 && usuarioValido(u) && emailValido(email) && senha.length >= 8 && senha === senha2 && aceite;

  const escolherFoto = async () => {
    toque();
    try {
      const f = await escolherFotoPerfil();
      if (f) setFoto(f);
    } catch (e: any) {
      Alert.alert('Não foi possível abrir as fotos', String(e?.message ?? e));
    }
  };

  const criar = async () => {
    setOcupado(true);
    try {
      const aparelho = tokenPush() ?? (await registrarPush(false).catch(() => null));
      const conta = await cadastrarConta({ nome: nome.trim(), usuario: u, email: email.trim(), senha, aceite, aparelho });
      let semFoto = '';
      if (foto)
        await enviarFotoPerfil(foto.base64, foto.tipo).catch((e: any) => {
          semFoto = `\n\nA foto não foi enviada (${String(e?.message ?? e)}). Dá para pôr depois, na sua conta.`;
        });
      Alert.alert('Conta criada', `Bem-vindo, ${conta.nome.split(' ')[0]}!${semFoto}`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Não foi possível criar a conta', String(e?.message ?? e));
    } finally {
      setOcupado(false);
    }
  };

  const ajuda = (t: string) =>
    t ? <Text style={{ color: '#D35400', fontSize: 13, lineHeight: 18, marginHorizontal: Espaco.l, marginTop: -4, marginBottom: 8 }}>{t}</Text> : null;

  return (
    <Fundo>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21, marginHorizontal: Espaco.xl, marginBottom: Espaco.l }}>
          A conta é para quem participa da Comunidade. Quem dá tarefas no app e coloca cada pessoa na sua comissão é a coordenação.
        </Text>

        <View style={{ alignItems: 'center', marginBottom: Espaco.l, gap: 8 }}>
          <Pressable onPress={escolherFoto} accessibilityRole="button" accessibilityLabel="Escolher foto">
            <Avatar foto={foto?.uri} nome={nome || '?'} tamanho={88} />
          </Pressable>
          <Pressable onPress={foto ? () => setFoto(null) : escolherFoto} hitSlop={8}>
            <Text style={{ color: c.destaque, fontSize: 15, fontWeight: '600' }}>{foto ? 'Tirar a foto' : 'Escolher foto (opcional)'}</Text>
          </Pressable>
        </View>

        <Secao>
          <Campo rotulo="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" autoComplete="name" textContentType="name" maxLength={80} />
          <Campo
            rotulo="Usuário (para entrar)"
            value={usuario}
            onChangeText={setUsuario}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            textContentType="username"
            placeholder="ex.: maria.silva"
            maxLength={31}
          />
          {ajuda(erroUsuario)}
          <Campo
            rotulo="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={200}
          />
          {ajuda(erroEmail)}
          <Campo rotulo="Senha (pelo menos 8 caracteres)" value={senha} onChangeText={setSenha} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
          <Campo rotulo="Repita a senha" value={senha2} onChangeText={setSenha2} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
          {ajuda(erroSenha)}
        </Secao>

        <Secao>
          <Linha titulo="Li a política de privacidade" sub="Nome, e-mail e foto ficam no servidor da Comunidade" direita={<Chave valor={aceite} mudar={setAceite} />} />
          <Linha titulo="Ler a política de privacidade" icone="doc.text" onPress={() => abrirLink(`${SERVIDOR}/privacidade`)} externo ultimo />
        </Secao>

        <View style={{ marginHorizontal: Espaco.l, marginBottom: 60 }}>
          <Botao titulo={ocupado ? 'Criando…' : 'Criar conta'} icone="checkmark" desativado={!pronto || ocupado} onPress={criar} />
        </View>
      </ScrollView>
    </Fundo>
  );
}
