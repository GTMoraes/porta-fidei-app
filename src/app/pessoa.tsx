// Administração › Pessoas › uma pessoa (só administradores): tarefas no app (Administrador e as capacidades), comissões
// (não participa, membro ou coordenação), senha provisória, desativar e apagar a conta. Cada mudança vale na hora.

import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, Text, View } from 'react-native';

import { CAPACIDADES, useConta } from '@/estado/conta';
import {
  abrirPessoa,
  apagarPessoa,
  buscarConta,
  gerarSenhaProvisoria,
  listarComissoes,
  porNaComissao,
  salvarPessoa,
  tirarDaComissao,
  type Capacidade,
  type ComissaoResumo,
  type Pessoa,
} from '@/servidor/api';
import { Espaco, fonteTitulo, usePaleta } from '@/tema';
import { Avatar } from '@/ui/Avatar';
import { Aviso, Botao, Chave, Fundo, Linha, Secao } from '@/ui/base';
import { mostrarOpcoes } from '@/ui/Opcoes';

const data = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

export default function TelaPessoa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = usePaleta();
  const eu = useConta();
  const [p, setP] = useState<Pessoa | null>(null);
  const [comissoes, setComissoes] = useState<ComissaoResumo[]>([]);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(() => {
    Promise.all([abrirPessoa(id), listarComissoes()])
      .then(([pessoa, cs]) => (setP(pessoa), setComissoes(cs), setErro('')))
      .catch((e: any) => setErro(String(e?.message ?? e)));
  }, [id]);
  useFocusEffect(carregar);

  if (erro || !p)
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          {erro ? (
            <Secao>
              <Aviso icone="exclamationmark.triangle" texto={erro} />
            </Secao>
          ) : (
            <ActivityIndicator color={c.destaque} style={{ marginTop: 40 }} />
          )}
        </ScrollView>
      </Fundo>
    );

  const souEu = p.id === eu?.id;
  /** salva e relê (a minha própria conta também, se mudei a mim mesmo) */
  const mudar = async (acao: () => Promise<unknown>) => {
    setOcupado(true);
    try {
      await acao();
      carregar();
      if (souEu) await buscarConta().catch(() => {});
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setOcupado(false);
    }
  };
  const caps = p.capacidades ?? [];
  const alternarCapacidade = (cap: Capacidade, sim: boolean) => mudar(() => salvarPessoa(p.id, { capacidades: sim ? [...caps, cap] : caps.filter((x) => x !== cap) }));
  const alternarAdmin = (sim: boolean) =>
    Alert.alert(
      'Tem certeza?',
      sim
        ? `${p.nome} vai poder tudo no app, inclusive dar e tirar tarefas e administradores.`
        : souEu
          ? 'Você deixa de ser administrador e perde o acesso a esta tela.'
          : `${p.nome} deixa de ser administrador.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: sim ? 'Tornar administrador' : 'Tirar', style: sim ? 'default' : 'destructive', onPress: () => mudar(() => salvarPessoa(p.id, { admin: sim })) },
      ],
    );
  const naComissao = (cm: ComissaoResumo) => p.comissoes?.find((x) => x.id === cm.id);
  const escolherComissao = (cm: ComissaoResumo) => {
    const atual = naComissao(cm);
    mostrarOpcoes(cm.nome, [
      ...(atual ? [{ rotulo: 'Não participa', destrutivo: true, onPress: () => mudar(() => tirarDaComissao(cm.id, p.id)) }] : []),
      ...(!atual || atual.coordenador ? [{ rotulo: 'Membro', onPress: () => mudar(() => porNaComissao(cm.id, p.id, false)) }] : []),
      ...(!atual?.coordenador ? [{ rotulo: 'Coordenação', onPress: () => mudar(() => porNaComissao(cm.id, p.id, true)) }] : []),
    ]);
  };
  const senhaProvisoria = () =>
    Alert.alert(
      'Tem certeza?',
      `A senha de agora deixa de valer e ${p.nome} sai da conta em todos os aparelhos. Você passa a senha provisória para a pessoa, que entra com ela e escolhe uma nova.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar',
          onPress: () =>
            mudar(async () => {
              const { senha } = await gerarSenhaProvisoria(p.id);
              const mensagem = `Sua senha provisória do app Porta Fidei é ${senha}\nEntre com o usuário ${p.usuario} e escolha uma senha nova.`;
              Alert.alert(`Senha provisória de ${p.nome}`, `${senha}\n\nEntre com o usuário ${p.usuario}. Ao entrar, o app pede uma senha nova.`, [
                { text: 'Compartilhar', onPress: () => Share.share({ message: mensagem }) },
                { text: 'OK' },
              ]);
            }),
        },
      ],
    );
  const ativar = (sim: boolean) =>
    Alert.alert(
      'Tem certeza?',
      sim ? `${p.nome} volta a poder entrar no app.` : `${p.nome} sai da conta em todos os aparelhos e não consegue entrar até você reativar. Nada é apagado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: sim ? 'Reativar' : 'Desativar', style: sim ? 'default' : 'destructive', onPress: () => mudar(() => salvarPessoa(p.id, { ativo: sim })) },
      ],
    );
  const apagar = () =>
    Alert.alert('Tem certeza?', `A conta de ${p.nome} é apagada de vez (nome, usuário, e-mail, foto, comissões). Não dá para desfazer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagarPessoa(p.id);
            router.back();
          } catch (e: any) {
            Alert.alert('Não foi possível apagar', String(e?.message ?? e));
          }
        },
      },
    ]);

  return (
    <Fundo>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Espaco.m }}>
        <View style={{ alignItems: 'center', gap: 4, marginBottom: Espaco.xl, opacity: p.ativo === false ? 0.6 : 1 }}>
          <Avatar foto={p.foto} nome={p.nome} tamanho={84} />
          <Text style={{ color: c.texto, ...fonteTitulo(23), marginTop: 8, textAlign: 'center', marginHorizontal: Espaco.xl }}>{p.nome}</Text>
          <Text style={{ color: c.textoFraco, fontSize: 15 }}>@{p.usuario}</Text>
          {p.email ? <Text style={{ color: c.textoSuave, fontSize: 15 }} selectable>{p.email}</Text> : null}
          <Text style={{ color: c.textoFraco, fontSize: 13, marginTop: 4 }}>
            {[p.criado ? `Conta desde ${data(p.criado)}` : '', p.visto ? `último acesso em ${data(p.visto)}` : ''].filter(Boolean).join(' · ')}
          </Text>
          {p.ativo === false ? <Text style={{ color: '#C0392B', fontSize: 14, fontWeight: '600', marginTop: 4 }}>Conta desativada</Text> : null}
          {p.senhaProvisoria ? <Text style={{ color: c.textoSuave, fontSize: 13, marginTop: 2 }}>Com senha provisória (ainda não trocou)</Text> : null}
        </View>

        <Secao titulo="Tarefas no app">
          <Linha titulo="Administrador" sub="Tudo, inclusive pessoas, comissões e outros administradores" direita={<Chave valor={!!p.admin} mudar={alternarAdmin} />} />
          {CAPACIDADES.map((cap, i) => (
            <Linha
              key={cap.id}
              titulo={cap.titulo}
              sub={p.admin ? 'O administrador já pode tudo' : cap.sub}
              direita={<Chave valor={!!p.admin || caps.includes(cap.id)} mudar={(v) => (p.admin ? null : alternarCapacidade(cap.id, v))} />}
              ultimo={i === CAPACIDADES.length - 1}
            />
          ))}
        </Secao>

        <Secao titulo="Comissões">
          {comissoes.length ? (
            comissoes.map((cm, i) => {
              const a = naComissao(cm);
              return (
                <Linha
                  key={cm.id}
                  titulo={cm.nome}
                  sub={a ? (a.coordenador ? 'Coordenação' : 'Membro') : 'Não participa'}
                  icone={a ? (a.coordenador ? 'star.circle' : 'person.2') : undefined}
                  corIcone={a ? undefined : c.textoFraco}
                  onPress={() => escolherComissao(cm)}
                  ultimo={i === comissoes.length - 1}
                />
              );
            })
          ) : (
            <Aviso icone="person.2" texto="Ainda não há comissões. Crie em Administração › Comissões." />
          )}
        </Secao>

        <Secao titulo="Conta">
          <Linha titulo="Gerar senha provisória" sub="Para quem esqueceu a senha" icone="key" onPress={senhaProvisoria} ultimo={souEu} />
          {souEu ? null : (
            <Linha
              titulo={p.ativo === false ? 'Reativar a conta' : 'Desativar a conta'}
              sub={p.ativo === false ? 'A pessoa volta a poder entrar' : 'A pessoa não consegue mais entrar; nada é apagado'}
              icone={p.ativo === false ? 'person.crop.circle' : 'person.crop.circle.badge.xmark'}
              onPress={() => ativar(p.ativo === false)}
              ultimo
            />
          )}
        </Secao>
        {souEu ? (
          <Text style={{ color: c.textoFraco, fontSize: 13, marginHorizontal: Espaco.xl, marginTop: -Espaco.m, marginBottom: Espaco.xl }}>
            Esta é a sua conta. Para sair ou apagar, use Ajustes › sua conta.
          </Text>
        ) : (
          <View style={{ marginHorizontal: Espaco.l, marginBottom: 60 }}>
            <Botao titulo="Apagar a conta" icone="trash" tipo="perigo" desativado={ocupado} onPress={apagar} />
          </View>
        )}
        {ocupado ? <ActivityIndicator color={c.destaque} style={{ marginBottom: 30 }} /> : null}
      </ScrollView>
    </Fundo>
  );
}
