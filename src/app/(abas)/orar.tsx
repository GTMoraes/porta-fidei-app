import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { semana } from '@/comunidade/html';
import { jornadasDeHoje } from '@/comunidade/jornadas';
import { listar, usePacote } from '@/conteudo/pacote';
import { useAjustes } from '@/estado/ajustes';
import { hojeIso } from '@/liturgia/calendario';
import { HORAS } from '@/liturgia/horas';
import { useServidor } from '@/servidor/api';
import { Marca } from '@/tema';
import { Fundo, Linha, Secao, TituloTela } from '@/ui/base';

const ICONE_HORA: Record<string, any> = {
  invitatorio: 'bell',
  leituras: 'book.pages',
  laudes: 'sunrise',
  terca: 'sun.min',
  sexta: 'sun.max',
  nona: 'sun.haze',
  vesperas: 'sunset',
  completas: 'moon.stars',
};

export default function Orar() {
  const router = useRouter();
  const aj = useAjustes();
  const srv = useServidor();
  usePacote();
  const com = srv.comunidade;
  const proposta = com?.propostas.find((p) => p.id === com.atual);
  const deHoje = jornadasDeHoje(com?.jornadas, hojeIso());
  const hoje = hojeIso();

  const evangelhoAoAcaso = () => {
    const todos = listar('evangelho/');
    if (!todos.length) return;
    const a = todos[Math.floor(Math.random() * todos.length)];
    router.push({ pathname: '/texto', params: { arquivo: a, titulo: 'Evangelho ao acaso' } });
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Rezar" sobre="Liturgia das Horas e orações" />
        <Secao titulo="Liturgia das Horas">
          {HORAS.map((h, i) => (
            <Linha
              key={h.id}
              titulo={h.nome}
              sub={h.quando}
              icone={ICONE_HORA[h.id]}
              corIcone={h.id === 'laudes' || h.id === 'vesperas' ? Marca.vinho : undefined}
              onPress={() => router.push({ pathname: '/hora', params: { h: h.id, data: hoje } })}
              ultimo={i === HORAS.length - 1}
            />
          ))}
        </Secao>

        <Secao titulo="Comunidade">
          <Linha
            titulo="Proposta de oração"
            sub={proposta ? `${proposta.titulo}${proposta.inicio ? ` · ${semana(proposta)}` : ''}` : 'Material de oração pessoal da semana'}
            icone="doc.richtext"
            corIcone={Marca.vinho}
            onPress={() => router.push('/proposta')}
          />
          <Linha
            titulo="Jornadas de oração"
            sub={deHoje.length ? `Agora: ${deHoje.map((j) => j.titulo).join(', ')}` : 'Novenas dos baluartes, Quaresma de São Miguel, Cerco de Jericó'}
            icone="sparkles"
            onPress={() => router.push('/jornadas')}
            ultimo={!com?.oracoes.length}
          />
          {(com?.oracoes ?? []).map((o, i, l) => (
            <Linha
              key={o.id}
              titulo={o.titulo}
              sub={o.subtitulo ?? undefined}
              icone="hands.sparkles"
              onPress={() => router.push({ pathname: '/oracao', params: { id: o.id } })}
              ultimo={i === l.length - 1}
            />
          ))}
        </Secao>

        <Secao titulo="Missa">
          <Linha titulo="Liturgia Diária" sub="Leituras do dia" icone="book" onPress={() => router.push('/liturgia')} />
          {aj.evangelhoAoAcaso ? <Linha titulo="Evangelho ao acaso" sub="Para a lectio divina" icone="shuffle" onPress={evangelhoAoAcaso} /> : null}
          <Linha titulo="Missal" sub="Ordinário, orações eucarísticas, prefácios e próprio" icone="text.book.closed" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'missal' } })} ultimo />
        </Secao>

        <Secao titulo="Orações e rituais">
          <Linha titulo="Orações" sub="Ângelus, terço da misericórdia, ladainhas e outras" icone="hands.sparkles" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'oracoes' } })} />
          <Linha titulo="Santo Rosário" sub="Mistérios gozosos, luminosos, dolorosos e gloriosos" icone="circle.dotted" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'rosario' } })} />
          <Linha titulo="Rituais e bênçãos" sub="Batismo, matrimônio, exéquias, bênçãos" icone="drop" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'rituais' } })} ultimo />
        </Secao>

        <Secao titulo="Consulta">
          <Linha titulo="Índice de salmos e cânticos" icone="music.note.list" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'salmos' } })} />
          <Linha titulo="Comuns e ofícios votivos" icone="square.stack" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'comuns' } })} />
          <Linha titulo="Calendário litúrgico" icone="calendar" onPress={() => router.push('/calendario')} />
          <Linha titulo="Instrução Geral da Liturgia das Horas" icone="doc.text" onPress={() => router.push({ pathname: '/texto', params: { arquivo: 'IGLH', titulo: 'Instrução Geral' } })} ultimo />
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
