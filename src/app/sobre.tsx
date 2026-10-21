import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as Updates from 'expo-updates';
import { ScrollView, Text, View } from 'react-native';

import { usePacote } from '@/conteudo/pacote';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Fundo, Linha, Secao } from '@/ui/base';

function atualizacao() {
  if (!Updates.isEnabled || Updates.isEmbeddedLaunch || !Updates.createdAt) return 'Sem atualização pelo ar (a versão que veio na instalação)';
  const d = Updates.createdAt;
  const p = (n: number) => String(n).padStart(2, '0');
  return `Atualização de ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}${Updates.updateId ? ` · ${Updates.updateId.slice(0, 8)}` : ''}`;
}

export default function Sobre() {
  const c = usePaleta();
  const pacote = usePacote();
  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ alignItems: 'center', paddingVertical: Espaco.xl }}>
          <Image source={require('@/assets/marca/logo-cor.png')} style={{ width: 120, height: 132 }} contentFit="contain" tintColor={c.escuro ? '#FFFFFF' : undefined} />
          <Text style={{ color: c.textoFraco, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14 }}>Comunidade Católica</Text>
          <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 30 }}>Porta Fidei</Text>
          <Text style={{ color: c.textoFraco, marginTop: 6 }}>Versão {Constants.expoConfig?.version ?? ''}</Text>
          {/* a atualização pelo ar em uso: é a data que ajuda a saber se o aparelho já tem as correções mais novas */}
          <Text style={{ color: c.textoFraco, fontSize: 13, marginTop: 2 }}>{atualizacao()}</Text>
        </View>
        <Secao titulo="Conteúdo">
          <Linha titulo="Calendário litúrgico" sub="Calculado pelo próprio app, segundo as normas da Igreja no Brasil" />
          <Linha
            titulo="Textos litúrgicos"
            sub={
              pacote.manifest?.tipo === 'provisorio'
                ? 'Pacote provisório, só para demonstração neste aparelho. Os textos litúrgicos em português são a tradução oficial da CNBB.'
                : 'Tradução oficial da CNBB.'
            }
          />
          <Linha titulo="Liturgia Diária" sub="Lida do site oficial da Edições CNBB" ultimo />
        </Secao>
      </ScrollView>
    </Fundo>
  );
}
