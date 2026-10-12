import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { COMUNS, MISSAL_FIXO, ORACOES, RITUAIS, ROSARIO, type Grupo, type Item } from '@/conteudo/catalogo';
import { existe, lerDado, listar, usePacote } from '@/conteudo/pacote';
import { SANTOS } from '@/liturgia/santos';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';

const TITULOS: Record<string, string> = {
  oracoes: 'Orações',
  rituais: 'Rituais e bênçãos',
  comuns: 'Comuns e ofícios votivos',
  missal: 'Missal',
  'missal-proprio': 'Próprio',
  rosario: 'Santo Rosário',
  salmos: 'Salmos e cânticos',
};

const PASTAS_MISSAL: [string, string][] = [
  ['advento', 'Advento'],
  ['natal', 'Natal'],
  ['quaresma', 'Quaresma'],
  ['semanasanta', 'Semana Santa'],
  ['pascoa', 'Páscoa'],
  ['tempocomum', 'Tempo Comum'],
  ['proprio', 'Próprio dos santos'],
];

const DIA: Record<string, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
};
const SIGLA: Record<string, string> = { AD: 'do Advento', TC: 'do Tempo Comum', QA: 'da Quaresma', PA: 'da Páscoa', NA: 'do Natal' };

const nomePorSlug = (() => {
  const mapa = new Map<string, string>();
  Object.values(SANTOS).forEach((l) => l.forEach((s) => s.slug && mapa.set(s.slug, s.nome)));
  return mapa;
})();

function nomeMissal(slug: string): string {
  const santo = nomePorSlug.get(slug);
  if (santo) return santo;
  let m = slug.match(/^(\d+)(domingo|segunda|terca|quarta|quinta|sexta|sabado)([A-Z]{2})?$/);
  if (m) {
    const n = Number(m[1]);
    const tempo = m[3] ? SIGLA[m[3]] ?? '' : '';
    return m[2] === 'domingo' ? `${n}º Domingo ${tempo}`.trim() : `${DIA[m[2]]} da ${n}ª semana ${tempo}`.trim();
  }
  m = slug.match(/^(\d+)(dezembro|janeiro)/);
  if (m) return `${m[1]} de ${m[2]}`;
  return slug
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (x) => x.toUpperCase());
}

interface EntradaSalterio {
  0: string;
  1: string;
  2: string;
  3: string[];
}

export default function Lista() {
  const { tipo, pasta } = useLocalSearchParams<{ tipo: string; pasta?: string }>();
  const router = useRouter();
  const nav = useNavigation();
  const c = usePaleta();
  usePacote();
  const [busca, setBusca] = useState('');
  const [salmos, setSalmos] = useState<{ arquivo: string; ref: string; tema: string }[]>([]);
  const [canticos, setCanticos] = useState<Item[]>([]);

  useEffect(() => {
    const t = tipo === 'missal-proprio' ? PASTAS_MISSAL.find((p) => p[0] === pasta)?.[1] ?? 'Próprio' : TITULOS[tipo] ?? '';
    nav.setOptions({ title: t });
  }, [tipo, pasta, nav]);

  useEffect(() => {
    if (tipo !== 'salmos') return;
    lerDado<{ arquivo: string; ref: string; tema: string }[]>('salmos.json').then((s) => setSalmos(s ?? []));
    lerDado<EntradaSalterio[]>('salterio.json').then((l) => {
      if (!l) return;
      const vistos = new Set<string>();
      const itens: Item[] = [];
      for (const e of l) {
        const [semana, dia, hora, lista] = [e[0], e[1], e[2], e[3]];
        for (let i = 0; i < lista.length; i += 2) {
          const tit = lista[i];
          if (/^Salmo/i.test(tit) || vistos.has(tit)) continue;
          vistos.add(tit);
          const arq = `oficio/tempocomum/horas/${semana}${dia}_${hora}`;
          if (!existe(arq)) continue;
          itens.push({
            arquivo: `${arq}#${tit.replace(/^Cf\.\s*/, '').split(',')[0]}`,
            titulo: `Cântico ${tit}`,
            sub: `Semana ${'I'.repeat(Number(semana)).replace('IIII', 'IV')} · ${DIA[dia] ?? dia} · ${hora === 'laudes' ? 'Laudes' : 'Vésperas'}`,
          });
        }
      }
      setCanticos(itens);
    });
  }, [tipo]);

  const grupos: Grupo[] = useMemo(() => {
    const filtra = (gs: Grupo[]) =>
      gs.map((g) => ({ ...g, itens: g.itens.filter((i) => existe(i.arquivo.split('#')[0])) })).filter((g) => g.itens.length);
    switch (tipo) {
      case 'oracoes':
        return filtra(ORACOES);
      case 'rituais':
        return filtra(RITUAIS);
      case 'comuns':
        return filtra(COMUNS);
      case 'rosario':
        return filtra(ROSARIO);
      case 'missal':
        return [
          ...filtra(MISSAL_FIXO),
          {
            titulo: 'Próprio do tempo e dos santos',
            itens: PASTAS_MISSAL.map(([p, n]) => ({ arquivo: `@pasta:${p}`, titulo: n })),
          },
          {
            titulo: 'Prefácios',
            itens: [
              { arquivo: '@prefacio:tempo', titulo: 'Prefácios dos tempos' },
              { arquivo: '@prefacio:proprio', titulo: 'Prefácios próprios' },
            ],
          },
        ];
      case 'missal-proprio': {
        const raiz = pasta?.startsWith('prefacio-') ? `missal/prefacio/${pasta.slice(9)}/` : `missal/proprio/${pasta}/`;
        const itens = listar(raiz)
          .map((a) => ({ arquivo: a, titulo: nomeMissal(a.slice(raiz.length)) }))
          .sort((x, y) => x.titulo.localeCompare(y.titulo, 'pt-BR', { numeric: true }));
        return [{ titulo: '', itens }];
      }
      case 'salmos':
        return [
          { titulo: 'Salmos', itens: salmos.map((s) => ({ arquivo: s.arquivo, titulo: s.ref, sub: s.tema })) },
          { titulo: 'Cânticos de Laudes e Vésperas', itens: canticos },
        ];
      default:
        return [];
    }
  }, [tipo, pasta, salmos, canticos]);

  const q = busca
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const filtrados = q
    ? grupos
        .map((g) => ({
          ...g,
          itens: g.itens.filter((i) =>
            `${i.titulo} ${i.sub ?? ''}`
              .toLowerCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .includes(q),
          ),
        }))
        .filter((g) => g.itens.length)
    : grupos;

  const abrir = (i: Item) => {
    if (i.arquivo.startsWith('@pasta:')) return router.push({ pathname: '/lista', params: { tipo: 'missal-proprio', pasta: i.arquivo.slice(7) } });
    if (i.arquivo.startsWith('@prefacio:')) return router.push({ pathname: '/lista', params: { tipo: 'missal-proprio', pasta: `prefacio-${i.arquivo.slice(10)}` } });
    const [arquivo, desde] = i.arquivo.split('#');
    router.push({ pathname: '/texto', params: { arquivo, titulo: i.titulo, desde: desde ?? '', ate: desde ? 'Ant.' : '' } });
  };

  const total = grupos.reduce((n, g) => n + g.itens.length, 0);

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag">
        {total > 12 ? (
          <View style={{ marginHorizontal: Espaco.l, marginTop: Espaco.s, marginBottom: Espaco.l }}>
            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar"
              placeholderTextColor={c.textoFraco}
              clearButtonMode="while-editing"
              style={{ backgroundColor: c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: c.texto, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 }}
            />
          </View>
        ) : null}
        {!total ? (
          <Secao>
            <Aviso texto="Nada encontrado no pacote de conteúdo instalado." />
          </Secao>
        ) : null}
        {filtrados.map((g) => (
          <Secao key={g.titulo || 'g'} titulo={g.titulo || undefined}>
            {g.itens.map((i, k) => (
              <Linha key={i.arquivo + k} titulo={i.titulo} sub={i.sub} onPress={() => abrir(i)} ultimo={k === g.itens.length - 1} />
            ))}
          </Secao>
        ))}
        <Text style={{ height: 30 }} />
      </ScrollView>
    </Fundo>
  );
}
