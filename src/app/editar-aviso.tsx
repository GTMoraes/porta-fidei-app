import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { apagarAviso, atualizar, salvarAviso, useServidor } from '@/servidor/api';
import { Espaco } from '@/tema';
import { Botao, Chave, Fundo, Linha, Secao } from '@/ui/base';
import { Campo, CampoImagem } from '@/ui/Formulario';

export default function EditarAviso() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const srv = useServidor();
  const router = useRouter();
  const orig = srv.avisos.find((a) => a.id === id);

  const [titulo, setTitulo] = useState(orig?.titulo ?? '');
  const [texto, setTexto] = useState(orig?.texto ?? '');
  const [imagem, setImagem] = useState<string | null>(orig?.imagem ?? null);
  const [fixado, setFixado] = useState(!!orig?.fixado);
  const [notificar, setNotificar] = useState(!orig);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarAviso({ id: orig?.id, titulo: titulo.trim(), texto: texto.trim(), imagem, fixado, notificar });
      await atualizar();
      router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Secao titulo="Aviso">
          <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} />
          <Campo rotulo="Texto" value={texto} onChangeText={setTexto} multiline />
          <CampoImagem url={imagem} mudar={setImagem} />
        </Secao>
        <Secao titulo="Opções">
          <Linha titulo="Fixar no topo" direita={<Chave valor={fixado} mudar={setFixado} />} />
          <Linha
            titulo="Notificar os membros"
            sub="Por enquanto a notificação chega só no Bark do Gabriel, para conferir como ficaria"
            direita={<Chave valor={notificar} mudar={setNotificar} />}
            ultimo
          />
        </Secao>
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={salvando ? 'Publicando…' : 'Publicar'} icone="paperplane" desativado={salvando || !titulo.trim() || !texto.trim()} onPress={salvar} />
          {orig ? (
            <Botao
              titulo="Apagar"
              tipo="perigo"
              icone="trash"
              onPress={() =>
                Alert.alert('Tem certeza?', 'Este aviso será apagado para todos os membros.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await apagarAviso(orig.id);
                        await atualizar();
                        router.back();
                      } catch (e: any) {
                        Alert.alert('Erro', String(e?.message ?? e));
                      }
                    },
                  },
                ])
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
