// Busca no app inteiro: primeiro pelos títulos (orações, santos, salmos, rituais, Comunidade);
// depois, se pedir, dentro de todos os textos do conteúdo litúrgico.

import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';

import { buscarNosTextos, buscarParecidos, comNumeracaoHebraica, existe, registrarSalmos, normalizar, palavrasChave, textoJaLido, type Achado } from '@/conteudo/busca';
import { abrirItem, disponivel } from '@/conteudo/abrir';
import { ondeEsta, todasAsEntradas } from '@/conteudo/indice';
import { lerDado, usePacote } from '@/conteudo/pacote';
import { SANTOS } from '@/liturgia/santos';
import { useServidor } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Botao, Fundo, Linha, Secao } from '@/ui/base';

interface Resultado {
  chave: string;
  titulo: string;
  sub?: string;
  icone: any;
  abrir: () => void;
}

export default function Buscar() {
  const router = useRouter();
  const nav = useNavigation();
  const c = usePaleta();
  const srv = useServidor();
  const pacote = usePacote();
  const [termo, setTermo] = useState('');
  const [salmos, setSalmos] = useState<{ arquivo: string; ref: string; tema: string }[]>([]);
  const [varrendo, setVarrendo] = useState<{ feito: number; total: number } | null>(null);
  const [achados, setAchados] = useState<Achado[] | null>(null);
  const [parecidos, setParecidos] = useState<Achado[] | null>(null);
  const cancelar = useRef(false);

  useEffect(() => {
    nav.setOptions({ title: 'Buscar' });
    lerDado<{ arquivo: string; ref: string; tema: string }[]>('salmos.json').then((s) => {
      setSalmos(s ?? []);
      registrarSalmos(s ?? []);
    });
    return () => {
      cancelar.current = true;
    };
  }, [nav]);

  // termo mudou: a busca nos textos anterior deixa de valer
  useEffect(() => {
    cancelar.current = true;
    setAchados(null);
    setParecidos(null);
    setVarrendo(null);
  }, [termo]);

  const q = normalizar(termo.trim());

  const porTitulo: { grupo: string; itens: Resultado[] }[] = useMemo(() => {
    if (q.length < 2) return [];
    const bate = (...t: (string | null | undefined)[]) => normalizar(t.filter(Boolean).join(' ')).includes(q);
    const texto = (arquivo: string, titulo: string) => () => router.push({ pathname: '/texto', params: { arquivo, titulo } });
    const grupos: { grupo: string; itens: Resultado[] }[] = [];

    const com = srv.comunidade;
    const comunidade: Resultado[] = [];
    com?.oracoes.forEach((o) => {
      if (bate(o.titulo, o.subtitulo, o.texto))
        comunidade.push({ chave: 'o' + o.id, titulo: o.titulo, sub: 'Oração da Comunidade', icone: 'hands.sparkles', abrir: () => router.push({ pathname: '/oracao', params: { id: o.id } }) });
    });
    com?.jornadas.forEach((j) => {
      if (bate(j.titulo, j.descricao, j.comum, ...(j.textos ?? [])))
        comunidade.push({ chave: 'j' + j.id, titulo: j.titulo, sub: 'Jornada de oração', icone: 'sparkles', abrir: () => router.push({ pathname: '/jornada', params: { id: j.id } }) });
    });
    com?.propostas.forEach((p) => {
      if (bate(p.titulo, ...p.secoes.map((s) => `${s.titulo} ${s.texto}`)))
        comunidade.push({ chave: 'p' + p.id, titulo: p.titulo, sub: 'Proposta de oração', icone: 'doc.richtext', abrir: () => router.push({ pathname: '/proposta', params: { id: p.id } }) });
    });
    if (comunidade.length) grupos.push({ grupo: 'Comunidade', itens: comunidade });

    if (pacote.manifest) {
      // orações, Confissão, Rosário, rituais, ofícios e Missal: pelo nome e pelos outros nomes (ex.: "Ofício de Nossa Senhora"),
      // mostrando onde cada um mora no app
      const cat: Resultado[] = todasAsEntradas()
        .filter((e) => disponivel(e) && bate(e.titulo, e.sub, e.alias, ...e.caminhos))
        .map((e) => ({ chave: e.arquivo, titulo: e.titulo, sub: ondeEsta(e), icone: e.arquivo === '@app:exame' ? 'heart.text.square' : 'book.closed', abrir: () => abrirItem(router, e) }));
      if (cat.length) grupos.push({ grupo: 'Orações, rituais e Missal', itens: cat.slice(0, 50) });

      const sl = salmos
        .filter((s) => bate(comNumeracaoHebraica(s.ref), s.tema))
        .slice(0, 30)
        .map((s) => ({ chave: s.arquivo, titulo: s.ref, sub: s.tema, icone: 'music.note.list', abrir: texto(s.arquivo, s.ref) }));
      if (sl.length) grupos.push({ grupo: 'Salmos', itens: sl });

      const st: Resultado[] = [];
      for (const [md, l] of Object.entries(SANTOS))
        for (const s of l) {
          if (!s.slug || !bate(s.nome) || !existe(`santos/${s.slug}`)) continue;
          const [m, d] = md.split('-').map(Number);
          st.push({ chave: 's' + s.slug, titulo: s.nome, sub: `${d}/${String(m).padStart(2, '0')}`, icone: 'sparkles', abrir: () => router.push({ pathname: '/texto', params: { arquivo: `santos/${s.slug}`, titulo: s.nome, imagem: `santos/${s.slug}` } }) });
        }
      if (st.length) grupos.push({ grupo: 'Santos', itens: st.slice(0, 30) });
    }
    return grupos;
  }, [q, srv.comunidade, pacote.manifest, salmos, router]);

  const buscarTextos = async () => {
    cancelar.current = false;
    setAchados([]);
    setVarrendo({ feito: 0, total: 1 });
    const r = await buscarNosTextos(
      termo,
      (feito, total, parciais) => {
        if (cancelar.current) return;
        setVarrendo({ feito, total });
        setAchados([...parciais]);
      },
      () => cancelar.current,
    );
    if (!cancelar.current) {
      setAchados(r);
      setVarrendo(null);
      // poucas respostas exatas e uma frase com várias palavras: procura também textos parecidos
      if (r.length < 8 && palavrasChave(termo).length >= 2) {
        const p = await buscarParecidos(termo, () => cancelar.current, new Set(r.map((x) => x.arquivo)));
        if (!cancelar.current) setParecidos(p);
      }
    }
  };

  const total = porTitulo.reduce((n, g) => n + g.itens.length, 0);

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <View style={{ marginHorizontal: Espaco.l, marginTop: Espaco.s, marginBottom: Espaco.l }}>
          <TextInput underlineColorAndroid="transparent" cursorColor="#BC8C44"
            value={termo}
            onChangeText={setTermo}
            autoFocus
            placeholder="Oração, salmo, santo, palavra…"
            placeholderTextColor={c.textoFraco}
            clearButtonMode="while-editing"
            returnKeyType="search"
            autoCorrect={false}
            style={{ backgroundColor: c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: c.texto, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 }}
          />
        </View>

        {q.length < 2 ? (
          <Secao>
            <Aviso icone="magnifyingglass" texto="Procure pelo nome de uma oração, salmo, santo ou ritual, ou por uma palavra que esteja dentro do texto. Acentos e maiúsculas não importam." />
          </Secao>
        ) : (
          <>
            {porTitulo.map((g) => (
              <Secao key={g.grupo} titulo={g.grupo}>
                {g.itens.map((i, k) => (
                  <Linha key={i.chave} titulo={i.titulo} sub={i.sub} icone={i.icone} onPress={i.abrir} ultimo={k === g.itens.length - 1} />
                ))}
              </Secao>
            ))}
            {!total && !achados ? (
              <Secao>
                <Aviso texto="Nenhum título com essa palavra." />
              </Secao>
            ) : null}

            {pacote.manifest ? (
              achados == null ? (
                <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.xl }}>
                  <Botao
                    titulo={`Procurar “${termo.trim()}” dentro dos textos`}
                    icone="text.magnifyingglass"
                    tipo="secundario"
                    onPress={buscarTextos}
                  />
                  {!textoJaLido() ? (
                    <Text style={{ color: c.textoFraco, fontSize: 12.5, textAlign: 'center', marginTop: 8 }}>
                      Na primeira vez leva alguns segundos (são mais de 6 mil textos).
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Secao titulo={varrendo ? `Procurando nos textos… ${Math.round((varrendo.feito / varrendo.total) * 100)}%` : `Dentro dos textos (${achados.length}${achados.length >= 80 ? '+' : ''})`}>
                  {varrendo && !achados.length ? (
                    <View style={{ padding: Espaco.l }}>
                      <ActivityIndicator color={c.destaque} />
                    </View>
                  ) : null}
                  {!varrendo && !achados.length ? <Aviso texto="Não aparece em nenhum texto." /> : null}
                  {achados.map((a, k) => (
                    <Linha
                      key={a.arquivo}
                      titulo={a.titulo}
                      sub={[a.onde, a.trecho].filter(Boolean).join(' · ') || undefined}
                      onPress={() => router.push({ pathname: '/texto', params: { arquivo: a.arquivo, titulo: a.titulo, busca: termo.trim() } })}
                      ultimo={k === achados.length - 1}
                    />
                  ))}
                </Secao>
              )
            ) : null}
            {/* não achou? a sugestão chega para a coordenação do app */}
            <View style={{ alignItems: 'center', marginBottom: Espaco.xl, marginTop: -Espaco.s }}>
              <Text style={{ color: c.textoFraco, fontSize: 13.5 }}>Não encontrou o que procurava?</Text>
              <Text
                onPress={() => router.push({ pathname: '/sugestao', params: { texto: `Procurei "${termo.trim()}" e não encontrei. `, origem: 'busca' } })}
                style={{ color: c.destaque, fontSize: 15, fontWeight: '600', marginTop: 4, padding: 4 }}>
                Sugerir este texto
              </Text>
            </View>
            {parecidos?.length ? (
              <Secao titulo="Parecidos (outras traduções ou palavras em outra ordem)">
                {parecidos.map((a, k) => (
                  <Linha
                    key={'p' + a.arquivo}
                    titulo={a.titulo}
                    sub={[a.onde, a.trecho].filter(Boolean).join(' · ') || undefined}
                    onPress={() => router.push({ pathname: '/texto', params: { arquivo: a.arquivo, titulo: a.titulo } })}
                    ultimo={k === parecidos.length - 1}
                  />
                ))}
              </Secao>
            ) : null}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
