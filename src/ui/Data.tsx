import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, View } from 'react-native';

import { Espaco, Marca, usePaleta } from '@/tema';
import { isoLocal } from '@/util/datas';

/** Linha com rótulo e seletor compacto de data (AAAA-MM-DD) ou hora (HH:MM) */
export function CampoData({ rotulo, valor, mudar, modo = 'date' }: { rotulo: string; valor: string; mudar: (v: string) => void; modo?: 'date' | 'time' }) {
  const c = usePaleta();
  const d = modo === 'date' ? new Date(valor + 'T12:00:00') : new Date(`2000-01-01T${valor}:00`);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Espaco.l, paddingVertical: 8 }}>
      <Text style={{ color: c.texto, fontSize: 17 }}>{rotulo}</Text>
      <DateTimePicker
        value={isNaN(d.getTime()) ? new Date() : d}
        mode={modo}
        display="compact"
        locale="pt-BR"
        accentColor={Marca.ouro}
        themeVariant={c.escuro ? 'dark' : 'light'}
        onChange={(_e, n) => {
          if (!n) return;
          mudar(modo === 'date' ? isoLocal(n) : `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
        }}
      />
    </View>
  );
}
