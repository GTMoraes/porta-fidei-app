// Quem marcou "Tenho interesse" num evento (0.7.1). Só para administradores, toda a coordenação e os membros da
// comissão responsável pelo evento (o servidor confere); os outros veem só quantos marcaram.

import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listarInteressados, useServidor, type Interessado } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Avatar } from '@/ui/Avatar';
import { Aviso, Fundo, Secao } from '@/ui/base';

export default function Interessados() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = usePaleta();
  const srv = useServidor();
  const e = srv.eventos.find((x) => x.id === id);
  const [lista, setLista] = useState<Interessado[] | null>(null);
  const [erro, setErro] = useState('');
  useFocusEffect(
    useCallback(() => {
      listarInteressados(id)
        .then((l) => (setLista(l), setErro('')))
        .catch((err: any) => setErro(String(err?.message ?? err)));
    }, [id]),
  );
  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Espaco.m }}>
        {e ? <Text style={{ color: c.textoSuave, fontSize: 15, marginHorizontal: Espaco.xl, marginBottom: Espaco.l }}>{e.titulo}</Text> : null}
        {erro ? (
          <Secao>
            <Aviso icone="exclamationmark.triangle" texto={erro} />
          </Secao>
        ) : !lista ? (
          <ActivityIndicator color={c.destaque} style={{ marginTop: 30 }} />
        ) : (
          <Secao titulo={lista.length === 1 ? '1 pessoa' : `${lista.length} pessoas`}>
            {lista.length ? (
              lista.map((p, i) => (
                <View key={p.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Espaco.m, paddingVertical: 10, paddingHorizontal: Espaco.l }}>
                    <Avatar foto={p.foto} nome={p.nome} tamanho={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.texto, fontSize: 17 }} numberOfLines={1}>
                        {p.nome}
                      </Text>
                      <Text style={{ color: c.textoFraco, fontSize: 13.5 }} numberOfLines={1}>
                        @{p.usuario} · marcou em {new Date(p.criado).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>
                  {i < lista.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separador, marginLeft: 64 }} /> : null}
                </View>
              ))
            ) : (
              <Aviso icone="person.2" texto="Ninguém marcou interesse ainda." />
            )}
          </Secao>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
