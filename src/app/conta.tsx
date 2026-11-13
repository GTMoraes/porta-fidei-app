// Sua conta (Ajustes): foto, nome e e-mail (o usuário não muda), trocar a senha, suas comissões, a Administração
// (para quem tem tarefas no app), sair e apagar a conta (exigência da Apple para apps com cadastro).

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { ehEquipe, textoTarefas, useConta } from '@/estado/conta';
import { apagarMinhaConta, buscarConta, enviarFotoPerfil, sairDaConta, salvarPerfil, tirarFotoPerfil } from '@/servidor/api';
import { Espaco, fonteTitulo, usePaleta } from '@/tema';
import { Avatar, escolherFotoPerfil } from '@/ui/Avatar';
import { Aviso, Botao, Fundo, Linha, Secao } from '@/ui/base';
import { Campo } from '@/ui/Formulario';
import { mostrarOpcoes } from '@/ui/Opcoes';

export default function TelaConta() {
  const router = useRouter();
  const c = usePaleta();
  const conta = useConta();
  const [nome, setNome] = useState(conta?.nome ?? '');
  const [email, setEmail] = useState(conta?.email ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  // capacidades e comissões mudam pela Administração: relê ao abrir
  useFocusEffect(
    useCallback(() => {
      buscarConta().catch(() => {});
    }, []),
  );
  // a conta chegou (ou mudou) e a pessoa não está editando: os campos acompanham
  const [mexeu, setMexeu] = useState(false);
  useEffect(() => {
    if (!mexeu && conta) {
      setNome(conta.nome);
      setEmail(conta.email ?? '');
    }
  }, [conta, mexeu]);

  if (!conta)
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Espaco.l }}>
          <Secao>
            <Aviso icone="person.crop.circle" texto="Você não está em nenhuma conta neste aparelho." />
          </Secao>
          <View style={{ marginHorizontal: Espaco.l }}>
            <Botao titulo="Entrar ou criar conta" onPress={() => router.replace('/entrar')} />
          </View>
        </ScrollView>
      </Fundo>
    );

  const mudou = nome.trim() !== conta.nome || email.trim().toLowerCase() !== (conta.email ?? '');
  const salvar = async () => {
    setOcupado(true);
    try {
      await salvarPerfil({ nome: nome.trim(), email: email.trim() });
      setMexeu(false);
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setOcupado(false);
    }
  };
  const trocarFoto = async () => {
    try {
      const f = await escolherFotoPerfil();
      if (!f) return;
      setEnviandoFoto(true);
      await enviarFotoPerfil(f.base64, f.tipo);
    } catch (e: any) {
      Alert.alert('Não foi possível trocar a foto', String(e?.message ?? e));
    } finally {
      setEnviandoFoto(false);
    }
  };
  const opcoesFoto = () =>
    conta.foto
      ? mostrarOpcoes('Foto', [
          { rotulo: 'Escolher outra foto', onPress: trocarFoto },
          {
            rotulo: 'Tirar a foto',
            destrutivo: true,
            onPress: () =>
              Alert.alert('Tem certeza?', 'A foto sai da sua conta.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Tirar', style: 'destructive', onPress: () => tirarFotoPerfil().catch((e: any) => Alert.alert('Erro', String(e?.message ?? e))) },
              ]),
          },
        ])
      : trocarFoto();
  const sair = () =>
    Alert.alert('Sair da conta?', 'Para voltar, entre de novo com o usuário e a senha.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await sairDaConta();
          router.back();
        },
      },
    ]);
  const apagar = () =>
    Alert.alert(
      'Tem certeza?',
      'Sua conta é apagada de vez: nome, usuário, e-mail, foto e senha. Você sai das comissões e perde as tarefas no app. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apagarMinhaConta();
              Alert.alert('Conta apagada', 'O app continua funcionando normalmente, sem conta.');
              router.back();
            } catch (e: any) {
              Alert.alert('Não foi possível apagar', String(e?.message ?? e));
            }
          },
        },
      ],
    );

  const comissoes = conta.comissoes.map((x) => (x.coordenador ? `${x.nome} (coordenação)` : x.nome));
  return (
    <Fundo>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: Espaco.l }}>
        <View style={{ alignItems: 'center', marginBottom: Espaco.xl, gap: 6 }}>
          <Pressable onPress={opcoesFoto} disabled={enviandoFoto} accessibilityRole="button" accessibilityLabel="Foto da conta" style={{ opacity: enviandoFoto ? 0.5 : 1 }}>
            <Avatar foto={conta.foto} nome={conta.nome} tamanho={92} />
          </Pressable>
          <Pressable onPress={opcoesFoto} disabled={enviandoFoto} hitSlop={8}>
            <Text style={{ color: c.destaque, fontSize: 15, fontWeight: '600' }}>{enviandoFoto ? 'Enviando…' : conta.foto ? 'Trocar a foto' : 'Pôr uma foto'}</Text>
          </Pressable>
          <Text style={{ color: c.texto, ...fonteTitulo(24), marginTop: 6, textAlign: 'center', marginHorizontal: Espaco.xl }}>{conta.nome}</Text>
          {conta.usuario ? <Text style={{ color: c.textoFraco, fontSize: 15 }}>@{conta.usuario}</Text> : null}
        </View>

        {conta.senhaProvisoria ? (
          <Secao>
            <Aviso icone="key" texto="Você está com uma senha provisória, dada por um administrador. Escolha uma senha sua." />
            <Linha titulo="Escolher uma senha nova" icone="key" onPress={() => router.push({ pathname: '/nova-senha', params: { provisoria: '1' } })} ultimo />
          </Secao>
        ) : null}

        <Secao titulo="Seus dados">
          <Campo rotulo="Nome" value={nome} onChangeText={(t) => (setMexeu(true), setNome(t))} autoCapitalize="words" maxLength={80} />
          <Campo
            rotulo="E-mail (só os administradores veem)"
            value={email}
            onChangeText={(t) => (setMexeu(true), setEmail(t))}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            maxLength={200}
          />
          {mudou ? (
            <View style={{ padding: Espaco.l, paddingTop: 4 }}>
              <Botao titulo={ocupado ? 'Salvando…' : 'Salvar'} icone="checkmark" desativado={ocupado || nome.trim().length < 2 || !email.trim()} onPress={salvar} />
            </View>
          ) : null}
        </Secao>

        <Secao>
          <Linha titulo="Trocar a senha" icone="key" onPress={() => router.push('/nova-senha')} />
          <Linha
            titulo="Suas comissões"
            sub={comissoes.length ? comissoes.join(', ') : 'Nenhuma por enquanto'}
            icone="person.2"
            onPress={() => router.push('/sua-comissao')}
            ultimo={!ehEquipe(conta)}
          />
          {ehEquipe(conta) ? <Linha titulo="Administração" sub={textoTarefas(conta)} icone="lock.shield" onPress={() => router.push('/admin')} ultimo /> : null}
        </Secao>

        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo="Sair da conta" icone="rectangle.portrait.and.arrow.right" tipo="secundario" onPress={sair} />
          <Botao titulo="Apagar minha conta" icone="trash" tipo="perigo" onPress={apagar} />
        </View>
      </ScrollView>
    </Fundo>
  );
}
