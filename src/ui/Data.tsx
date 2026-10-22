import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';

import { Espaco, Marca, usePaleta } from '@/tema';
import { isoLocal } from '@/util/datas';

const dois = (n: number) => String(n).padStart(2, '0');
const textoData = (d: Date) => `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
const textoHora = (d: Date) => `${dois(d.getHours())}:${dois(d.getMinutes())}`;

/**
 * Seletor de data e/ou hora. iOS: o seletor compacto do sistema. Android: o seletor do sistema só
 * existe como janela, então aparece um botão com o valor que abre a janela da data e, no modo
 * "datetime", em seguida a da hora.
 */
export function SeletorData({
  valor,
  mudar,
  modo,
  minimo,
}: {
  valor: Date;
  mudar: (d: Date) => void;
  modo: 'date' | 'time' | 'datetime';
  minimo?: Date;
}) {
  const c = usePaleta();
  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={valor}
        minimumDate={minimo}
        mode={modo}
        display="compact"
        locale="pt-BR"
        accentColor={Marca.ouro}
        themeVariant={c.escuro ? 'dark' : 'light'}
        onValueChange={(_e, d) => d && mudar(d)}
      />
    );
  }
  const botoes = {
    positiveButton: { label: 'OK', textColor: c.destaque },
    negativeButton: { label: 'Cancelar', textColor: c.textoSuave },
  };
  const abrirHora = (base: Date) =>
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      is24Hour: true,
      ...botoes,
      onValueChange: (_e, d) => d && mudar(d),
    });
  const abrir = () => {
    if (modo === 'time') return abrirHora(valor);
    DateTimePickerAndroid.open({
      value: valor,
      mode: 'date',
      minimumDate: minimo,
      ...botoes,
      onValueChange: (_e, d) => {
        if (!d) return;
        // a janela da data devolve a hora antiga: mantém a hora escolhida antes
        const nova = new Date(d);
        nova.setHours(valor.getHours(), valor.getMinutes(), 0, 0);
        if (modo === 'datetime') setTimeout(() => abrirHora(nova), 250);
        else mudar(nova);
      },
    });
  };
  const partes = modo === 'date' ? [textoData(valor)] : modo === 'time' ? [textoHora(valor)] : [textoData(valor), textoHora(valor)];
  return (
    <Pressable onPress={abrir} hitSlop={6} style={({ pressed }) => ({ flexDirection: 'row', gap: 6, opacity: pressed ? 0.6 : 1 })}>
      {partes.map((p) => (
        <View key={p} style={{ backgroundColor: c.separador, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
          <Text style={{ color: c.texto, fontSize: 16, fontVariant: ['tabular-nums'] }}>{p}</Text>
        </View>
      ))}
    </Pressable>
  );
}

/** Linha com rótulo e seletor compacto de data (AAAA-MM-DD) ou hora (HH:MM) */
export function CampoData({ rotulo, valor, mudar, modo = 'date' }: { rotulo: string; valor: string; mudar: (v: string) => void; modo?: 'date' | 'time' }) {
  const c = usePaleta();
  const d = modo === 'date' ? new Date(valor + 'T12:00:00') : new Date(`2000-01-01T${valor}:00`);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Espaco.l, paddingVertical: 8 }}>
      <Text style={{ color: c.texto, fontSize: 17 }}>{rotulo}</Text>
      <SeletorData
        valor={isNaN(d.getTime()) ? new Date() : d}
        modo={modo}
        mudar={(n) => mudar(modo === 'date' ? isoLocal(n) : textoHora(n))}
      />
    </View>
  );
}
