import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { semana } from '@/comunidade/html';
import { jornadasDeHoje } from '@/comunidade/jornadas';
import { listar, usePacote } from '@/conteudo/pacote';
import { useAjustes } from '@/estado/ajustes';
import { useSalvos, type ItemSalvo } from '@/estado/favoritos';
import { hojeIso } from '@/liturgia/calendario';
import { dataParaHora } from '@/util/datas';
import { HORAS } from '@/liturgia/horas';
import { useServidor } from '@/servidor/api';
import { Espaco, Marca, usePaleta } from '@/tema';
import { Fundo, Icone, Linha, Secao, TituloTela, toque, Vidro } from '@/ui/base';
import { useSubirAoTopo } from '@/ui/subirAoTopo';

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
  const lista = useSubirAoTopo();
  const router = useRouter();
  const aj = useAjustes();
  const srv = useServidor();
  const c = usePaleta();
  usePacote();
  const com = srv.comunidade;
  const proposta = com?.propostas.find((p) => p.id === com.atual);
  const deHoje = jornadasDeHoje(com?.jornadas, hojeIso());
  const hoje = hojeIso();
  const salvos = useSalvos();
  const abrirSalvo = (i: ItemSalvo) => router.push({ pathname: '/texto', params: { arquivo: i.arquivo, titulo: i.titulo, desde: i.desde ?? '', ate: i.ate ?? '' } });
  const recentes = salvos.recentes.filter((r) => !salvos.favoritos.some((f) => f.arquivo === r.arquivo && (f.desde ?? '') === (r.desde ?? ''))).slice(0, 4);

  const evangelhoAoAcaso = () => {
    const todos = listar('evangelho/');
    if (!todos.length) return;
    const a = todos[Math.floor(Math.random() * todos.length)];
    router.push({ pathname: '/texto', params: { arquivo: a, titulo: 'Evangelho ao acaso' } });
  };

  return (
    <Fundo aba>
      <ScrollView
        ref={lista}
        scrollToOverflowEnabled contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Rezar" sobre="Liturgia das Horas e orações" />
        <Pressable
          onPress={() => {
            toque();
            router.push('/buscar');
          }}
          style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
          <Vidro interativo style={{ borderRadius: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 }}>
              <Icone nome="magnifyingglass" cor={c.textoFraco} tamanho={17} />
              <Text style={{ color: c.textoFraco, fontSize: 16 }}>Buscar oração, salmo, santo, palavra…</Text>
            </View>
          </Vidro>
        </Pressable>
        {salvos.favoritos.length ? (
          <Secao titulo="Meus favoritos">
            {salvos.favoritos.map((f, i) => (
              <Linha key={f.arquivo + (f.desde ?? '')} titulo={f.titulo} icone="star.fill" onPress={() => abrirSalvo(f)} ultimo={i === salvos.favoritos.length - 1} />
            ))}
          </Secao>
        ) : null}
        {recentes.length ? (
          <Secao titulo="Abertos recentemente">
            {recentes.map((f, i) => (
              <Linha key={f.arquivo + (f.desde ?? '')} titulo={f.titulo} icone="clock.arrow.circlepath" onPress={() => abrirSalvo(f)} ultimo={i === recentes.length - 1} />
            ))}
          </Secao>
        ) : null}

        <Secao titulo="Liturgia das Horas">
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
          <Linha titulo="Confissão" sub="Exame de consciência, ato de contrição e o rito" icone="heart.text.square" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'confissao' } })} />
          <Linha titulo="Rituais e bênçãos" sub="Batismo, matrimônio, exéquias, bênçãos" icone="drop" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'rituais' } })} ultimo />
        </Secao>

        <Secao titulo="Consulta">
          <Linha titulo="Índice de A a Z" sub="Tudo o que o app tem, em ordem alfabética" icone="textformat.abc" onPress={() => router.push('/indice')} />
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
