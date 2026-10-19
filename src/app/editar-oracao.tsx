// Editar oração da Comunidade (texto digitado ou tirado de um PDF)

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { recarregarAdmin, useAdminComunidade } from '@/comunidade/admin';
import { escolherPdf } from '@/comunidade/pdf';
import { apagarOracao, salvarOracao, textoDoPdf } from '@/servidor/api';
import { Espaco } from '@/tema';
import { Botao, Chave, Fundo, Linha, Secao } from '@/ui/base';
import { Campo } from '@/ui/Formulario';

export default function EditarOracao() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { dados } = useAdminComunidade();
  const orig = dados?.oracoes.find((o) => o.id === id);

  const [titulo, setTitulo] = useState(orig?.titulo ?? '');
  const [subtitulo, setSubtitulo] = useState(orig?.subtitulo ?? '');
  const [texto, setTexto] = useState(orig?.texto ?? '');
  const [ativa, setAtiva] = useState(orig?.ativa ?? true);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const doPdf = async () => {
    try {
      const pdf = await escolherPdf();
      if (!pdf) return;
      setLendo(true);
      const r = await textoDoPdf(pdf.base64);
      setTexto(r.texto);
      if (!titulo.trim()) setTitulo(pdf.nome.replace(/\.pdf$/i, ''));
    } catch (e: any) {
      Alert.alert('Não foi possível ler o PDF', String(e?.message ?? e));
    } finally {
      setLendo(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarOracao({ id: orig?.id, titulo: titulo.trim(), subtitulo: subtitulo.trim() || null, texto: texto.trim(), ordem: orig?.ordem, ativa });
      await recarregarAdmin();
      router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Fundo>
      <ScrollView keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Secao titulo="Oração">
          <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} />
          <Campo rotulo="Subtítulo (opcional)" value={subtitulo} onChangeText={setSubtitulo} />
          <Linha
            titulo={lendo ? 'Lendo o PDF…' : 'Carregar o texto de um PDF'}
            icone="doc.badge.plus"
            direita={lendo ? <ActivityIndicator /> : undefined}
            onPress={lendo ? undefined : doPdf}
          />
          <Campo rotulo="Texto (linha em branco separa parágrafos; V. e R. ficam em vermelho)" value={texto} onChangeText={setTexto} multiline />
          <Linha titulo="Ativa" sub="Desativada, some do app" direita={<Chave valor={ativa} mudar={setAtiva} />} ultimo />
        </Secao>
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={salvando ? 'Salvando…' : 'Salvar'} icone="checkmark" desativado={salvando || !titulo.trim() || !texto.trim()} onPress={salvar} />
          {orig ? (
            <Botao
              titulo="Apagar"
              tipo="perigo"
              icone="trash"
              onPress={() =>
                Alert.alert('Tem certeza?', 'Esta oração será apagada para todos os membros.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await apagarOracao(orig.id);
                        await recarregarAdmin();
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
