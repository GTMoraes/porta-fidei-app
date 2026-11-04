// Aba Rezar: o card do dia e os Próprios do dia (o que era a tela do dia) e as seções, cada uma uma linha
// que abre a página dela (rota /secao). Tudo o que depende do dia segue a data do Rezar (folhinha no alto,
// src/estado/dataRezar.ts): Horas, Liturgia Diária, Missal do dia, santos, proposta e jornadas.

import { router, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import { semana } from '@/comunidade/html';
import { jornadasDeHoje } from '@/comunidade/jornadas';
import { existe, imagemUri, listar, usePacote } from '@/conteudo/pacote';
import { useAjustes } from '@/estado/ajustes';
import { dataDaHora, useDataRezar } from '@/estado/dataRezar';
import { diaLiturgico } from '@/liturgia/calendario';
import { lerDiaCNBB, resumoLeituras } from '@/liturgia/cnbb';
import { HORAS } from '@/liturgia/horas';
import { santosDoDia } from '@/liturgia/martirologio';
import { missalDoDia } from '@/liturgia/missal';
import { useServidor, type Comunidade } from '@/servidor/api';
import { Marca, Quadrado } from '@/tema';
import { Linha, Secao } from '@/ui/base';
import { dataCurta } from '@/util/datas';

import type { InfoSecao } from './tipos';

export const SECOES_REZAR: InfoSecao[] = [
  { id: 'horas', titulo: 'Liturgia das Horas', sub: 'Do Invitatório às Completas', icone: 'clock', cor: Quadrado.vinho },
  { id: 'missa', titulo: 'Missa', sub: 'Liturgia Diária e Missal', icone: 'text.book.closed', cor: Quadrado.ouro },
  { id: 'oracoes', titulo: 'Orações e rituais', sub: 'Orações, Rosário, Confissão e mais', icone: 'hands.sparkles', cor: Quadrado.azul },
  { id: 'comunidade', titulo: 'Comunidade', sub: 'Proposta de oração, jornadas e mais', icone: 'person.3', cor: Quadrado.verde },
  { id: 'consulta', titulo: 'Consulta', sub: 'Índices, comuns e calendário', icone: 'books.vertical', cor: Quadrado.cinza },
];

/** Seções cujo conteúdo muda com a data do Rezar (a página mostra o dia embaixo do título quando não é hoje) */
export const SECOES_COM_DATA = ['horas', 'missa', 'comunidade'];

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

/** Toque no card do dia: o resumo das leituras daquele dia (como no iLiturgia), com o atalho para a Liturgia Diária */
export async function mostrarLeituras(data: string) {
  const abrir = { text: 'Abrir Liturgia Diária', onPress: () => router.push({ pathname: '/liturgia', params: { data } }) };
  const d = await lerDiaCNBB(data);
  const l = d ? resumoLeituras(d.html) : [];
  if (!l.length) {
    Alert.alert('Leituras do dia', 'As leituras deste dia ainda não foram carregadas. Abra a Liturgia Diária uma vez (com internet) e elas ficam guardadas.', [
      { text: 'Fechar', style: 'cancel' },
      abrir,
    ]);
    return;
  }
  Alert.alert('Leituras do dia', l.map((x) => `${x.titulo}: ${x.ref}`).join('\n'), [{ text: 'OK', style: 'cancel' }, abrir]);
}

/** Próprios do dia (era "Missa e santo" na tela do dia): Liturgia Diária, santos e as orações da Missa do dia */
export function ProprioDoDia({ data }: { data: string }) {
  const router = useRouter();
  usePacote();
  const dia = useMemo(() => diaLiturgico(data), [data]);
  const cel = dia.celebracao;
  const bio = (slug?: string | null) => (slug && existe(`santos/${slug}`) ? `santos/${slug}` : undefined);
  const abrirBio = (arquivo: string, titulo: string, mart?: string) =>
    router.push({ pathname: '/texto', params: { arquivo, titulo, imagem: imagemUri(arquivo) ? arquivo : '', ...(mart ? { mart } : {}) } });
  const santo = bio(cel.slug);
  const missal = missalDoDia(dia, existe);
  const linhas: { k: string; titulo: string; sub?: string; icone: SFSymbol; abrir: () => void }[] = [
    { k: 'liturgia', titulo: 'Liturgia Diária', sub: 'Leituras e orações da Missa', icone: 'book', abrir: () => router.push({ pathname: '/liturgia', params: { data } }) },
  ];
  if (santo) linhas.push({ k: 'santo', titulo: 'Vida do santo', sub: cel.nome, icone: 'sparkles', abrir: () => abrirBio(santo, cel.nome, data) });
  for (const f of dia.facultativas) {
    const b = bio(f.slug);
    if (b) linhas.push({ k: `f-${f.nome}`, titulo: f.nome, sub: 'Memória facultativa', icone: 'sparkles', abrir: () => abrirBio(b, f.nome) });
  }
  if (santosDoDia(data).length)
    linhas.push({ k: 'mart', titulo: 'Outros santos do dia', sub: 'Martirológio Romano', icone: 'person.3', abrir: () => router.push({ pathname: '/martirologio', params: { data } }) });
  if (missal) linhas.push({ k: 'missal', titulo: 'Orações da Missa (Missal)', icone: 'text.book.closed', abrir: () => router.push({ pathname: '/texto', params: { arquivo: missal, titulo: cel.nome } }) });
  return (
    <Secao titulo="Próprios do dia">
      {linhas.map((l, i) => (
        <Linha key={l.k} titulo={l.titulo} sub={l.sub} icone={l.icone} onPress={l.abrir} ultimo={i === linhas.length - 1} />
      ))}
    </Secao>
  );
}

function Horas() {
  const router = useRouter();
  const r = useDataRezar();
  return (
    <Secao>
      {HORAS.map((h, i) => (
        <Linha
          key={h.id}
          titulo={h.nome}
          sub={h.quando}
          icone={ICONE_HORA[h.id]}
          corIcone={h.id === 'laudes' || h.id === 'vesperas' ? Marca.vinho : undefined}
          onPress={() => router.push({ pathname: '/hora', params: { h: h.id, data: dataDaHora(h.id, r) } })}
          ultimo={i === HORAS.length - 1}
        />
      ))}
    </Secao>
  );
}

function Missa() {
  const router = useRouter();
  const aj = useAjustes();
  const r = useDataRezar();
  usePacote();
  const evangelhoAoAcaso = () => {
    const todos = listar('evangelho/');
    if (!todos.length) return;
    const a = todos[Math.floor(Math.random() * todos.length)];
    router.push({ pathname: '/texto', params: { arquivo: a, titulo: 'Evangelho ao acaso' } });
  };
  return (
    <Secao>
      <Linha titulo="Liturgia Diária" sub="Leituras do dia" icone="book" onPress={() => router.push({ pathname: '/liturgia', params: { data: r.data } })} />
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

/** Proposta de oração de um dia: hoje, a atual da coordenação; noutro dia, a publicada para a semana daquele dia */
export function propostaDoDia(com: Comunidade | undefined, data: string, escolhida: boolean) {
  if (!com) return undefined;
  if (!escolhida) return com.propostas.find((p) => p.id === com.atual);
  return com.propostas.find((p) => p.publicada !== false && !!p.inicio && !!p.fim && p.inicio <= data && data <= p.fim);
}

function DaComunidade() {
  const router = useRouter();
  const srv = useServidor();
  const r = useDataRezar();
  const com = srv.comunidade;
  const proposta = propostaDoDia(com, r.data, r.escolhida);
  const doDia = jornadasDeHoje(com?.jornadas, r.data);
  return (
    <Secao>
      <Linha
        titulo="Proposta de oração"
        sub={
          proposta
            ? `${proposta.titulo}${proposta.inicio ? ` · ${semana(proposta)}` : ''}`
            : r.escolhida
              ? 'Nenhuma proposta publicada para esta semana'
              : 'Material de oração pessoal da semana'
        }
        icone="doc.richtext"
        corIcone={Marca.vinho}
        onPress={() =>
          proposta ? router.push({ pathname: '/proposta', params: { id: proposta.id } }) : router.push(r.escolhida ? '/propostas' : '/proposta')
        }
      />
      <Linha
        titulo="Jornadas de oração"
        sub={
          doDia.length
            ? `${r.escolhida ? `Em ${dataCurta(new Date(r.data + 'T12:00:00'))}` : 'Agora'}: ${doDia.map((j) => j.titulo).join(', ')}`
            : 'Novenas dos baluartes, Quaresma de São Miguel, Cerco de Jericó'
        }
        icone="sparkles"
        onPress={() => router.push(r.escolhida ? { pathname: '/jornadas', params: { data: r.data } } : '/jornadas')}
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
  const r = useDataRezar();
  return (
    <Secao>
      <Linha titulo="Índice de A a Z" sub="Tudo o que o app tem, em ordem alfabética" icone="textformat.abc" onPress={() => router.push('/indice')} />
      <Linha titulo="Índice de salmos e cânticos" icone="music.note.list" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'salmos' } })} />
      <Linha titulo="Comuns e ofícios votivos" icone="square.stack" onPress={() => router.push({ pathname: '/lista', params: { tipo: 'comuns' } })} />
      <Linha titulo="Calendário litúrgico" icone="calendar" onPress={() => router.push(r.escolhida ? { pathname: '/calendario', params: { data: r.data } } : '/calendario')} />
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
