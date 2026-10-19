import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, Share, Text, View } from 'react-native';

import { arquivado, arquivar, remover, useArquivados } from '@/estado/arquivados';
import { useServidor } from '@/servidor/api';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Aviso as Caixa, Botao, Fundo, Secao, Vidro } from '@/ui/base';
import { BotoesLink, ImagemInteira, PlayerVideo, TextoComLinks } from '@/ui/Midia';
import { dataLonga } from '@/util/datas';

export default function TelaAviso() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const srv = useServidor();
  const router = useRouter();
  const c = usePaleta();
  const a = srv.avisos.find((x) => x.id === id);
  const arquivados = useArquivados();

  if (!a)
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Secao>
            <Caixa texto="Este aviso não existe mais." />
          </Secao>
        </ScrollView>
      </Fundo>
    );

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ margin: Espaco.l }}>
          <Vidro style={{ borderRadius: 28 }}>
            {a.imagem ? <ImagemInteira uri={a.imagem} /> : null}
            <View style={{ padding: Espaco.xl }}>
              <Text style={{ color: c.textoFraco, fontSize: 13 }}>
                {dataLonga(new Date(a.criado))}
                {a.atualizado && Date.parse(a.atualizado) - Date.parse(a.criado) > 60_000 ? ` · corrigido em ${dataLonga(new Date(a.atualizado))}` : ''}
              </Text>
              <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 27, marginTop: 6 }}>{a.titulo}</Text>
              <TextoComLinks texto={a.texto} style={{ color: c.texto, fontSize: 16.5, lineHeight: 24, marginTop: 14 }} />
            </View>
          </Vidro>
        </View>
        {a.video ? <PlayerVideo video={a.video} /> : null}
        <BotoesLink botoes={a.botoes} />
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 50 }}>
          {arquivado(arquivados, a) ? (
            <>
              <Botao titulo="Voltar para Avisos" icone="tray.and.arrow.up" tipo="secundario" onPress={() => arquivar(a, false)} />
              <Botao
                titulo="Remover deste iPhone"
                icone="trash"
                tipo="perigo"
                onPress={() =>
                  Alert.alert('Tem certeza?', 'O aviso some deste iPhone de vez. Para os outros membros nada muda.', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Remover',
                      style: 'destructive',
                      onPress: () => {
                        remover(a);
                        router.back();
                      },
                    },
                  ])
                }
              />
            </>
          ) : (
            <Botao
              titulo="Arquivar"
              icone="archivebox"
              tipo="secundario"
              onPress={() => {
                arquivar(a, true, srv.avisos);
                router.back();
              }}
            />
          )}
          <Botao titulo="Compartilhar" icone="square.and.arrow.up" tipo="secundario" onPress={() => Share.share({ message: `${a.titulo}\n\n${a.texto}${(a.botoes ?? []).map((b) => `\n\n${b.texto}: ${b.url}`).join('')}\n\nComunidade Católica Porta Fidei` })} />
          {srv.admin ? <Botao titulo="Editar" icone="pencil" tipo="secundario" onPress={() => router.push({ pathname: '/editar-aviso', params: { id: a.id } })} /> : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
