import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, View } from 'react-native';

import { mudarDataRezar, useDataRezar } from '@/estado/dataRezar';
import { useSalvos, type ItemSalvo } from '@/estado/favoritos';
import { dataPorExtenso } from '@/liturgia/calendario';
import { ProprioDoDia, SECOES_REZAR, mostrarLeituras } from '@/secoes/rezar';
import { Espaco, usePaleta } from '@/tema';
import { Fundo, Icone, Linha, Secao, TituloTela, toque, Vidro } from '@/ui/base';
import { SeletorDataLiturgica } from '@/ui/CalendarioLiturgico';
import { CartaoDoDia } from '@/ui/CartaoDoDia';
import { Folhinha, MES_SIGLA } from '@/ui/Folhinha';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { useFolgaAbas } from '@/ui/AbasAndroid';

// Aba Rezar: a folhinha no alto escolhe o dia, e tudo o que depende do dia segue essa data (o card do dia,
// os Próprios do dia e as seções). Depois da busca: card do dia, Próprios do dia, Meus favoritos e as
// seções, cada uma uma linha que abre a própria página (rota /secao, conteúdo em src/secoes/rezar.tsx).
// Os abertos recentemente ficam na tela de busca.
export default function Orar() {
  const folga = useFolgaAbas();
  const lista = useSubirAoTopo();
  const router = useRouter();
  const c = usePaleta();
  const salvos = useSalvos();
  const r = useDataRezar();
  const [escolhendo, setEscolhendo] = useState(false);
  const abrirSalvo = (i: ItemSalvo) => router.push({ pathname: '/texto', params: { arquivo: i.arquivo, titulo: i.titulo, desde: i.desde ?? '', ate: i.ate ?? '' } });

  // vindo de outra tela já num dia (ex.: tocar num dia do Calendário litúrgico): `t` muda a cada pedido
  const pedido = useLocalSearchParams<{ data?: string; t?: string }>();
  useEffect(() => {
    if (pedido.data && /^\d{4}-\d{2}-\d{2}$/.test(pedido.data)) mudarDataRezar(pedido.data);
  }, [pedido.data, pedido.t]);

  // o dia muda sozinho (app aberto de novo noutro dia, meia-noite): redesenha ao voltar para a tela ou para o app
  const [, redesenhar] = useState(0);
  useFocusEffect(useCallback(() => redesenhar((n) => n + 1), []));
  useEffect(() => {
    const s = AppState.addEventListener('change', (st) => st === 'active' && redesenhar((n) => n + 1));
    return () => s.remove();
  }, []);

  const d = new Date(r.data + 'T12:00:00');
  const folhinha = (
    <Pressable
      onPress={() => {
        toque();
        setEscolhendo(true);
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Dia: ${dataPorExtenso(r.data)}. Toque para escolher outro dia.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {/* dourada quando o dia escolhido não é hoje */}
      <Folhinha
        topo={MES_SIGLA[d.getMonth()]}
        dia={d.getDate()}
        largura={44}
        altura={48}
        fundo={r.escolhida ? c.ouroCheio : undefined}
        corTopo={r.escolhida ? 'rgba(255,255,255,0.88)' : undefined}
        corDia={r.escolhida ? '#FFFFFF' : undefined}
      />
    </Pressable>
  );

  return (
    <Fundo aba>
      <ScrollView ref={lista} scrollToOverflowEnabled contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Rezar" direita={folhinha} />
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

        {/* o dia escolhido: o toque mostra as leituras daquele dia */}
        <CartaoDoDia data={r.data} comData alturaPintura={170} onPress={() => mostrarLeituras(r.data)} />
        <Text style={{ color: c.textoFraco, fontSize: 12.5, textAlign: 'center', marginTop: 8, marginBottom: Espaco.xl }}>Toque para ver as leituras do dia</Text>

        <ProprioDoDia data={r.data} />

        {salvos.favoritos.length ? (
          <Secao titulo="Meus favoritos">
            {salvos.favoritos.map((f, i) => (
              <Linha key={f.arquivo + (f.desde ?? '')} titulo={f.titulo} icone="star.fill" onPress={() => abrirSalvo(f)} ultimo={i === salvos.favoritos.length - 1} />
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

      <SeletorDataLiturgica
        visivel={escolhendo}
        data={r.data}
        aoEscolher={(dia) => {
          setEscolhendo(false);
          mudarDataRezar(dia);
        }}
        aoFechar={() => setEscolhendo(false)}
      />
    </Fundo>
  );
}
