import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, Share, Text, View } from 'react-native';

import { arquivado, arquivar, remover, useArquivados } from '@/estado/arquivados';
import { atualizar, encerrado, encerrarAvisos, useServidor } from '@/servidor/api';
import { Espaco, Fontes, usePaleta } from '@/tema';
import { Aviso as Caixa, Botao, Fundo, Icone, Secao, Vidro } from '@/ui/base';
import { BotoesLink, ImagemInteira, PlayerVideo, TextoComLinks } from '@/ui/Midia';
import { dataLonga, diaEHora } from '@/util/datas';
import { ehLinkDoApp } from '@/util/destinos';
import { APARELHO } from '@/util/plataforma';

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

  const fim = encerrado(a);
  const confirmarRemover = () =>
    Alert.alert('Tem certeza?', `O aviso some deste ${APARELHO} de vez. Para os outros membros nada muda.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          remover(a);
          router.back();
        },
      },
    ]);
  const encerrarParaTodos = (reativar: boolean) => {
    const fazer = async () => {
      try {
        await encerrarAvisos([a.id], reativar);
        await atualizar();
      } catch (e: any) {
        Alert.alert('Não foi possível', String(e?.message ?? e));
      }
    };
    if (reativar) return fazer();
    Alert.alert('Tem certeza?', 'O aviso sai do topo e da lista de Avisos de todos e fica guardado como "Encerrado". Dá para reativar depois.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: fazer },
    ]);
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {fim ? (
          // quem abre uma notificação antiga sabe na hora que aquilo já passou
          <View style={{ marginHorizontal: Espaco.l, marginTop: Espaco.l, padding: Espaco.l, borderRadius: 18, backgroundColor: c.escuro ? 'rgba(229,138,134,0.16)' : 'rgba(163,38,42,0.10)', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icone nome="clock.arrow.circlepath" cor={c.rubrica} tamanho={20} />
            <Text style={{ color: c.texto, fontSize: 15.5, lineHeight: 21, flex: 1 }}>
              Este aviso foi encerrado em {diaEHora(new Date(a.venceEm!))}.
            </Text>
          </View>
        ) : null}
        <View style={{ margin: Espaco.l }}>
          <Vidro style={{ borderRadius: 28 }}>
            {a.imagem ? <ImagemInteira uri={a.imagem} /> : null}
            <View style={{ padding: Espaco.xl }}>
              <Text style={{ color: c.textoFraco, fontSize: 13 }}>
                {dataLonga(new Date(a.criado))}
                {a.atualizado && Date.parse(a.atualizado) - Date.parse(a.criado) > 60_000 ? ` · corrigido em ${dataLonga(new Date(a.atualizado))}` : ''}
                {a.venceEm && !fim ? ` · vale até ${diaEHora(new Date(a.venceEm))}` : ''}
              </Text>
              <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 27, marginTop: 6 }}>{a.titulo}</Text>
              <TextoComLinks texto={a.texto} style={{ color: c.texto, fontSize: 16.5, lineHeight: 24, marginTop: 14 }} />
            </View>
          </Vidro>
        </View>
        {a.video ? <PlayerVideo video={a.video} /> : null}
        <BotoesLink botoes={a.botoes} />
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 50 }}>
          {fim ? (
            <Botao titulo={`Remover deste ${APARELHO}`} icone="trash" tipo="perigo" onPress={confirmarRemover} />
          ) : arquivado(arquivados, a) ? (
            <>
              <Botao titulo="Voltar para Avisos" icone="tray.and.arrow.up" tipo="secundario" onPress={() => arquivar(a, false)} />
              <Botao
                titulo={`Remover deste ${APARELHO}`}
                icone="trash"
                tipo="perigo"
                onPress={() =>
                  Alert.alert('Tem certeza?', `O aviso some deste ${APARELHO} de vez. Para os outros membros nada muda.`, [
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
          <Botao titulo="Compartilhar" icone="square.and.arrow.up" tipo="secundario" onPress={() => Share.share({ message: `${a.titulo}\n\n${a.texto}${(a.botoes ?? []).filter((b) => !ehLinkDoApp(b.url)).map((b) => `\n\n${b.texto}: ${b.url}`).join('')}\n\nComunidade Católica Porta Fidei` })} />
          {srv.admin ? <Botao titulo="Editar" icone="pencil" tipo="secundario" onPress={() => router.push({ pathname: '/editar-aviso', params: { id: a.id } })} /> : null}
          {srv.admin ? (
            <Botao
              titulo={fim ? 'Reativar para todos' : 'Encerrar para todos'}
              icone={fim ? 'arrow.uturn.backward' : 'archivebox'}
              tipo="secundario"
              onPress={() => encerrarParaTodos(fim)}
            />
          ) : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
