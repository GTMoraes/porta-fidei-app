// Administração da oração da Comunidade: propostas, jornadas e orações.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { recarregarAdmin, useAdminComunidade } from '@/comunidade/admin';
import { semana } from '@/comunidade/html';
import { periodo } from '@/comunidade/jornadas';
import { escolherPdf } from '@/comunidade/pdf';
import { definirPrevia } from '@/comunidade/previa';
import { hojeIso } from '@/liturgia/calendario';
import { enviarPropostaPdf } from '@/servidor/api';
import { Espaco } from '@/tema';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';
import { dataCurta } from '@/util/datas';

const dt = (iso: string) => dataCurta(new Date(iso + 'T12:00:00'));

export default function AdminOracao() {
  const router = useRouter();
  const { dados, erro } = useAdminComunidade();
  const [enviando, setEnviando] = useState(false);
  const hoje = hojeIso();

  useFocusEffect(
    useCallback(() => {
      recarregarAdmin();
    }, []),
  );

  const novaProposta = async () => {
    try {
      const pdf = await escolherPdf();
      if (!pdf) return;
      setEnviando(true);
      const p = await enviarPropostaPdf(pdf.base64);
      definirPrevia(p);
      await recarregarAdmin();
      router.push({ pathname: '/editar-proposta', params: { id: p.id } });
    } catch (e: any) {
      Alert.alert('Não foi possível ler o PDF', String(e?.message ?? e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Secao titulo="Proposta de oração da semana">
          <Linha
            titulo={enviando ? 'Lendo o PDF…' : 'Nova proposta (PDF)'}
            sub="Escolha o PDF do Material de Oração Pessoal. O app separa as seções; você confere e publica."
            icone="doc.badge.plus"
            direita={enviando ? <ActivityIndicator /> : undefined}
            onPress={enviando ? undefined : novaProposta}
          />
          {(dados?.propostas ?? []).slice(0, 12).map((p, i, l) => (
            <Linha
              key={p.id}
              titulo={p.titulo}
              sub={`${p.publicada ? 'Publicada' : 'Rascunho'}${p.inicio ? ` · ${semana(p)}` : ''}`}
              icone={p.publicada ? 'checkmark.seal' : 'pencil.circle'}
              onPress={() => {
                definirPrevia(p);
                router.push({ pathname: '/editar-proposta', params: { id: p.id } });
              }}
              ultimo={i === l.length - 1}
            />
          ))}
        </Secao>

        <Secao titulo="Jornadas de oração">
          {(dados?.jornadas ?? []).map((j) => {
            const p = periodo(j, hoje);
            return (
              <Linha
                key={j.id}
                titulo={j.titulo}
                sub={`${j.ativa ? '' : 'Desativada · '}${p ? `${dt(p.inicio)} a ${dt(p.fim)}` : 'sem data'}${j.anual ? ' · todo ano' : ''}${j.pronta ? '' : ' · sem textos'}`}
                icone="sparkles"
                onPress={() => router.push({ pathname: '/editar-jornada', params: { id: j.id } })}
              />
            );
          })}
          <Linha titulo="Nova jornada" icone="plus.circle" onPress={() => router.push('/editar-jornada')} ultimo />
        </Secao>

        <Secao titulo="Orações da Comunidade">
          {(dados?.oracoes ?? []).map((o) => (
            <Linha
              key={o.id}
              titulo={o.titulo}
              sub={o.ativa === false ? 'Desativada' : o.subtitulo ?? undefined}
              icone="hands.sparkles"
              onPress={() => router.push({ pathname: '/editar-oracao', params: { id: o.id } })}
            />
          ))}
          <Linha titulo="Nova oração" icone="plus.circle" onPress={() => router.push('/editar-oracao')} ultimo />
        </Secao>

        {erro ? (
          <Secao>
            <Aviso icone="wifi.slash" texto={erro} />
          </Secao>
        ) : !dados ? (
          <View style={{ padding: Espaco.xl }}>
            <ActivityIndicator />
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
