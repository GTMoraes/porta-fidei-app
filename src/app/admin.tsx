import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';

import { registrarPush } from '@/estado/push';
import { eventosDaAgenda } from '@/estado/vistos';
import { apagarAviso, apagarEvento, atualizar, encerrado, encerrarAvisos, entrar, sair, testarNotificacao, useServidor, type Aviso as AvisoT } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Botao, Fundo, Icone, Linha, Secao } from '@/ui/base';
import { mostrarOpcoes } from '@/ui/Opcoes';
import { diaEHora, quando } from '@/util/datas';

export default function Admin() {
  const srv = useServidor();
  const router = useRouter();
  const c = usePaleta();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // "Encerrar vários": escolher avisos e encerrar todos de uma vez
  const [escolhendo, setEscolhendo] = useState(false);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);

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
        <ScrollView keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          <Secao>
            <Aviso icone="lock.shield" texto="Área da coordenação: publicar missas, eventos e avisos para toda a Comunidade." />
          </Secao>
          <Secao titulo="Entrar">
            <View style={{ padding: Espaco.l, gap: 12 }}>
              <TextInput underlineColorAndroid="transparent" cursorColor="#BC8C44" value={usuario} onChangeText={setUsuario} placeholder="Usuário" placeholderTextColor={c.textoFraco} autoCapitalize="none" autoCorrect={false} style={estilo} />
              <TextInput underlineColorAndroid="transparent" cursorColor="#BC8C44" value={senha} onChangeText={setSenha} placeholder="Senha" placeholderTextColor={c.textoFraco} secureTextEntry style={estilo} />
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

  // só o que ainda vai acontecer (a agenda guarda também os últimos 90 dias, e a lista ficava enorme)
  const proximos = eventosDaAgenda(srv.eventos);
  const noAr = srv.avisos.filter((a) => !encerrado(a));
  const encerrados = srv.avisos.filter((a) => encerrado(a)).sort((a, b) => (b.venceEm ?? '').localeCompare(a.venceEm ?? ''));
  const alternarEscolha = (id: string) => setEscolhidos((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const encerrar = (ids: string[], depois?: () => void) =>
    Alert.alert(
      'Tem certeza?',
      `${ids.length === 1 ? 'O aviso sai' : `Os ${ids.length} avisos saem`} do topo e da lista de Avisos de todos e ${ids.length === 1 ? 'fica guardado' : 'ficam guardados'} como "Encerrado". Dá para reativar depois.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await encerrarAvisos(ids);
              await atualizar();
              depois?.();
            } catch (e: any) {
              Alert.alert('Erro', String(e?.message ?? e));
            }
          },
        },
      ],
    );
  const reativar = async (id: string) => {
    try {
      await encerrarAvisos([id], true);
      await atualizar();
    } catch (e: any) {
      Alert.alert('Erro', String(e?.message ?? e));
    }
  };
  const opcoesAviso = (a: AvisoT) =>
    mostrarOpcoes(a.titulo, [
      { rotulo: 'Abrir', onPress: () => router.push({ pathname: '/aviso', params: { id: a.id } }) },
      { rotulo: 'Editar', onPress: () => router.push({ pathname: '/editar-aviso', params: { id: a.id } }) },
      encerrado(a)
        ? { rotulo: 'Reativar para todos (sem vencimento)', onPress: () => reativar(a.id) }
        : { rotulo: 'Encerrar para todos', onPress: () => encerrar([a.id]) },
      { rotulo: 'Apagar', destrutivo: true, onPress: () => confirmarApagar('Este aviso', () => apagarAviso(a.id)) },
    ]);

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
      <ScrollView keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <Secao titulo="Publicar">
          <Linha titulo="Nova missa ou evento" icone="calendar.badge.plus" onPress={() => router.push('/editar-evento')} />
          <Linha titulo="Novo aviso" icone="megaphone" onPress={() => router.push('/editar-aviso')} />
          <Linha
            titulo="Oração da Comunidade"
            sub="Proposta da semana (PDF), novenas e jornadas, orações"
            icone="hands.sparkles"
            onPress={() => router.push('/admin-oracao')}
          />
          <Linha titulo="Sugestões recebidas" sub="Ideias e textos que os membros não encontraram" icone="text.bubble" onPress={() => router.push('/sugestoes')} />
          <Linha
            titulo="Testar notificação"
            sub="Envia uma notificação só para este aparelho, para conferir"
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

        <Secao titulo="Próximas missas e eventos">
          {proximos.length ? (
            proximos.map((e, i) => (
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
                ultimo={i === proximos.length - 1}
              />
            ))
          ) : (
            <Aviso texto="Nenhuma missa ou evento pela frente." />
          )}
        </Secao>
        <Text style={{ color: c.textoFraco, fontSize: 13, marginHorizontal: Espaco.xl, marginTop: -Espaco.m, marginBottom: Espaco.xl }}>
          Os que já passaram ficam no calendário da Agenda: toque no dia para abrir e editar.
        </Text>

        <Secao titulo="Avisos no ar">
          {noAr.length ? (
            noAr.map((a, i) => (
              <Linha
                key={a.id}
                titulo={a.titulo}
                sub={`${new Date(a.criado).toLocaleDateString('pt-BR')}${a.fixado ? ' · fixado' : ''}${a.venceEm ? ` · até ${diaEHora(new Date(a.venceEm))}` : ' · sem vencimento'}`}
                icone={a.fixado ? 'pin.fill' : 'megaphone'}
                direita={escolhendo ? <Icone nome={escolhidos.includes(a.id) ? 'checkmark.circle.fill' : 'circle'} tamanho={22} /> : undefined}
                onPress={() => (escolhendo ? alternarEscolha(a.id) : opcoesAviso(a))}
                ultimo={i === noAr.length - 1}
              />
            ))
          ) : (
            <Aviso texto="Nenhum aviso no ar." />
          )}
        </Secao>
        {noAr.length > 1 || escolhendo ? (
          <View style={{ marginHorizontal: Espaco.l, marginTop: -Espaco.s, marginBottom: Espaco.xl, gap: 10 }}>
            {escolhendo ? (
              <>
                <Botao
                  titulo={escolhidos.length ? `Encerrar ${escolhidos.length === 1 ? '1 aviso' : `${escolhidos.length} avisos`} para todos` : 'Toque nos avisos para escolher'}
                  icone="archivebox"
                  desativado={!escolhidos.length}
                  onPress={() => encerrar(escolhidos, () => (setEscolhendo(false), setEscolhidos([])))}
                />
                <Botao titulo="Cancelar" tipo="secundario" onPress={() => (setEscolhendo(false), setEscolhidos([]))} />
              </>
            ) : (
              <Botao titulo="Encerrar vários" icone="checkmark.circle" tipo="secundario" onPress={() => setEscolhendo(true)} />
            )}
          </View>
        ) : null}

        {encerrados.length ? (
          <Secao titulo="Encerrados">
            {encerrados.map((a, i) => (
              <Linha
                key={a.id}
                titulo={a.titulo}
                sub={`Encerrado em ${diaEHora(new Date(a.venceEm!))}`}
                icone="archivebox"
                onPress={() => opcoesAviso(a)}
                ultimo={i === encerrados.length - 1}
              />
            ))}
          </Secao>
        ) : null}
        <Text style={{ color: c.textoFraco, fontSize: 13, marginHorizontal: Espaco.xl, marginTop: encerrados.length ? -Espaco.m : 0, marginBottom: Espaco.xl }}>
          Encerrado sai do topo e da lista de Avisos de todos e fica em Arquivados como &quot;Encerrado&quot;. Nada é apagado: dá para reativar.
        </Text>

        <View style={{ marginHorizontal: Espaco.l, marginBottom: 40 }}>
          <Botao titulo="Sair da administração" tipo="secundario" icone="rectangle.portrait.and.arrow.right" onPress={() => sair()} />
          <Text style={{ height: 10 }} />
        </View>
      </ScrollView>
    </Fundo>
  );
}
