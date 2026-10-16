// Proposta de oração da semana (Material de Oração Pessoal enviado às segundas)

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { propostaHtml, semana } from '@/comunidade/html';
import { lerPrevia } from '@/comunidade/previa';
import { useServidor } from '@/servidor/api';
import { usePaleta } from '@/tema';
import { toque } from '@/ui/base';
import { Leitor } from '@/ui/Leitor';

export default function TelaProposta() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const srv = useServidor();
  const router = useRouter();
  const c = usePaleta();
  const com = srv.comunidade;
  const p = lerPrevia(id) ?? com?.propostas.find((x) => x.id === (id || com.atual)) ?? null;
  const corpo = useMemo(
    () =>
      p
        ? propostaHtml(p)
        : '<p class="c" style="margin-top:24px"><span class="lacuna">Nenhuma proposta de oração publicada ainda. Puxe para atualizar a tela Hoje.</span></p>',
    [p],
  );
  const anteriores = (com?.propostas ?? []).filter((x) => x.id !== p?.id);

  const rodape = anteriores.length ? (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      <Pressable
        onPress={() => {
          toque();
          router.push('/propostas');
        }}
        hitSlop={6}
        style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 16, opacity: pressed ? 0.5 : 1 })}>
        <Text style={{ color: c.destaque, fontSize: 15 }}>Propostas anteriores</Text>
      </Pressable>
    </View>
  ) : undefined;

  return (
    <Leitor
      corpo={corpo}
      titulo={p?.titulo ?? 'Proposta de oração'}
      subtitulo={p ? `Proposta de oração${p.inicio ? ` · ${semana(p)}` : ''}${p.publicada ? '' : ' · rascunho'}` : undefined}
      rodape={rodape}
    />
  );
}
