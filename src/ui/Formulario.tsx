import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { enviarImagem } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Icone, toque } from './base';

export function Campo({ rotulo, ...props }: TextInputProps & { rotulo: string }) {
  const c = usePaleta();
  return (
    <View style={{ paddingHorizontal: Espaco.l, paddingVertical: 10 }}>
      <Text style={{ color: c.textoFraco, fontSize: 13, marginBottom: 6 }}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={c.textoFraco}
        {...props}
        style={[
          { color: c.texto, backgroundColor: c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 12, fontSize: 16 },
          props.multiline ? { minHeight: 110, textAlignVertical: 'top' } : null,
        ]}
      />
    </View>
  );
}

/** Escolhe uma imagem da galeria, envia ao servidor e devolve a URL */
export function CampoImagem({ url, mudar }: { url?: string | null; mudar: (u: string | null) => void }) {
  const c = usePaleta();
  const [enviando, setEnviando] = useState(false);
  const escolher = async () => {
    toque();
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true, allowsEditing: true });
    if (r.canceled || !r.assets[0]?.base64) return;
    setEnviando(true);
    try {
      const a = r.assets[0];
      const u = await enviarImagem(a.base64!, a.mimeType ?? 'image/jpeg');
      mudar(u);
    } catch (e: any) {
      Alert.alert('Não foi possível enviar a imagem', String(e?.message ?? e));
    } finally {
      setEnviando(false);
    }
  };
  return (
    <View style={{ paddingHorizontal: Espaco.l, paddingVertical: 10 }}>
      <Text style={{ color: c.textoFraco, fontSize: 13, marginBottom: 6 }}>Imagem (opcional)</Text>
      {url ? (
        <View>
          <Image source={{ uri: url }} style={{ height: 160, borderRadius: 14 }} contentFit="cover" />
          <Pressable
            onPress={() =>
              Alert.alert('Tem certeza?', 'A imagem será retirada.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Retirar', style: 'destructive', onPress: () => mudar(null) },
              ])
            }
            style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 6 }}>
            <Icone nome="xmark" cor="#fff" tamanho={14} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={escolher} style={{ height: 90, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.textoFraco, alignItems: 'center', justifyContent: 'center' }}>
          {enviando ? <ActivityIndicator color={c.destaque} /> : <Icone nome="photo.badge.plus" tamanho={24} />}
        </Pressable>
      )}
    </View>
  );
}
