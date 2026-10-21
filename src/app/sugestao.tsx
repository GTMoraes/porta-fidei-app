// Enviar sugestão (Ajustes) e "Sugerir este texto" (busca sem resultado): chega para a coordenação do app.

import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { enviarSugestao } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { CampoTexto } from '@/ui/BarraTeclado';
import { Botao, Fundo } from '@/ui/base';

export default function TelaSugestao() {
  const p = useLocalSearchParams<{ texto?: string; origem?: string }>();
  const router = useRouter();
  const c = usePaleta();
  const [texto, setTexto] = useState(p.texto ?? '');
  const [enviando, setEnviando] = useState(false);
  const origem = p.origem === 'busca' ? 'busca' : 'ajustes';

  const enviar = async () => {
    setEnviando(true);
    try {
      const versao = `${Constants.expoConfig?.version ?? ''}${Updates.updateId ? ` · ${Updates.updateId.slice(0, 8)}` : ''}`;
      await enviarSugestao(texto.trim(), origem, versao);
      Alert.alert('Obrigado!', 'Sua sugestão chegou para a coordenação do app.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Não foi possível enviar', String(e?.message ?? e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="interactive" contentContainerStyle={{ padding: Espaco.l, gap: Espaco.m }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21 }}>
          {origem === 'busca'
            ? 'Diga o que você procurava (o nome da oração, do ofício ou do texto). Vamos ver se dá para incluir.'
            : 'Uma ideia, algo que você não encontrou, um erro no texto ou na tela: escreva aqui. Chega direto para quem cuida do app.'}
        </Text>
        <CampoTexto
          value={texto}
          onChangeText={setTexto}
          multiline
          autoFocus
          placeholder="Escreva sua sugestão"
          placeholderTextColor={c.textoFraco}
          maxLength={2000}
          style={{ minHeight: 160, color: c.texto, backgroundColor: c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 14, padding: 14, fontSize: 16, textAlignVertical: 'top' }}
        />
        <View style={{ marginTop: Espaco.s }}>
          <Botao titulo={enviando ? 'Enviando…' : 'Enviar'} icone="paperplane" desativado={enviando || texto.trim().length < 3} onPress={enviar} />
        </View>
      </ScrollView>
    </Fundo>
  );
}
