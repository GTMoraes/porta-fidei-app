// Folhinha: quadradinho de calendário com uma linha pequena em cima (o mês ou o dia da semana) e o dia
// embaixo. Usada nos eventos da Hoje, no Calendário litúrgico e no seletor de data do Rezar.

import { Text, View } from 'react-native';

import { usePaleta } from '@/tema';

export const MES_SIGLA = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
export const SEMANA_SIGLA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function Folhinha({
  topo,
  dia,
  corTopo,
  corDia,
  fundo,
  apagada,
  largura = 46,
  altura = 50,
}: {
  topo: string;
  dia: number | string;
  corTopo?: string; // padrão: o vermelho litúrgico do tema
  corDia?: string;
  fundo?: string;
  apagada?: boolean;
  largura?: number;
  altura?: number;
}) {
  const c = usePaleta();
  return (
    <View
      style={{
        width: largura,
        height: altura,
        borderRadius: 11,
        backgroundColor: fundo ?? c.preenchimento,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: apagada ? 0.6 : 1,
      }}>
      <Text style={{ color: corTopo ?? c.rubrica, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{topo}</Text>
      <Text style={{ color: corDia ?? c.texto, fontSize: 21, fontWeight: '700', lineHeight: 25, fontVariant: ['tabular-nums'] }}>{dia}</Text>
    </View>
  );
}
