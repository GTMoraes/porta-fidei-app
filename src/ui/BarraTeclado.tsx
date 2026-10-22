// Campo de texto com a barra "OK" em cima do teclado (só nos de várias linhas, onde o Enter pula linha
// em vez de fechar o teclado). Cada campo tem a sua barra: no iOS a barra se liga ao campo pelo nativeID.

import { forwardRef, useId } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { usePaleta } from '@/tema';

export const CampoTexto = forwardRef<TextInput, TextInputProps>(function CampoTexto(props, ref) {
  const c = usePaleta();
  const id = `pf-ok-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const comBarra = Platform.OS === 'ios' && !!props.multiline;
  return (
    <>
      <TextInput underlineColorAndroid="transparent" cursorColor="#BC8C44" ref={ref} {...props} inputAccessoryViewID={comBarra ? id : props.inputAccessoryViewID} />
      {comBarra ? (
        <InputAccessoryView nativeID={id}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              paddingHorizontal: 14,
              paddingVertical: 6,
              backgroundColor: c.escuro ? 'rgba(30,30,34,0.97)' : 'rgba(246,244,240,0.98)',
              borderTopWidth: 0.5,
              borderTopColor: c.separador,
            }}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10} style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 10, opacity: pressed ? 0.5 : 1 })}>
              <Text style={{ color: c.destaque, fontSize: 16, fontWeight: '600' }}>OK</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </>
  );
});
