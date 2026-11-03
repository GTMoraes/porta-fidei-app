import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useSalvos, type ItemSalvo } from '@/estado/favoritos';
import { SECOES_REZAR } from '@/secoes/rezar';
import { Espaco, usePaleta } from '@/tema';
import { Fundo, Icone, Linha, Secao, TituloTela, toque, Vidro } from '@/ui/base';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { useFolgaAbas } from '@/ui/AbasAndroid';

// Aba Rezar: a busca, os favoritos e os recentes ficam soltos no alto (são atalhos); cada seção é uma
// linha que abre a própria página (rota /secao, conteúdo em src/secoes/rezar.tsx).
export default function Orar() {
  const folga = useFolgaAbas();
  const lista = useSubirAoTopo();
  const router = useRouter();
  const c = usePaleta();
  const salvos = useSalvos();
  const abrirSalvo = (i: ItemSalvo) => router.push({ pathname: '/texto', params: { arquivo: i.arquivo, titulo: i.titulo, desde: i.desde ?? '', ate: i.ate ?? '' } });
  const recentes = salvos.recentes.filter((r) => !salvos.favoritos.some((f) => f.arquivo === r.arquivo && (f.desde ?? '') === (r.desde ?? ''))).slice(0, 4);

  return (
    <Fundo aba>
      <ScrollView ref={lista} scrollToOverflowEnabled contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Rezar" />
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

        <Secao>
          {SECOES_REZAR.map((s, i) => (
            <Linha
              key={s.id}
              titulo={s.titulo}
              sub={s.sub}
              icone={s.icone}
              quadrado={s.cor}
              onPress={() => router.push({ pathname: '/secao', params: { id: s.id } })}
              ultimo={i === SECOES_REZAR.length - 1}
            />
          ))}
        </Secao>
        <View style={{ height: 40 + folga }} />
      </ScrollView>
    </Fundo>
  );
}
