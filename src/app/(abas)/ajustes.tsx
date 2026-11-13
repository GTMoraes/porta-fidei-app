import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { textoTarefas, useConta } from '@/estado/conta';
import { SECOES_AJUSTES } from '@/secoes/ajustes';
import { Espaco, Quadrado, usePaleta } from '@/tema';
import { Avatar } from '@/ui/Avatar';
import { Fundo, Icone, Linha, Secao, TituloTela, toque } from '@/ui/base';
import { useSubirAoTopo } from '@/ui/subirAoTopo';
import { useFolgaAbas } from '@/ui/AbasAndroid';

// Aba Ajustes, como nos Ajustes do iPhone: no alto, a conta (foto e nome, ou "Entrar ou criar conta"); depois uma linha
// por seção, e o toque abre a página dela (rota /secao, conteúdo em src/secoes/ajustes.tsx).
export default function TelaAjustes() {
  const folga = useFolgaAbas();
  const lista = useSubirAoTopo();
  const router = useRouter();
  const c = usePaleta();
  const conta = useConta();

  return (
    <Fundo aba>
      <ScrollView ref={lista} scrollToOverflowEnabled contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Ajustes" />
        <Secao>
          {conta ? (
            <Pressable
              onPress={() => {
                toque();
                router.push('/conta');
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
              accessibilityRole="button"
              accessibilityLabel={`Sua conta: ${conta.nome}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Espaco.m, paddingVertical: 12, paddingHorizontal: Espaco.l }}>
                <Avatar foto={conta.foto} nome={conta.nome} tamanho={54} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.texto, fontSize: 19, fontWeight: '600' }} numberOfLines={1}>
                    {conta.nome}
                  </Text>
                  <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 2 }} numberOfLines={2}>
                    {[conta.usuario ? `@${conta.usuario}` : '', textoTarefas(conta)].filter(Boolean).join(' · ') || 'Sua conta'}
                  </Text>
                </View>
                <Icone nome="chevron.right" cor={c.textoFraco} tamanho={14} />
              </View>
            </Pressable>
          ) : (
            <Linha
              titulo="Entrar ou criar conta"
              sub="Para quem participa da Comunidade (o app funciona sem conta)"
              icone="person.crop.circle"
              quadrado={Quadrado.azul}
              onPress={() => router.push('/entrar')}
              ultimo
            />
          )}
        </Secao>
        <Secao>
          {SECOES_AJUSTES.map((s, i) => (
            <Linha
              key={s.id}
              titulo={s.titulo}
              sub={s.sub}
              icone={s.icone}
              quadrado={s.cor}
              onPress={() => router.push({ pathname: '/secao', params: { id: s.id } })}
              ultimo={i === SECOES_AJUSTES.length - 1}
            />
          ))}
        </Secao>
        <View style={{ height: 50 + folga }} />
      </ScrollView>
    </Fundo>
  );
}
