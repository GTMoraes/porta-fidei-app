import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';

import { registrarPush } from '@/estado/push';
import { apagarAviso, apagarEvento, atualizar, entrar, sair, testarNotificacao, useServidor } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Botao, Fundo, Linha, Secao } from '@/ui/base';
import { quando } from '@/util/datas';

export default function Admin() {
  const srv = useServidor();
  const router = useRouter();
  const c = usePaleta();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const estilo = {
    color: c.texto,
    backgroundColor: c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  } as const;

  if (!srv.admin) {
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          <Secao>
            <Aviso icone="lock.shield" texto="Área da coordenação: publicar missas, eventos e avisos para toda a Comunidade." />
          </Secao>
          <Secao titulo="Entrar">
            <View style={{ padding: Espaco.l, gap: 12 }}>
              <TextInput value={usuario} onChangeText={setUsuario} placeholder="Usuário" placeholderTextColor={c.textoFraco} autoCapitalize="none" autoCorrect={false} style={estilo} />
              <TextInput value={senha} onChangeText={setSenha} placeholder="Senha" placeholderTextColor={c.textoFraco} secureTextEntry style={estilo} />
              <Botao
                titulo={ocupado ? 'Entrando…' : 'Entrar'}
                desativado={ocupado || !usuario || !senha}
                onPress={async () => {
                  setOcupado(true);
                  try {
                    await entrar(usuario.trim(), senha);
                    setSenha('');
                  } catch (e: any) {
                    Alert.alert('Não foi possível entrar', String(e?.message ?? e));
                  } finally {
                    setOcupado(false);
                  }
                }}
              />
            </View>
          </Secao>
        </ScrollView>
      </Fundo>
    );
  }

  const confirmarApagar = (oque: string, acao: () => Promise<unknown>) =>
    Alert.alert('Tem certeza?', `${oque} será apagado para todos os membros.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await acao();
            await atualizar();
          } catch (e: any) {
            Alert.alert('Erro', String(e?.message ?? e));
          }
        },
      },
    ]);

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Secao titulo="Publicar">
          <Linha titulo="Nova missa ou evento" icone="calendar.badge.plus" onPress={() => router.push('/editar-evento')} />
          <Linha titulo="Novo aviso" icone="megaphone" onPress={() => router.push('/editar-aviso')} />
          <Linha
            titulo="Testar notificação"
            sub="Envia uma notificação de teste (por enquanto chega pelo Bark do Gabriel)"
            icone="bell.badge"
            onPress={async () => {
              try {
                const meu = await registrarPush(true);
                const r = await testarNotificacao('Porta Fidei', 'Teste de notificação do app da Comunidade.', meu);
                Alert.alert('Enviado', `${meu ? 'Enviada para este aparelho.' : 'Este aparelho não está registrado para push (permissão negada?).'}\n\n${r?.resultado ?? ''}`);
              } catch (e: any) {
                Alert.alert('Erro', String(e?.message ?? e));
              }
            }}
            ultimo
          />
        </Secao>

        <Secao titulo="Missas e eventos publicados">
          {srv.eventos.length ? (
            srv.eventos.map((e, i) => (
              <Linha
                key={e.id}
                titulo={e.titulo}
                sub={quando(e.inicio, e.fim)}
                onPress={() =>
                  Alert.alert(e.titulo, quando(e.inicio, e.fim), [
                    { text: 'Editar', onPress: () => router.push({ pathname: '/editar-evento', params: { id: e.id } }) },
                    { text: 'Apagar', style: 'destructive', onPress: () => confirmarApagar('Este evento', () => apagarEvento(e.id)) },
                    { text: 'Fechar', style: 'cancel' },
                  ])
                }
                ultimo={i === srv.eventos.length - 1}
              />
            ))
          ) : (
            <Aviso texto="Nenhum evento publicado." />
          )}
        </Secao>

        <Secao titulo="Avisos publicados">
          {srv.avisos.length ? (
            srv.avisos.map((a, i) => (
              <Linha
                key={a.id}
                titulo={a.titulo}
                sub={new Date(a.criado).toLocaleDateString('pt-BR')}
                onPress={() =>
                  Alert.alert(a.titulo, a.texto.slice(0, 200), [
                    { text: 'Editar', onPress: () => router.push({ pathname: '/editar-aviso', params: { id: a.id } }) },
                    { text: 'Apagar', style: 'destructive', onPress: () => confirmarApagar('Este aviso', () => apagarAviso(a.id)) },
                    { text: 'Fechar', style: 'cancel' },
                  ])
                }
                ultimo={i === srv.avisos.length - 1}
              />
            ))
          ) : (
            <Aviso texto="Nenhum aviso publicado." />
          )}
        </Secao>

        <View style={{ marginHorizontal: Espaco.l, marginBottom: 40 }}>
          <Botao titulo="Sair da administração" tipo="secundario" icone="rectangle.portrait.and.arrow.right" onPress={() => sair()} />
          <Text style={{ height: 10 }} />
        </View>
      </ScrollView>
    </Fundo>
  );
}
