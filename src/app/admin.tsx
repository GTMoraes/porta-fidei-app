// Administração (0.7.0: por conta). Cada um vê só as partes das tarefas que um administrador deu (capacidades, ver
// `estado/conta.ts`): Agenda (missas, eventos, rotinas), Avisos e notificações, Oração da Comunidade; quem coordena uma
// comissão vê a dela. O administrador vê tudo, mais Pessoas, Comissões, Sugestões recebidas e o teste de notificação.
// Entrar e sair: Ajustes › sua conta.

import type { SFSymbol } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { coordenacoes, ehEquipe, pode, useConta } from '@/estado/conta';
import { registrarPush } from '@/estado/push';
import { eventosDaAgenda } from '@/estado/vistos';
import { apagarAviso, apagarEvento, atualizar, encerrado, encerrarAvisos, testarNotificacao, useServidor, type Aviso as AvisoT } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Botao, Fundo, Icone, Linha, Secao } from '@/ui/base';
import { mostrarOpcoes } from '@/ui/Opcoes';
import { diaEHora, quando } from '@/util/datas';

type Item = { titulo: string; sub?: string; icone: SFSymbol; onPress: () => void };
/** Linhas de uma seção (a última sem o separador); seção vazia não aparece */
function Grupo({ titulo, itens }: { titulo?: string; itens: (Item | false)[] }) {
  const l = itens.filter((x): x is Item => !!x);
  if (!l.length) return null;
  return (
    <Secao titulo={titulo}>
      {l.map((x, i) => (
        <Linha key={x.titulo} titulo={x.titulo} sub={x.sub} icone={x.icone} onPress={x.onPress} ultimo={i === l.length - 1} />
      ))}
    </Secao>
  );
}

export default function Admin() {
  const srv = useServidor();
  const conta = useConta();
  const router = useRouter();
  const c = usePaleta();
  // "Encerrar vários": escolher avisos e encerrar todos de uma vez
  const [escolhendo, setEscolhendo] = useState(false);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);

  if (!conta || !ehEquipe(conta)) {
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Espaco.l }}>
          <Secao>
            <Aviso
              icone="lock.shield"
              texto={
                conta
                  ? 'Sua conta ainda não tem tarefas na Administração. Quem dá as tarefas (agenda, avisos, oração, coordenação de comissão) são os administradores do app.'
                  : 'Área da coordenação: publicar missas, eventos e avisos para toda a Comunidade. Entre com a sua conta.'
              }
            />
          </Secao>
          {conta ? null : (
            <View style={{ marginHorizontal: Espaco.l }}>
              <Botao titulo="Entrar na sua conta" icone="person.crop.circle" onPress={() => router.push('/entrar')} />
            </View>
          )}
        </ScrollView>
      </Fundo>
    );
  }
  const agenda = pode(conta, 'agenda');
  const avisos = pode(conta, 'avisos');
  const oracao = pode(conta, 'oracao');
  const admin = conta.admin;

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
        <Grupo
          titulo="Publicar"
          itens={[
            agenda && { titulo: 'Nova missa ou evento', icone: 'calendar.badge.plus', onPress: () => router.push('/editar-evento') },
            avisos && { titulo: 'Novo aviso', icone: 'megaphone', onPress: () => router.push('/editar-aviso') },
            oracao && { titulo: 'Oração da Comunidade', sub: 'Proposta da semana (PDF), novenas e jornadas, orações', icone: 'hands.sparkles', onPress: () => router.push('/admin-oracao') },
            agenda && { titulo: 'Rotinas', sub: 'Horários fixos: missas da semana, adoração, grupos de oração, comissões', icone: 'clock', onPress: () => router.push('/admin-rotinas') },
          ]}
        />
        <Grupo
          titulo={admin ? 'Pessoas e comissões' : 'Suas comissões'}
          itens={
            admin
              ? [
                  { titulo: 'Pessoas', sub: 'Contas, tarefas no app, comissões e senha provisória', icone: 'person.crop.circle', onPress: () => router.push('/pessoas') },
                  { titulo: 'Comissões', sub: 'Quem está em cada uma e quem coordena', icone: 'person.2', onPress: () => router.push('/comissoes') },
                ]
              : coordenacoes(conta).map((cm) => ({
                  titulo: cm.nome,
                  sub: 'Coordenação: membros e reuniões',
                  icone: 'star.circle' as SFSymbol,
                  onPress: () => router.push({ pathname: '/comissao', params: { id: cm.id } }),
                }))
          }
        />
        <Grupo
          titulo="Para quem cuida do app"
          itens={[
            admin && { titulo: 'Sugestões recebidas', sub: 'Ideias e textos que os membros não encontraram', icone: 'text.bubble', onPress: () => router.push('/sugestoes') },
            admin && {
              titulo: 'Testar notificação',
              sub: 'Envia uma notificação só para este aparelho, para conferir',
              icone: 'bell.badge',
              onPress: async () => {
                try {
                  const meu = await registrarPush(true);
                  const r = await testarNotificacao('Porta Fidei', 'Teste de notificação do app da Comunidade.', meu);
                  Alert.alert('Enviado', `${meu ? 'Enviada para este aparelho.' : 'Este aparelho não está registrado para push (permissão negada?).'}\n\n${r?.resultado ?? ''}`);
                } catch (e: any) {
                  Alert.alert('Erro', String(e?.message ?? e));
                }
              },
            },
          ]}
        />

        {agenda ? (
          <>
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
          </>
        ) : null}

        {avisos ? (
          <>
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
        </>
        ) : null}

        <Text style={{ color: c.textoFraco, fontSize: 13, marginHorizontal: Espaco.xl, marginBottom: 50, textAlign: 'center' }}>
          {`Conectado como ${conta.nome}${conta.usuario ? ` (@${conta.usuario})` : ''}. Para sair, use Ajustes › sua conta.`}
        </Text>
      </ScrollView>
    </Fundo>
  );
}
