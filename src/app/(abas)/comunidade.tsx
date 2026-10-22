// Aba Comunidade: quem somos, história, Casa Porta Fidei, obras, ministérios, contatos
// e, sempre no topo, o convite a sustentar a obra (doação única ou Benfeitor).

import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { CardContribuir, RodapeContribuir } from '@/comunidade/Contribuir';
import { CARISMA, QUEM_SOMOS, REDES } from '@/comunidade/sobre';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Fundo, Linha, Secao, TituloTela } from '@/ui/base';
import { abrirLink } from '@/ui/Midia';
import { useSubirAoTopo } from '@/ui/subirAoTopo';

export default function Comunidade() {
  const lista = useSubirAoTopo();
  const router = useRouter();
  const c = usePaleta();
  const abrir = (id: string) => router.push({ pathname: '/pagina', params: { id } });

  return (
    <Fundo aba>
      <ScrollView ref={lista} scrollToOverflowEnabled contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Comunidade" sobre="Comunidade Católica Porta Fidei" />

        <CardContribuir />

        <Secao titulo="Quem somos">
          <View style={{ padding: Espaco.l, gap: 10 }}>
            <Text style={{ color: c.destaque, fontFamily: Fontes.titulo, fontSize: 18, lineHeight: 25, fontStyle: 'italic' }}>“{CARISMA}”</Text>
            <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21 }}>{QUEM_SOMOS}</Text>
          </View>
          <Linha titulo="Nossa história" sub="De um grupo de estudo, em 2012, a Comunidade" icone="clock.arrow.circlepath" onPress={() => abrir('historia')} ultimo />
        </Secao>

        <Secao titulo="Casa Porta Fidei">
          <Linha titulo="A Casa e os serviços gratuitos" sub="Atendimento médico, psicológico, aulas e mais" icone="house" onPress={() => abrir('casa')} ultimo />
        </Secao>

        <Secao titulo="Obras e ações">
          <Linha titulo="Cuscuz Solidário" sub="Com as pessoas em situação de rua" icone="takeoutbag.and.cup.and.straw" onPress={() => abrir('cuscuz')} />
          <Linha titulo="Happy Day" sub="Um dia diferente para crianças carentes" icone="sun.max" onPress={() => abrir('happyday')} />
          <Linha titulo="Quarentena Solidária" sub="2020 · cerca de 4 toneladas de doações" icone="shippingbox" onPress={() => abrir('quarentena')} ultimo />
        </Secao>

        <Secao titulo="Ministérios">
          <Linha titulo="Ministérios da Comunidade" sub="Obras, Música e outros" icone="person.3" onPress={() => abrir('ministerios')} ultimo />
        </Secao>

        <Secao titulo="Ser Benfeitor">
          <Linha titulo="O que é ser Benfeitor" sub="Quem contribui todos os meses com a obra" icone="heart.circle" onPress={() => abrir('benfeitor')} ultimo />
        </Secao>

        <Secao titulo="Redes e contato">
          {REDES.map((r, i) => (
            <Linha key={r.url} titulo={r.titulo} sub={r.sub} icone={r.icone as any} onPress={() => abrirLink(r.url)} ultimo={i === REDES.length - 1} />
          ))}
        </Secao>

        <RodapeContribuir />
        <View style={{ height: 30 }} />
      </ScrollView>
    </Fundo>
  );
}
