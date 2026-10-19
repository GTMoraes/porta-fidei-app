// Exame de consciência completo (Mandamentos, Mandamentos da Igreja, pecados capitais, deveres do próprio estado).
// O texto está em revisão (seminarista e uma consagrada da Comunidade de Vida); até lá, um aviso.

import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePaleta } from '@/tema';
import { toque } from '@/ui/base';
import { Leitor } from '@/ui/Leitor';

const EM_REVISAO = `
<section class="parte">
<p class="c" style="margin-top:20px"><span class="lacuna">Em breve, numa próxima atualização do app</span></p>
<p>Este exame de consciência mais completo está sendo revisado pela Comunidade antes de ser publicado. Ele vai trazer:</p>
<p>· os Dez Mandamentos;<br/>· os Cinco Mandamentos da Igreja;<br/>· os sete pecados capitais e as virtudes opostas;<br/>· os deveres do próprio estado de vida;<br/>· um passo a passo para a hora da confissão.</p>
<p>Enquanto isso, use o <b>Breve exame de consciência</b>, logo abaixo.</p>
</section>`;

export default function Exame() {
  const router = useRouter();
  const c = usePaleta();
  const rodape = (
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
      <Pressable
        onPress={() => {
          toque();
          router.replace({ pathname: '/texto', params: { arquivo: 'oficio/outros/exameconsciencia', titulo: 'Breve exame de consciência' } });
        }}
        style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 16, opacity: pressed ? 0.5 : 1 })}>
        <Text style={{ color: c.destaque, fontSize: 15 }}>Abrir o Breve exame de consciência</Text>
      </Pressable>
    </View>
  );
  return <Leitor corpo={EM_REVISAO} titulo="Exame de consciência" subtitulo="Completo · em revisão" rodape={rodape} />;
}
