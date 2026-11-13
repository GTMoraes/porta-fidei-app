// Uma comissão (Administração › Comissões, ou "Coordenação de ..." para quem coordena): coordenação e membros, pôr e
// tirar pessoas e as reuniões dela (o toque abre o próximo dia, onde dá para cancelar ou mudar só aquele dia).
// A coordenação põe e tira membros; só o administrador escolhe ou tira a coordenação, renomeia e apaga a comissão.

import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { faixaHoras, ocorrencias, textoRegra } from '@/comunidade/rotinas';
import { useConta } from '@/estado/conta';
import { abrirComissao, porNaComissao, tirarDaComissao, useServidor, type MembroComissao } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Avatar } from '@/ui/Avatar';
import { diaIso } from '@/ui/Agenda';
import { Aviso, Fundo, Icone, Linha, Secao, toque } from '@/ui/base';
import { mostrarOpcoes } from '@/ui/Opcoes';

export default function TelaComissao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = usePaleta();
  const eu = useConta();
  const srv = useServidor();
  const [dados, setDados] = useState<{ id: string; nome: string; membros: MembroComissao[] } | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    abrirComissao(id)
      .then((d) => (setDados(d), setErro('')))
      .catch((e: any) => setErro(String(e?.message ?? e)));
  }, [id]);
  useFocusEffect(carregar);

  if (erro || !dados)
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

  const admin = !!eu?.admin;
  const coordenacao = dados.membros.filter((m) => m.coordenador);
  const membros = dados.membros.filter((m) => !m.coordenador);
  const mudar = async (acao: () => Promise<unknown>) => {
    try {
      await acao();
      carregar();
    } catch (e: any) {
      Alert.alert('Não foi possível', String(e?.message ?? e));
    }
  };
  const tirar = (m: MembroComissao) =>
    Alert.alert('Tem certeza?', `${m.nome} sai de ${dados.nome}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: () => mudar(() => tirarDaComissao(dados.id, m.id)) },
    ]);
  const opcoes = (m: MembroComissao) => {
    toque();
    if (!admin) {
      if (m.coordenador) return Alert.alert(m.nome, 'Quem escolhe a coordenação é um administrador.');
      return mostrarOpcoes(m.nome, [{ rotulo: 'Tirar da comissão', destrutivo: true, onPress: () => tirar(m) }]);
    }
    mostrarOpcoes(m.nome, [
      { rotulo: 'Abrir a pessoa', onPress: () => router.push({ pathname: '/pessoa', params: { id: m.id } }) },
      m.coordenador
        ? { rotulo: 'Deixar só como membro', onPress: () => mudar(() => porNaComissao(dados.id, m.id, false)) }
        : { rotulo: 'Pôr na coordenação', onPress: () => mudar(() => porNaComissao(dados.id, m.id, true)) },
      { rotulo: 'Tirar da comissão', destrutivo: true, onPress: () => tirar(m) },
    ]);
  };

  // as reuniões desta comissão (Rotinas) e o próximo dia de cada uma
  const igual = (a?: string | null) => !!a && a.trim().toLowerCase() === dados.nome.trim().toLowerCase();
  const reunioes = (srv.comunidade?.rotinas ?? []).filter((r) => r.ativa !== false && r.tipo === 'comissao' && igual(r.comissao));
  const hoje = diaIso(new Date());
  const ate = diaIso(new Date(Date.now() + 70 * 86400_000));
  const proximo = (rid: string) =>
    ocorrencias(reunioes.filter((r) => r.id === rid), hoje, ate, srv.comunidade?.excecoes).find((o) => o.fim.getTime() > Date.now() && o.situacao !== 'remarcada');

  const linhaPessoa = (m: MembroComissao, ultimo: boolean) => (
    <Pressable key={m.id} onPress={() => opcoes(m)} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Espaco.m, paddingVertical: 10, paddingHorizontal: Espaco.l }}>
        <Avatar foto={m.foto} nome={m.nome} tamanho={36} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.texto, fontSize: 17 }} numberOfLines={1}>
            {m.nome}
            {m.id === eu?.id ? ' (você)' : ''}
          </Text>
          <Text style={{ color: c.textoFraco, fontSize: 13.5 }} numberOfLines={1}>
            @{m.usuario}
          </Text>
        </View>
        <Icone nome="ellipsis" cor={c.textoFraco} tamanho={16} />
      </View>
      {!ultimo ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separador, marginLeft: 64 }} /> : null}
    </Pressable>
  );

  return (
    <Fundo>
      <Stack.Screen options={{ title: dados.nome }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Espaco.m }}>
        <Secao titulo="Coordenação">
          {coordenacao.length ? (
            coordenacao.map((m, i) => linhaPessoa(m, i === coordenacao.length - 1))
          ) : (
            <Aviso icone="star.circle" texto={admin ? 'Sem coordenação. Toque num membro para pôr na coordenação.' : 'Sem coordenação.'} />
          )}
        </Secao>
        <Secao titulo={`Membros (${membros.length})`}>
          {membros.map((m) => linhaPessoa(m, false))}
          <Linha
            titulo="Pôr uma pessoa na comissão"
            sub="Ela precisa ter uma conta no app"
            icone="person.badge.plus"
            onPress={() => router.push({ pathname: '/pessoas', params: { escolher: dados.id, nome: dados.nome, ja: dados.membros.map((m) => m.id).join(',') } })}
            ultimo
          />
        </Secao>

        <Secao titulo="Reuniões">
          {reunioes.length ? (
            reunioes.map((r, i) => {
              const o = proximo(r.id);
              return (
                <Linha
                  key={r.id}
                  titulo={r.titulo}
                  sub={`${textoRegra(r)}, ${faixaHoras(r.hora, r.fim)}${r.local ? ` · ${r.local}` : ''}`}
                  icone="clock"
                  onPress={o ? () => router.push({ pathname: '/rotina-dia', params: { id: r.id, data: o.data } }) : undefined}
                  ultimo={i === reunioes.length - 1}
                />
              );
            })
          ) : (
            <Aviso icone="clock" texto="Nenhuma reunião cadastrada em Rotinas para esta comissão." />
          )}
        </Secao>
        {reunioes.length ? (
          <Text style={{ color: c.textoFraco, fontSize: 13, marginHorizontal: Espaco.xl, marginTop: -Espaco.m, marginBottom: Espaco.xl, lineHeight: 18 }}>
            Toque numa reunião para abrir o próximo dia dela: lá dá para cancelar ou mudar o horário só daquele dia.
          </Text>
        ) : null}

        {admin ? (
          <Secao>
            <Linha titulo="Renomear ou apagar a comissão" icone="pencil" onPress={() => router.push({ pathname: '/editar-comissao', params: { id: dados.id, nome: dados.nome } })} ultimo />
          </Secao>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
