import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { COR_HEX, MESES, NOME_GRAU, NOME_TEMPO, diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Fundo, Icone, Linha, Secao, toque, Vidro } from '@/ui/base';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export default function Calendario() {
  const c = usePaleta();
  const router = useRouter();
  const hoje = hojeIso();
  const [ano, setAno] = useState(Number(hoje.slice(0, 4)));
  const [mes, setMes] = useState(Number(hoje.slice(5, 7)));
  const [sel, setSel] = useState(hoje);

  const dias = useMemo(() => {
    const n = new Date(ano, mes, 0).getDate();
    const primeiro = new Date(ano, mes - 1, 1).getDay();
    const cel: (string | null)[] = Array(primeiro).fill(null);
    for (let d = 1; d <= n; d++) cel.push(iso(ano, mes, d));
    while (cel.length % 7) cel.push(null);
    return cel.map((x) => (x ? { iso: x, dia: diaLiturgico(x) } : null));
  }, [ano, mes]);

  const mudarMes = (n: number) => {
    toque();
    let m = mes + n;
    let a = ano;
    if (m < 1) {
      m = 12;
      a--;
    }
    if (m > 12) {
      m = 1;
      a++;
    }
    setMes(m);
    setAno(a);
  };

  const dSel = diaLiturgico(sel);
  const destaques = dias.filter((x) => x && ['S', 'F'].includes(x.dia.celebracao.grau)) as { iso: string; dia: ReturnType<typeof diaLiturgico> }[];

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ marginHorizontal: Espaco.l, marginTop: Espaco.s, marginBottom: Espaco.xl }}>
          <Vidro style={{ borderRadius: 26, padding: Espaco.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Pressable onPress={() => mudarMes(-1)} hitSlop={10} style={{ padding: 8 }}>
                <Icone nome="chevron.left" tamanho={17} />
              </Pressable>
              <Text style={{ flex: 1, textAlign: 'center', color: c.texto, fontFamily: Fontes.titulo, fontSize: 22, textTransform: 'capitalize' }}>
                {MESES[mes - 1]} {ano}
              </Text>
              <Pressable onPress={() => mudarMes(1)} hitSlop={10} style={{ padding: 8 }}>
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
                      onPress={() => {
                        toque();
                        setSel(x.iso);
                      }}
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: sel === x.iso ? (c.escuro ? 'rgba(222,190,130,0.25)' : 'rgba(188,140,68,0.2)') : 'transparent',
                        borderWidth: x.iso === hoje ? 1.2 : 0,
                        borderColor: c.destaque,
                      }}>
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
          </Vidro>
        </View>

        <Secao titulo="Dia selecionado">
          <Linha
            titulo={dSel.celebracao.nome}
            sub={`${NOME_GRAU[dSel.celebracao.grau]} · ${NOME_TEMPO[dSel.tempo]} · cor ${dSel.celebracao.cor}`}
            onPress={() => router.push({ pathname: '/dia', params: { data: sel } })}
            ultimo={!dSel.facultativas.length}
          />
          {dSel.facultativas.map((f, i) => (
            <Linha key={f.nome} titulo={f.nome} sub="Memória facultativa" ultimo={i === dSel.facultativas.length - 1} />
          ))}
        </Secao>

        {destaques.length ? (
          <Secao titulo="Solenidades e festas do mês">
            {destaques.map((x, i) => (
              <Linha
                key={x.iso}
                titulo={x.dia.celebracao.nome}
                sub={`${Number(x.iso.slice(8))} de ${MESES[mes - 1]} · ${NOME_GRAU[x.dia.celebracao.grau]}`}
                onPress={() => router.push({ pathname: '/dia', params: { data: x.iso } })}
                ultimo={i === destaques.length - 1}
              />
            ))}
          </Secao>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
