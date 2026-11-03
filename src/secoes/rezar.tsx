// Seções da aba Rezar. Na aba, cada seção é uma linha (título e descrição); o toque abre a página
// da seção (rota /secao) com a lista dela. Favoritos e recentes continuam soltos no alto da aba.

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

import { semana } from '@/comunidade/html';
import { jornadasDeHoje } from '@/comunidade/jornadas';
import { listar, usePacote } from '@/conteudo/pacote';
import { useAjustes } from '@/estado/ajustes';
import { hojeIso } from '@/liturgia/calendario';
import { HORAS } from '@/liturgia/horas';
import { useServidor } from '@/servidor/api';
import { Marca, Quadrado } from '@/tema';
import { Linha, Secao } from '@/ui/base';
import { dataParaHora } from '@/util/datas';

import type { InfoSecao } from './tipos';

export const SECOES_REZAR: InfoSecao[] = [
  { id: 'horas', titulo: 'Liturgia das Horas', sub: 'Do Invitatório às Completas', icone: 'clock', cor: Quadrado.vinho },
  { id: 'missa', titulo: 'Missa', sub: 'Liturgia Diária e Missal', icone: 'text.book.closed', cor: Quadrado.ouro },
  { id: 'oracoes', titulo: 'Orações e rituais', sub: 'Orações, Rosário, Confissão e mais', icone: 'hands.sparkles', cor: Quadrado.azul },
  { id: 'comunidade', titulo: 'Comunidade', sub: 'Proposta de oração, jornadas e mais', icone: 'person.3', cor: Quadrado.verde },
  { id: 'consulta', titulo: 'Consulta', sub: 'Índices, comuns e calendário', icone: 'books.vertical', cor: Quadrado.cinza },
];

const ICONE_HORA: Record<string, SFSymbol> = {
  invitatorio: 'bell',
  leituras: 'book.pages',
  laudes: 'sunrise',
  terca: 'sun.min',
  sexta: 'sun.max',
  nona: 'sun.haze',
  vesperas: 'sunset',
  completas: 'moon.stars',
};

function Horas() {
  const router = useRouter();
  return (
    <Secao>
      {HORAS.map((h, i) => (
        <Linha
          key={h.id}
          titulo={h.nome}
          sub={h.quando}
          icone={ICONE_HORA[h.id]}
          corIcone={h.id === 'laudes' || h.id === 'vesperas' ? Marca.vinho : undefined}
          onPress={() => router.push({ pathname: '/hora', params: { h: h.id, data: dataParaHora(h.id) } })}
          ultimo={i === HORAS.length - 1}
        />
      ))}
    </Secao>
  );
}

function Missa() {
  const router = useRouter();
  const aj = useAjustes();
  usePacote();
  const evangelhoAoAcaso = () => {
    const todos = listar('evangelho/');
    if (!todos.length) return;
    const a = todos[Math.floor(Math.random() * todos.length)];
    router.push({ pathname: '/texto', params: { arquivo: a, titulo: 'Evangelho ao acaso' } });
  };
  return (
    <Secao>
      <Linha titulo="Liturgia Diária" sub="Leituras do dia" icone="book" onPress={() => router.push('/liturgia')} />
      {aj.evangelhoAoAcaso ? <Linha titulo="Evangelho ao acaso" sub="Para a lectio divina" icone="shuffle" onPress={evangelhoAoAcaso} /> : null}
      <Linha
        titulo="Missal"
        sub="Ordinário, orações eucarísticas, prefácios e próprio"
        icone="text.book.closed"
        onPress={() => router.push({ pathname: '/lista', params: { tipo: 'missal' } })}
        ultimo
      />
    </Secao>
  );
}

function OracoesERituais() {
  const router = useRouter();
  const abrir = (tipo: string) => router.push({ pathname: '/lista', params: { tipo } });
  return (
    <Secao>
      <Linha titulo="Orações" sub="Ângelus, terço da misericórdia, ladainhas e outras" icone="hands.sparkles" onPress={() => abrir('oracoes')} />
      <Linha titulo="Santo Rosário" sub="Mistérios gozosos, luminosos, dolorosos e gloriosos" icone="circle.dotted" onPress={() => abrir('rosario')} />
      <Linha titulo="Confissão" sub="Exame de consciência, ato de contrição e o rito" icone="heart.text.square" onPress={() => abrir('confissao')} />
      <Linha titulo="Rituais e bênçãos" sub="Batismo, matrimônio, exéquias, bênçãos" icone="drop" onPress={() => abrir('rituais')} ultimo />
    </Secao>
  );
}

function DaComunidade() {
  const router = useRouter();
  const srv = useServidor();
  const com = srv.comunidade;
  const proposta = com?.propostas.find((p) => p.id === com.atual);
  const deHoje = jornadasDeHoje(com?.jornadas, hojeIso());
  return (
    <Secao>
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
  );
}

function Consulta() {
  const router = useRouter();
  return (
    <Secao>
      <Linha titulo="Índice de A a Z" sub="Tudo o que o app tem, em ordem alfabética" icone="textformat.abc" onPress={() => router.push('/indice')} />
      <Linha titulo="Índice de salmos e cânticos" icone="music.note.list" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'salmos' } })} />
      <Linha titulo="Comuns e ofícios votivos" icone="square.stack" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'comuns' } })} />
      <Linha titulo="Calendário litúrgico" icone="calendar" onPress={() => router.push('/calendario')} />
      <Linha
        titulo="Instrução Geral da Liturgia das Horas"
        icone="doc.text"
        onPress={() => router.push({ pathname: '/texto', params: { arquivo: 'IGLH', titulo: 'Instrução Geral' } })}
        ultimo
      />
    </Secao>
  );
}

/** Lista de uma seção do Rezar (página aberta pela linha da aba) */
export function ConteudoRezar({ id }: { id: string }) {
  switch (id) {
    case 'horas':
      return <Horas />;
    case 'missa':
      return <Missa />;
    case 'oracoes':
      return <OracoesERituais />;
    case 'comunidade':
      return <DaComunidade />;
    case 'consulta':
      return <Consulta />;
    default:
      return null;
  }
}
