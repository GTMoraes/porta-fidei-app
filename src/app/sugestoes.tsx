// Administração: sugestões e "não encontrei" enviadas pelos membros.

import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';

import { apagarSugestao, listarSugestoes, type Sugestao } from '@/servidor/api';
import { usePaleta } from '@/tema';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';
import { dataCurta, hora } from '@/util/datas';

export default function Sugestoes() {
  const c = usePaleta();
  const [lista, setLista] = useState<Sugestao[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const carregar = async () => {
    setCarregando(true);
    try {
      setLista(await listarSugestoes());
    } catch (e: any) {
      Alert.alert('Erro', String(e?.message ?? e));
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => {
    carregar();
  }, []);

  const apagar = (s: Sugestao) =>
    Alert.alert('Tem certeza?', 'A sugestão será apagada.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagarSugestao(s.id);
            setLista((l) => (l ?? []).filter((x) => x.id !== s.id));
          } catch (e: any) {
            Alert.alert('Erro', String(e?.message ?? e));
          }
        },
      },
    ]);

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={c.destaque} colors={[c.destaque]} />}>
        <Secao>
          {lista && !lista.length ? <Aviso texto="Nenhuma sugestão por enquanto." /> : null}
          {(lista ?? []).map((s, i, l) => {
            const d = new Date(s.criado);
            return (
              <Linha
                key={s.id}
                titulo={s.texto}
                sub={`${dataCurta(d)} às ${hora(d)} · ${s.origem === 'busca' ? 'busca sem resultado' : 'Ajustes'}${s.versao ? ` · ${s.versao}` : ''}`}
                icone={s.origem === 'busca' ? 'magnifyingglass' : 'text.bubble'}
                onPress={() => Alert.alert('Sugestão', s.texto, [{ text: 'Fechar', style: 'cancel' }, { text: 'Apagar', style: 'destructive', onPress: () => apagar(s) }])}
                seta={false}
                ultimo={i === l.length - 1}
              />
            );
          })}
        </Secao>
      </ScrollView>
    </Fundo>
  );
}
