// Foto da pessoa num círculo; sem foto, as iniciais do nome sobre o dourado da Comunidade.

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Text, View } from 'react-native';

import { iniciais } from '@/estado/conta';
import { Marca } from '@/tema';

export function Avatar({ foto, nome, tamanho = 40 }: { foto?: string | null; nome: string; tamanho?: number }) {
  const borda = { width: tamanho, height: tamanho, borderRadius: tamanho / 2, overflow: 'hidden' as const };
  if (foto)
    return (
      <View style={[borda, { backgroundColor: 'rgba(127,127,127,0.15)' }]}>
        <Image source={{ uri: foto }} style={{ width: tamanho, height: tamanho }} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />
      </View>
    );
  return (
    <View style={[borda, { backgroundColor: Marca.ouro, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#FFFFFF', fontSize: Math.round(tamanho * 0.38), fontWeight: '700' }} allowFontScaling={false}>
        {iniciais(nome) || '?'}
      </Text>
    </View>
  );
}

export type FotoEscolhida = { uri: string; base64: string; tipo: string };

/** Foto da galeria, recortada quadrada no próprio seletor do sistema (o servidor reduz para 320 px) */
export async function escolherFotoPerfil(): Promise<FotoEscolhida | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
  const a = r.canceled ? null : r.assets[0];
  if (!a?.base64) return null;
  return { uri: a.uri, base64: a.base64, tipo: a.mimeType ?? 'image/jpeg' };
}
