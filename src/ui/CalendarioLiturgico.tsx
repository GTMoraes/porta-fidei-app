// Mês do calendário litúrgico: cada dia com o pontinho da cor litúrgica, em negrito as solenidades e festas,
// domingos em vermelho. Usado na tela do Calendário litúrgico e no seletor de data que abre ao tocar na data
// da Liturgia das Horas e da Liturgia Diária.

import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COR_HEX, MESES, diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { Espaco, fonteTitulo, usePaleta } from '@/tema';
import { Icone, toque } from './base';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export type DiaDoMes = { iso: string; dia: ReturnType<typeof diaLiturgico> };

/** As casas do mês (null nas que sobram antes do dia 1 e depois do último), cada dia com o seu dia litúrgico */
export function diasDoMes(ano: number, mes: number): (DiaDoMes | null)[] {
  const n = new Date(ano, mes, 0).getDate();
  const primeiro = new Date(ano, mes - 1, 1).getDay();
  const cel: (string | null)[] = Array(primeiro).fill(null);
  for (let d = 1; d <= n; d++) cel.push(iso(ano, mes, d));
  while (cel.length % 7) cel.push(null);
  return cel.map((x) => (x ? { iso: x, dia: diaLiturgico(x) } : null));
}

/** Mês mostrado (ano e mês) e as setas para trocar */
export function useMes(inicial: string) {
  const [ano, setAno] = useState(Number(inicial.slice(0, 4)));
  const [mes, setMes] = useState(Number(inicial.slice(5, 7)));
  const mudarMes = (n: number) => {
    toque();
    const alvo = ano * 12 + (mes - 1) + n;
    setAno(Math.floor(alvo / 12));
    setMes((alvo % 12) + 1);
  };
  const irPara = (d: string) => {
    setAno(Number(d.slice(0, 4)));
    setMes(Number(d.slice(5, 7)));
  };
  return { ano, mes, mudarMes, irPara };
}

export function MesLiturgico({
  ano,
  mes,
  mudarMes,
  selecionado,
  aoTocar,
}: {
  ano: number;
  mes: number;
  mudarMes: (n: number) => void;
  selecionado?: string;
  aoTocar: (iso: string) => void;
}) {
  const c = usePaleta();
  const hoje = hojeIso();
  const dias = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Pressable onPress={() => mudarMes(-1)} hitSlop={10} style={{ padding: 8 }} accessibilityLabel="Mês anterior">
          <Icone nome="chevron.left" tamanho={17} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', color: c.texto, ...fonteTitulo(22), textTransform: 'capitalize' }}>
          {MESES[mes - 1]} {ano}
        </Text>
        <Pressable onPress={() => mudarMes(1)} hitSlop={10} style={{ padding: 8 }} accessibilityLabel="Próximo mês">
          <Icone nome="chevron.right" tamanho={17} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {SEMANA.map((s, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: c.textoFraco, fontSize: 12, fontWeight: '600' }}>
            {s}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {dias.map((x, i) => (
          <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 0.9, padding: 2 }}>
            {x ? (
              <Pressable
                onPress={() => aoTocar(x.iso)}
                accessibilityLabel={`${Number(x.iso.slice(8))}: ${x.dia.celebracao.nome}`}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    selecionado === x.iso || pressed ? (c.escuro ? 'rgba(222,190,130,0.25)' : 'rgba(188,140,68,0.2)') : 'transparent',
                  borderWidth: x.iso === hoje ? 1.2 : 0,
                  borderColor: c.destaque,
                })}>
                <Text
                  style={{
                    color: x.dia.diaSemana === 0 ? c.rubrica : c.texto,
                    fontSize: 16,
                    fontWeight: ['S', 'F'].includes(x.dia.celebracao.grau) ? '700' : '400',
                  }}>
                  {Number(x.iso.slice(8))}
                </Text>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    marginTop: 3,
                    backgroundColor: COR_HEX[x.dia.celebracao.cor],
                    borderWidth: x.dia.celebracao.cor === 'branco' ? 0.6 : 0,
                    borderColor: c.textoFraco,
                  }}
                />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Folha que sobe de baixo com o calendário litúrgico: tocar num dia escolhe a data (e fecha) */
export function SeletorDataLiturgica({
  visivel,
  data,
  aoEscolher,
  aoFechar,
}: {
  visivel: boolean;
  data: string;
  aoEscolher: (iso: string) => void;
  aoFechar: () => void;
}) {
  const c = usePaleta();
  const ins = useSafeAreaInsets();
  const { ano, mes, mudarMes, irPara } = useMes(data);
  // cada vez que abre, começa no mês do dia que está na tela
  useEffect(() => {
    if (visivel) irPara(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel]);
  const escolher = (d: string) => {
    toque();
    aoEscolher(d);
  };
  return (
    <Modal visible={visivel} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={aoFechar}>
      <Pressable onPress={aoFechar} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: c.folha, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Espaco.m, paddingBottom: ins.bottom + Espaco.m }}>
          <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.separador, marginTop: 8, marginBottom: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Espaco.s, paddingVertical: 6 }}>
            <Text style={{ flex: 1, color: c.textoFraco, fontSize: 14 }}>Escolha o dia</Text>
            <Pressable onPress={() => escolher(hojeIso())} hitSlop={10}>
              <Text style={{ color: c.destaque, fontSize: 16, fontWeight: '600' }}>Hoje</Text>
            </Pressable>
          </View>
          <MesLiturgico ano={ano} mes={mes} mudarMes={mudarMes} selecionado={data} aoTocar={escolher} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
