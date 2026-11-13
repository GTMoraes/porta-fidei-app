// Aba Comunidade: o convite a sustentar a obra (doação única ou Benfeitor) sempre no topo e, embaixo,
// uma linha por seção (quem somos, Casa Porta Fidei, obras, comissões, Benfeitor, redes). O toque abre a
// página da seção (rota /pagina, conteúdo em src/comunidade/sobre.ts).

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { ScrollView, View } from 'react-native';

import { CardContribuir, RodapeContribuir } from '@/comunidade/Contribuir';
import { Quadrado } from '@/tema';
import { Fundo, Linha, Secao, TituloTela } from '@/ui/base';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { useFolgaAbas } from '@/ui/AbasAndroid';

const SECOES: { id: string; titulo: string; sub: string; icone: SFSymbol; cor: string }[] = [
  { id: 'quemsomos', titulo: 'Quem somos', sub: 'O carisma e a nossa história', icone: 'door.left.hand.open', cor: Quadrado.vinho },
  { id: 'horarios', titulo: 'Horários e encontros', sub: 'Missas, adoração, grupos de oração e comissões', icone: 'clock', cor: Quadrado.ouro },
  { id: 'casa', titulo: 'Casa Porta Fidei', sub: 'Serviços gratuitos e onde fica', icone: 'house', cor: Quadrado.azul },
  { id: 'obras', titulo: 'Obras e ações', sub: 'Cuscuz Solidário, Happy Day e mais', icone: 'heart.fill', cor: Quadrado.ouro },
  { id: 'comissoes', titulo: 'Comissões', sub: 'Obras, Música e outras', icone: 'person.3', cor: Quadrado.verde },
  { id: 'voluntario', titulo: 'Seja um voluntário', sub: 'Ajudar nas obras e ações (em breve)', icone: 'hand.raised', cor: Quadrado.azul },
  { id: 'benfeitor', titulo: 'Seja Benfeitor', sub: 'Quem sustenta a obra todo mês', icone: 'heart', cor: Quadrado.vinho },
  { id: 'redes', titulo: 'Redes e contato', sub: 'Instagram, YouTube, Facebook e site', icone: 'globe', cor: Quadrado.cinza },
];

export default function Comunidade() {
  const folga = useFolgaAbas();
  const lista = useSubirAoTopo();
  const router = useRouter();

  return (
    <Fundo aba>
      <ScrollView ref={lista} scrollToOverflowEnabled contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Comunidade" />

        <CardContribuir />

        <Secao>
          {SECOES.map((s, i) => (
            <Linha
              key={s.id}
              titulo={s.titulo}
              sub={s.sub}
              icone={s.icone}
              quadrado={s.cor}
              onPress={() => router.push({ pathname: '/pagina', params: { id: s.id } })}
              ultimo={i === SECOES.length - 1}
            />
          ))}
        </Secao>

        <RodapeContribuir />
        <View style={{ height: 30 + folga }} />
      </ScrollView>
    </Fundo>
  );
}
