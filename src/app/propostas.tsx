import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { semana } from '@/comunidade/html';
import { useServidor } from '@/servidor/api';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';

export default function Propostas() {
  const srv = useServidor();
  const router = useRouter();
  const lista = srv.comunidade?.propostas ?? [];
  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Secao titulo="Propostas de oração">
          {lista.length ? (
            lista.map((p, i) => (
              <Linha
                key={p.id}
                titulo={p.titulo}
                sub={semana(p) || new Date(p.criado).toLocaleDateString('pt-BR')}
                icone={p.id === srv.comunidade?.atual ? 'sparkles' : 'doc.richtext'}
                onPress={() => router.push({ pathname: '/proposta', params: { id: p.id } })}
                ultimo={i === lista.length - 1}
              />
            ))
          ) : (
            <Aviso texto="Nenhuma proposta publicada ainda." />
          )}
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
