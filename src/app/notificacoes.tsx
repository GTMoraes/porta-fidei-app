import { Alert, ScrollView, View } from 'react-native';

import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { pedirPermissao, reagendarLembretes } from '@/estado/lembretes';
import { HORAS, type Hora } from '@/liturgia/horas';
import { Aviso, Chave, Fundo, Linha, Secao } from '@/ui/base';
import { SeletorData } from '@/ui/Data';
import { AJUSTES_DO_APARELHO } from '@/util/plataforma';

export default function Notificacoes() {
  const aj = useAjustes();

  const mudar = async (h: Hora, parcial: Partial<(typeof aj.lembretes)[Hora]>) => {
    if (parcial.ativo) {
      const ok = await pedirPermissao();
      if (!ok) {
        Alert.alert('Notificações desligadas', `Permita as notificações do app ${AJUSTES_DO_APARELHO} para receber os lembretes.`);
        return;
      }
    }
    mudarAjustes({ lembretes: { ...aj.lembretes, [h]: { ...aj.lembretes[h], ...parcial } } });
    await reagendarLembretes();
  };

  return (
    <Fundo>
      <ScrollView keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <Secao>
          <Aviso texto="Lembretes diários para cada hora canônica. Ficam agendados no próprio aparelho e funcionam sem internet." />
        </Secao>
        <Secao titulo="Horas canônicas">
          {HORAS.map((h, i) => {
            const l = aj.lembretes[h.id];
            const d = new Date();
            d.setHours(l.hora, l.minuto, 0, 0);
            return (
              <View key={h.id}>
                <Linha
                  titulo={h.nome}
                  sub={h.quando}
                  direita={<Chave valor={l.ativo} mudar={(v) => mudar(h.id, { ativo: v })} />}
                  ultimo={!l.ativo && i === HORAS.length - 1}
                />
                {l.ativo ? (
                  <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 }}>
                    <SeletorData valor={d} modo="time" mudar={(nova) => mudar(h.id, { hora: nova.getHours(), minuto: nova.getMinutes() })} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Secao>
      </ScrollView>
    </Fundo>
  );
}
