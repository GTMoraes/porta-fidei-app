import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { existe, imagemUri, usePacote } from '@/conteudo/pacote';
import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { abrirRezarNoDia, useDataRezar } from '@/estado/dataRezar';
import { NOME_COR, NOME_GRAU, NOME_TEMPO, dataPorExtenso, diaLiturgico, type GrauDia } from '@/liturgia/calendario';
import { Espaco, Marca, comAlfa, usePaleta, type Paleta } from '@/tema';
import { Chave, Fundo, Icone, Linha, Secao, toque, Vidro } from '@/ui/base';
import { MesLiturgico, diasDoMes, useMes, type DiaDoMes } from '@/ui/CalendarioLiturgico';
import { Folhinha, SEMANA_SIGLA } from '@/ui/Folhinha';

// Tocar num dia (o selecionado ou uma solenidade ou festa da lista) abre o Rezar naquele dia, com o card do
// dia, os Próprios do dia e as Horas daquela data. `data` (opcional): o dia em que o calendário abre; sem ele,
// abre no dia do Rezar. Aberto da Agenda ou do Rezar, é o mesmo: se o Rezar está noutro dia que não hoje, esse dia
// tem um anel dourado (hoje fica com o contorno de sempre).
export default function Calendario() {
  const router = useRouter();
  const c = usePaleta();
  const aj = useAjustes();
  usePacote(); // redesenha quando o conteúdo litúrgico termina de carregar (biografias dos santos)
  const { data } = useLocalSearchParams<{ data?: string }>();
  const r = useDataRezar();
  const inicial = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : r.data;
  const { ano, mes, mudarMes, irParaMes } = useMes(inicial);
  const [sel, setSel] = useState(inicial);

  const dias = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  const dSel = diaLiturgico(sel);
  // a chave do fim da lista acrescenta as memórias obrigatórias (fica guardada nos ajustes)
  const graus: GrauDia[] = aj.memoriasNoCalendario ? ['S', 'F', 'M'] : ['S', 'F'];
  const destaques = dias.filter((x) => x && graus.includes(x.dia.celebracao.grau)) as DiaDoMes[];

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ marginHorizontal: Espaco.l, marginTop: Espaco.s, marginBottom: Espaco.xl }}>
          <Vidro style={{ borderRadius: 26, padding: Espaco.m }}>
            <MesLiturgico
              ano={ano}
              mes={mes}
              mudarMes={mudarMes}
              irParaMes={irParaMes}
              selecionado={sel}
              diaRezar={r.escolhida ? r.data : undefined}
              aoTocar={(d) => {
                toque();
                setSel(d);
              }}
            />
          </Vidro>
          {r.escolhida ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Espaco.m, marginHorizontal: Espaco.s }}>
              <View style={{ width: 14, height: 14, borderRadius: 4, borderWidth: 2, borderColor: Marca.ouro }} />
              <Text style={{ flex: 1, color: c.textoSuave, fontSize: 13.5 }}>
                Dia aberto no Rezar: {dataPorExtenso(r.data)}
              </Text>
            </View>
          ) : null}
        </View>

        <Secao titulo="Dia selecionado">
          <Linha
            titulo={dSel.celebracao.nome}
            sub={`${NOME_GRAU[dSel.celebracao.grau]} · ${NOME_TEMPO[dSel.tempo]} · ${NOME_COR[dSel.celebracao.cor]}`}
            onPress={() => abrirRezarNoDia(sel)}
            ultimo={!dSel.facultativas.length}
          />
          {dSel.facultativas.map((f, i) => {
            // com a biografia no pacote, abre direto
            const santo = f.slug && existe(`santos/${f.slug}`) ? `santos/${f.slug}` : null;
            return (
              <Linha
                key={f.nome}
                titulo={f.nome}
                sub="Memória facultativa"
                onPress={santo ? () => router.push({ pathname: '/texto', params: { arquivo: santo, titulo: f.nome, imagem: imagemUri(santo) ? santo : '' } }) : undefined}
                ultimo={i === dSel.facultativas.length - 1}
              />
            );
          })}
        </Secao>

        <Secao titulo={aj.memoriasNoCalendario ? 'Solenidades, festas e memórias do mês' : 'Solenidades e festas do mês'}>
          {destaques.map((x) => (
            <LinhaFesta key={x.iso} x={x} />
          ))}
          <Linha
            titulo="Mostrar memórias obrigatórias"
            direita={<Chave valor={aj.memoriasNoCalendario} mudar={(v) => mudarAjustes({ memoriasNoCalendario: v })} />}
            ultimo
          />
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}

/** Solenidade dourada, Festa vinho (no escuro, um vinho mais claro, para ler bem no azul-noite), Memória neutra */
function corDoGrau(c: Paleta, g: GrauDia) {
  if (g === 'M') return c.textoSuave;
  return g === 'S' ? c.destaque : c.escuro ? '#E39A9C' : Marca.vinho;
}

/** Linha da lista do mês: a folhinha com o dia da semana e o dia (o mês já está no alto) e só o grau embaixo */
function LinhaFesta({ x, ultimo }: { x: DiaDoMes; ultimo?: boolean }) {
  const c = usePaleta();
  const g = x.dia.celebracao.grau;
  const cor = corDoGrau(c, g);
  const d = new Date(x.iso + 'T12:00:00');
  return (
    <View>
      <Pressable
        onPress={() => {
          toque();
          abrirRezarNoDia(x.iso);
        }}
        style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: Espaco.m, gap: Espaco.m }}>
          <Folhinha
            topo={SEMANA_SIGLA[d.getDay()]}
            dia={d.getDate()}
            corTopo={cor}
            fundo={g === 'M' ? c.preenchimento : comAlfa(g === 'S' ? Marca.ouro : Marca.vinho, c.escuro ? 0.3 : 0.14)}
            largura={44}
            altura={48}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: c.texto, fontSize: 16.5, fontWeight: '600' }}>{x.dia.celebracao.nome}</Text>
            <Text style={{ color: cor, fontSize: 13.5, fontWeight: '600' }}>{NOME_GRAU[g]}</Text>
          </View>
          <Icone nome="chevron.right" cor={c.textoFraco} tamanho={14} />
        </View>
      </Pressable>
      {!ultimo ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separador, marginLeft: Espaco.m + 44 + Espaco.m }} /> : null}
    </View>
  );
}
