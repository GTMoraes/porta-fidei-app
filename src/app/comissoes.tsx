// Administração › Comissões (só administradores): a lista, quantos membros e quem coordena cada uma. As comissões que
// têm reunião em Rotinas entram aqui sozinhas. O toque abre a comissão (membros e coordenação).

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { listarComissoes, type ComissaoResumo } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';

const subComissao = (cm: ComissaoResumo) =>
  `${cm.membros === 1 ? '1 pessoa' : `${cm.membros} pessoas`} · ${cm.coordenadores.length ? `coordenação: ${cm.coordenadores.join(', ')}` : 'sem coordenação'}`;

export default function Comissoes() {
  const router = useRouter();
  const c = usePaleta();
  const [lista, setLista] = useState<ComissaoResumo[] | null>(null);
  const [erro, setErro] = useState('');
  useFocusEffect(
    useCallback(() => {
      listarComissoes()
        .then((l) => (setLista(l), setErro('')))
        .catch((e: any) => setErro(String(e?.message ?? e)));
    }, []),
  );
  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Espaco.m }}>
        <Secao>
          <Linha titulo="Nova comissão" icone="plus.circle" onPress={() => router.push('/editar-comissao')} ultimo />
        </Secao>
        {erro ? (
          <Secao>
            <Aviso icone="wifi.slash" texto={erro} />
          </Secao>
        ) : !lista ? (
          <ActivityIndicator color={c.destaque} style={{ marginTop: 30 }} />
        ) : (
          <Secao titulo="Comissões">
            {lista.length ? (
              lista.map((cm, i) => (
                <Linha key={cm.id} titulo={cm.nome} sub={subComissao(cm)} icone="person.2" onPress={() => router.push({ pathname: '/comissao', params: { id: cm.id } })} ultimo={i === lista.length - 1} />
              ))
            ) : (
              <Aviso icone="person.2" texto="Nenhuma comissão ainda." />
            )}
          </Secao>
        )}
        <Text style={{ color: c.textoFraco, fontSize: 13, marginHorizontal: Espaco.xl, marginTop: -Espaco.m, marginBottom: Espaco.xl, lineHeight: 18 }}>
          Quem coloca as pessoas numa comissão é a coordenação dela (ou um administrador). A pessoa não escolhe a própria comissão; ela pode só ver as reuniões
          de outras na Agenda.
        </Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </Fundo>
  );
}
