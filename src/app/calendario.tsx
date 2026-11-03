import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { existe, imagemUri, usePacote } from '@/conteudo/pacote';
import { MESES, NOME_GRAU, NOME_TEMPO, diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { Espaco } from '@/tema';
import { Fundo, Linha, Secao, toque, Vidro } from '@/ui/base';
import { MesLiturgico, diasDoMes, useMes, type DiaDoMes } from '@/ui/CalendarioLiturgico';

export default function Calendario() {
  const router = useRouter();
  usePacote(); // redesenha quando o conteúdo litúrgico termina de carregar (biografias dos santos)
  const hoje = hojeIso();
  const { ano, mes, mudarMes } = useMes(hoje);
  const [sel, setSel] = useState(hoje);

  const dias = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  const dSel = diaLiturgico(sel);
  const destaques = dias.filter((x) => x && ['S', 'F'].includes(x.dia.celebracao.grau)) as DiaDoMes[];

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ marginHorizontal: Espaco.l, marginTop: Espaco.s, marginBottom: Espaco.xl }}>
          <Vidro style={{ borderRadius: 26, padding: Espaco.m }}>
            <MesLiturgico
              ano={ano}
              mes={mes}
              mudarMes={mudarMes}
              selecionado={sel}
              aoTocar={(d) => {
                toque();
                setSel(d);
              }}
            />
          </Vidro>
        </View>

        <Secao titulo="Dia selecionado">
          <Linha
            titulo={dSel.celebracao.nome}
            sub={`${NOME_GRAU[dSel.celebracao.grau]} · ${NOME_TEMPO[dSel.tempo]} · cor ${dSel.celebracao.cor}`}
            onPress={() => router.push({ pathname: '/dia', params: { data: sel } })}
            ultimo={!dSel.facultativas.length}
          />
          {dSel.facultativas.map((f, i) => {
            // com a biografia no pacote, abre direto (como na tela do dia)
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
