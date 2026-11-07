// Ajustes › Sua comissão: as reuniões das comissões marcadas entram na Agenda, como as outras rotinas. Dá para
// marcar mais de uma (ex.: a de um parente ou amigo). "Todas" inclui as que forem cadastradas depois.
// A aba Comunidade (Horários e encontros) mostra sempre todas, seja qual for a escolha aqui.

import { ScrollView, Text, View } from 'react-native';

import { agruparRotinas, nomesComissoes } from '@/comunidade/rotinas';
import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { useServidor } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Fundo, Icone, Linha, Secao, toque } from '@/ui/base';

export default function SuaComissao() {
  const c = usePaleta();
  const aj = useAjustes();
  const srv = useServidor();
  const rotinas = srv.comunidade?.rotinas;
  const nomes = nomesComissoes(rotinas);
  const quando = new Map((agruparRotinas(rotinas, 'comissao')[0]?.linhas ?? []).map((l) => [l.comissao ?? '', l.quando]));
  const todas = aj.suasComissoes.includes('*');
  const marcada = (n: string) => todas || aj.suasComissoes.includes(n);
  const marca = (sim: boolean) => (sim ? <Icone nome="checkmark" tamanho={17} /> : undefined);

  const alternar = (n: string) => {
    toque();
    const atual = todas ? nomes : aj.suasComissoes.filter((x) => x !== '*');
    mudarAjustes({ suasComissoes: atual.includes(n) ? atual.filter((x) => x !== n) : [...atual, n] });
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21, marginHorizontal: Espaco.xl, marginBottom: Espaco.l }}>
          As reuniões das comissões marcadas aparecem na Agenda, junto com as missas e os outros horários fixos. Pode marcar mais de uma. Na aba
          Comunidade, em Horários e encontros, aparecem sempre todas.
        </Text>
        <Secao>
          <Linha
            titulo="Nenhuma"
            direita={marca(!todas && !aj.suasComissoes.length)}
            onPress={() => {
              toque();
              mudarAjustes({ suasComissoes: [] });
            }}
            seta={false}
          />
          <Linha
            titulo="Todas"
            sub="Inclui as que forem cadastradas depois"
            direita={marca(todas)}
            onPress={() => {
              toque();
              mudarAjustes({ suasComissoes: ['*'] });
            }}
            seta={false}
            ultimo
          />
        </Secao>
        <Secao titulo="Comissões">
          {nomes.length ? (
            nomes.map((n, i) => (
              <Linha key={n} titulo={n} sub={quando.get(n)} direita={marca(marcada(n))} onPress={() => alternar(n)} seta={false} ultimo={i === nomes.length - 1} />
            ))
          ) : (
            <Aviso icone="person.2" texto="As comissões aparecem aqui quando a Comunidade cadastrar os horários das reuniões." />
          )}
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
