// Administração › Pessoas: todas as contas, com busca (sem acento: "joao" acha João). O toque abre a pessoa
// (capacidades, comissões, senha provisória, desativar).
// `escolher` = id de uma comissão: modo de escolher alguém para pôr nela (também para a coordenação da comissão,
// que só vê nome, usuário e foto); `ja` = ids de quem já está nela.

import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { resumoPessoa } from '@/estado/conta';
import { listarPessoas, porNaComissao, type Pessoa } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Avatar } from '@/ui/Avatar';
import { Aviso, Fundo, Icone, Secao, toque } from '@/ui/base';

const dobrar = (v?: string | null) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Pessoas() {
  const { escolher, nome, ja } = useLocalSearchParams<{ escolher?: string; nome?: string; ja?: string }>();
  const router = useRouter();
  const c = usePaleta();
  const [lista, setLista] = useState<Pessoa[] | null>(null);
  const [erro, setErro] = useState('');
  const [q, setQ] = useState('');
  const [pondo, setPondo] = useState<string | null>(null);
  const jaEsta = new Set((ja ?? '').split(',').filter(Boolean));

  useFocusEffect(
    useCallback(() => {
      listarPessoas()
        .then((l) => (setLista(l), setErro('')))
        .catch((e: any) => setErro(String(e?.message ?? e)));
    }, []),
  );

  const busca = dobrar(q.trim()).replace(/^@/, '');
  const achadas = (lista ?? []).filter((p) => !busca || dobrar(p.nome).includes(busca) || dobrar(p.usuario).includes(busca) || dobrar(p.email).includes(busca));

  const tocar = async (p: Pessoa) => {
    toque();
    if (!escolher) return router.push({ pathname: '/pessoa', params: { id: p.id } });
    if (jaEsta.has(p.id)) return;
    setPondo(p.id);
    try {
      await porNaComissao(escolher, p.id);
      router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível pôr na comissão', String(e?.message ?? e));
    } finally {
      setPondo(null);
    }
  };

  return (
    <Fundo>
      <Stack.Screen options={{ title: escolher ? `Pôr em ${nome ?? 'comissão'}` : 'Pessoas' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.m }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: Espaco.l,
            marginBottom: Espaco.l,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          }}>
          <Icone nome="magnifyingglass" cor={c.textoFraco} tamanho={16} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Nome, usuário ou e-mail"
            placeholderTextColor={c.textoFraco}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            underlineColorAndroid="transparent"
            cursorColor="#BC8C44"
            style={{ flex: 1, color: c.texto, fontSize: 16, paddingVertical: 11 }}
          />
        </View>
        {erro ? (
          <Secao>
            <Aviso icone="wifi.slash" texto={erro} />
          </Secao>
        ) : !lista ? (
          <ActivityIndicator color={c.destaque} style={{ marginTop: 30 }} />
        ) : (
          <Secao titulo={`${achadas.length} ${achadas.length === 1 ? 'pessoa' : 'pessoas'}`}>
            {achadas.length ? (
              achadas.map((p, i) => {
                const esta = jaEsta.has(p.id);
                const sub = escolher ? (esta ? 'Já está na comissão' : `@${p.usuario}`) : [`@${p.usuario}`, resumoPessoa(p)].filter(Boolean).join(' · ');
                return (
                  <Pressable key={p.id} onPress={() => tocar(p)} disabled={!!pondo || esta} style={({ pressed }) => ({ opacity: pressed || esta ? 0.5 : 1 })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Espaco.m, paddingVertical: 10, paddingHorizontal: Espaco.l }}>
                      <Avatar foto={p.foto} nome={p.nome} tamanho={38} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: p.ativo === false ? c.textoFraco : c.texto, fontSize: 17 }} numberOfLines={1}>
                          {p.nome}
                        </Text>
                        <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 1 }} numberOfLines={1}>
                          {sub}
                        </Text>
                      </View>
                      {pondo === p.id ? <ActivityIndicator color={c.destaque} /> : escolher ? (esta ? <Icone nome="checkmark" tamanho={16} /> : <Icone nome="plus.circle" tamanho={20} />) : <Icone nome="chevron.right" cor={c.textoFraco} tamanho={14} />}
                    </View>
                    {i < achadas.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separador, marginLeft: 66 }} /> : null}
                  </Pressable>
                );
              })
            ) : (
              <Aviso icone="person.2" texto={q ? 'Ninguém com esse nome.' : 'Ainda não há contas.'} />
            )}
          </Secao>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
