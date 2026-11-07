// Lista das jornadas de oração: as de hoje, as próximas e as sem data. `data` (vindo do Rezar com outro dia
// escolhido na folhinha): a lista é a daquele dia.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { diaAtual, diasFeitos, periodo, temTexto, useFeitos } from '@/comunidade/jornadas';
import { hojeIso } from '@/liturgia/calendario';
import { useServidor, type Jornada } from '@/servidor/api';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';
import { dataCurta } from '@/util/datas';

const dt = (iso: string) => dataCurta(new Date(iso + 'T12:00:00'));
const ICONE: Record<Jornada['tipo'], any> = { novena: 'figure.hiking', quaresma: 'shield', cerco: 'figure.walk.circle', outra: 'figure.hiking' };

export default function Jornadas() {
  const srv = useServidor();
  const router = useRouter();
  const feitos = useFeitos();
  const { data } = useLocalSearchParams<{ data?: string }>();
  const ehHoje = !data || data === hojeIso();
  const hoje = ehHoje ? hojeIso() : data; // o dia de referência da lista
  const todas = srv.comunidade?.jornadas ?? [];
  const agora = todas.filter((j) => diaAtual(j, hoje) != null);
  const proximas = todas
    .filter((j) => !agora.includes(j) && periodo(j, hoje))
    .sort((a, b) => periodo(a, hoje)!.inicio.localeCompare(periodo(b, hoje)!.inicio));
  const semData = todas.filter((j) => !periodo(j, hoje));

  const linha = (j: Jornada, i: number, lista: Jornada[]) => {
    const p = periodo(j, hoje);
    const n = diaAtual(j, hoje);
    let sub = p ? `${dt(p.inicio)} a ${dt(p.fim)}` : `${j.dias} dias · data a definir`;
    if (n && p) sub = `Dia ${n} de ${j.dias} · ${diasFeitos(feitos, j, p).length} rezados`;
    if (!temTexto(j)) sub += ' · textos em breve';
    return (
      <Linha
        key={j.id}
        titulo={j.titulo}
        sub={sub}
        icone={ICONE[j.tipo] ?? 'figure.hiking'}
        onPress={() => router.push({ pathname: '/jornada', params: ehHoje ? { id: j.id } : { id: j.id, data: hoje } })}
        ultimo={i === lista.length - 1}
      />
    );
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {agora.length ? <Secao titulo={ehHoje ? 'Acontecendo agora' : `Em ${dt(hoje)}`}>{agora.map(linha)}</Secao> : null}
        <Secao titulo="Próximas">{proximas.length ? proximas.map(linha) : <Aviso texto="Nenhuma jornada agendada." />}</Secao>
        {semData.length ? <Secao titulo="Sem data marcada">{semData.map(linha)}</Secao> : null}
        <Secao>
          <Aviso icone="bell" texto="Durante cada jornada, a Comunidade envia um lembrete por dia. A marcação “Rezei hoje” fica só no seu aparelho." />
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
