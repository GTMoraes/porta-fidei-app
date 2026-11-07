// Mês do calendário litúrgico: cada dia com o pontinho da cor litúrgica, em negrito as solenidades e festas,
// domingos em vermelho. Usado na tela do Calendário litúrgico e no seletor de data que abre ao tocar na data
// da Liturgia das Horas e da Liturgia Diária.

import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COR_HEX, MESES, diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { Espaco, Marca, fonteTitulo, usePaleta } from '@/tema';
import { Icone, toque } from './base';
import { DeslizarMes } from './Deslizar';

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

/** Mês mostrado (ano e mês): setas, arrasto e o salto direto para um mês e ano */
export function useMes(inicial: string) {
  const [ano, setAno] = useState(Number(inicial.slice(0, 4)));
  const [mes, setMes] = useState(Number(inicial.slice(5, 7)));
  const mudarMes = (n: number) => {
    toque();
    const alvo = ano * 12 + (mes - 1) + n;
    setAno(Math.floor(alvo / 12));
    setMes((alvo % 12) + 1);
  };
  const irParaMes = (a: number, m: number) => {
    setAno(a);
    setMes(m);
  };
  const irPara = (d: string) => irParaMes(Number(d.slice(0, 4)), Number(d.slice(5, 7)));
  return { ano, mes, mudarMes, irPara, irParaMes };
}

const MES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Um mês do calendário litúrgico. Arrastar a grade para o lado troca o mês. Com `irParaMes`, tocar em
 * "Novembro 2026" mostra os 12 meses (as setas passam a trocar o ano) para saltar direto para outro mês.
 */
export function MesLiturgico({
  ano,
  mes,
  mudarMes,
  irParaMes,
  selecionado,
  diaRezar,
  aoTocar,
}: {
  ano: number;
  mes: number;
  mudarMes: (n: number) => void;
  irParaMes?: (ano: number, mes: number) => void;
  selecionado?: string;
  /** o dia aberto no Rezar, quando não é hoje: anel dourado */
  diaRezar?: string;
  aoTocar: (iso: string) => void;
}) {
  const c = usePaleta();
  const hoje = hojeIso();
  const dias = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  const [escolhendoMes, setEscolhendoMes] = useState(false);
  const [anoGrade, setAnoGrade] = useState(ano);
  const setas = (n: number) => {
    if (escolhendoMes) {
      toque();
      setAnoGrade((a) => a + n);
    } else mudarMes(n);
  };
  const realcado = c.escuro ? 'rgba(222,190,130,0.25)' : 'rgba(188,140,68,0.2)';
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Pressable onPress={() => setas(-1)} hitSlop={10} style={{ padding: 8 }} accessibilityLabel={escolhendoMes ? 'Ano anterior' : 'Mês anterior'}>
          <Icone nome="chevron.left" tamanho={17} />
        </Pressable>
        <Pressable
          disabled={!irParaMes}
          onPress={() => {
            toque();
            setAnoGrade(ano);
            setEscolhendoMes((v) => !v);
          }}
          accessibilityRole={irParaMes ? 'button' : undefined}
          accessibilityHint={irParaMes ? 'Mostra os meses para escolher outro mês e ano' : undefined}
          style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: c.texto, ...fonteTitulo(22), textTransform: 'capitalize' }}>{escolhendoMes ? anoGrade : `${MESES[mes - 1]} ${ano}`}</Text>
          {irParaMes ? <Icone nome={escolhendoMes ? 'chevron.up' : 'chevron.down'} cor={c.textoFraco} tamanho={12} /> : null}
        </Pressable>
        <Pressable onPress={() => setas(1)} hitSlop={10} style={{ padding: 8 }} accessibilityLabel={escolhendoMes ? 'Próximo ano' : 'Próximo mês'}>
          <Icone nome="chevron.right" tamanho={17} />
        </Pressable>
      </View>
      {escolhendoMes && irParaMes ? (
        // os 12 meses do ano escolhido nas setas: tocar num deles volta para os dias daquele mês
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }}>
          {MES_CURTO.map((nome, i) => {
            const m = i + 1;
            const mostrado = anoGrade === ano && m === mes;
            const atual = anoGrade === Number(hoje.slice(0, 4)) && m === Number(hoje.slice(5, 7));
            return (
              <View key={nome} style={{ width: '33.333%', padding: 4 }}>
                <Pressable
                  onPress={() => {
                    toque();
                    irParaMes(anoGrade, m);
                    setEscolhendoMes(false);
                  }}
                  style={({ pressed }) => ({
                    height: 52,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: mostrado || pressed ? realcado : c.preenchimento,
                    borderWidth: atual ? 1.2 : 0,
                    borderColor: c.destaque,
                  })}>
                  <Text style={{ color: c.texto, fontSize: 16, fontWeight: mostrado ? '700' : '500' }}>{nome}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row' }}>
            {SEMANA.map((s, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', color: c.textoFraco, fontSize: 12, fontWeight: '600' }}>
                {s}
              </Text>
            ))}
          </View>
          {/* arrastar para o lado troca o mês */}
          <DeslizarMes chave={ano * 12 + mes} mudar={(n) => mudarMes(n)}>
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
                        backgroundColor: selecionado === x.iso || pressed ? realcado : 'transparent',
                        borderWidth: x.iso === diaRezar ? 2 : x.iso === hoje ? 1.2 : 0,
                        borderColor: x.iso === diaRezar ? Marca.ouro : c.destaque,
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
          </DeslizarMes>
        </>
      )}
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
  const { ano, mes, mudarMes, irPara, irParaMes } = useMes(data);
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
      {/* o Modal é outra raiz: sem isto, o arrasto do mês não funciona no Android */}
      <GestureHandlerRootView style={{ flex: 1 }}>
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
          <MesLiturgico ano={ano} mes={mes} mudarMes={mudarMes} irParaMes={irParaMes} selecionado={data} aoTocar={escolher} />
        </Pressable>
      </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}
