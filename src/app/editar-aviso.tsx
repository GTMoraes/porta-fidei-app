import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { apagarAviso, atualizar, notificarTodos, salvarAviso, useServidor, type BotaoLink, type VideoMidia } from '@/servidor/api';
import { Espaco } from '@/tema';
import { Aviso, Botao, Chave, Fundo, Linha, Secao } from '@/ui/base';
import { AVISO_TEXTO_NOTIF, AVISO_TITULO_NOTIF, botoesProntos, Campo, CampoBotoes, CampoImagem, CampoVideo } from '@/ui/Formulario';

export default function EditarAviso() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const srv = useServidor();
  const router = useRouter();
  const orig = srv.avisos.find((a) => a.id === id);

  const [titulo, setTitulo] = useState(orig?.titulo ?? '');
  const [texto, setTexto] = useState(orig?.texto ?? '');
  const [imagem, setImagem] = useState<string | null>(orig?.imagem ?? null);
  const [video, setVideo] = useState<VideoMidia | null>(orig?.video ?? null);
  const [enviandoVideo, setEnviandoVideo] = useState(false);
  const [botoes, setBotoes] = useState<BotaoLink[]>(orig?.botoes ?? []);
  const [fixado, setFixado] = useState(!!orig?.fixado);
  const [notificar, setNotificar] = useState(!orig);
  const [guardar, setGuardar] = useState(true); // false: só a notificação, sem aparecer em Avisos
  const [salvando, setSalvando] = useState(false);
  const [urgente, setUrgente] = useState(false);

  const soNotificacao = !orig && !guardar;
  const vaiNotificarJa = notificar || soNotificacao;
  const salvar = async () => {
    const bts = soNotificacao ? [] : botoesProntos(botoes);
    if (!bts) return;
    setSalvando(true);
    try {
      const vaiNotificar = notificar || (!orig && !guardar);
      if (!orig && !guardar) await notificarTodos(titulo.trim(), texto.trim(), urgente);
      else await salvarAviso({ id: orig?.id, titulo: titulo.trim(), texto: texto.trim(), imagem, video, botoes: bts, fixado, notificar, urgente: vaiNotificar && urgente });
      await atualizar();
      router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Fundo>
      <ScrollView keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Secao titulo="Aviso">
          <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} limite={vaiNotificarJa ? 35 : undefined} alerta={AVISO_TITULO_NOTIF} />
          <Campo rotulo="Texto" value={texto} onChangeText={setTexto} multiline limite={soNotificacao ? 170 : undefined} alerta={AVISO_TEXTO_NOTIF} />
          {guardar || orig ? <CampoImagem url={imagem} mudar={setImagem} /> : null}
          {guardar || orig ? <CampoVideo video={video} mudar={setVideo} aoOcupar={setEnviandoVideo} /> : null}
        </Secao>
        {guardar || orig ? (
          <Secao titulo="Botões">
            <CampoBotoes botoes={botoes} mudar={setBotoes} />
          </Secao>
        ) : null}
        <Secao titulo="Opções">
          {!orig ? (
            <Linha
              titulo="Guardar em Avisos"
              sub={guardar ? 'Fica na lista de Avisos do app' : 'Só a notificação: não aparece em Avisos'}
              direita={<Chave valor={guardar} mudar={(v) => (setGuardar(v), !v && setNotificar(true))} />}
            />
          ) : null}
          {guardar || orig ? <Linha titulo="Fixar no topo" direita={<Chave valor={fixado} mudar={setFixado} />} /> : null}
          <Linha
            titulo={orig ? 'Notificar de novo' : 'Notificar os membros'}
            sub={
              orig
                ? 'Manda a notificação outra vez, com o texto corrigido'
                : 'Envia uma notificação para todos os aparelhos'
            }
            direita={<Chave valor={notificar || (!orig && !guardar)} mudar={(v) => (orig || guardar) && setNotificar(v)} />}
            ultimo={!(notificar || (!orig && !guardar))}
          />
          {notificar || (!orig && !guardar) ? (
            <Linha
              titulo="Urgente"
              sub="Passa por cima do Foco (Dormir, Trabalho…). Use só quando for importante, como missa cancelada ou mudança em cima da hora."
              icone="exclamationmark.triangle"
              corIcone={urgente ? '#C0392B' : undefined}
              direita={<Chave valor={urgente} mudar={setUrgente} />}
              ultimo
            />
          ) : null}
        </Secao>
        {orig ? (
          <Secao>
            <Aviso icone="arrow.triangle.2.circlepath" texto="A correção substitui o aviso no app de todos, que passa a mostrar “corrigido”. Quem tinha arquivado volta a ver o aviso." />
          </Secao>
        ) : null}
        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao
            titulo={salvando ? 'Enviando…' : !orig && !guardar ? 'Enviar notificação' : orig ? 'Salvar correção' : 'Publicar'}
            icone="paperplane"
            desativado={salvando || enviandoVideo || !titulo.trim() || !texto.trim()}
            onPress={salvar}
          />
          {orig ? (
            <Botao
              titulo="Apagar"
              tipo="perigo"
              icone="trash"
              onPress={() =>
                Alert.alert('Tem certeza?', 'O aviso some da tela de Avisos de todos os membros. A notificação que já chegou continua na central de notificações do iPhone, mas ao tocar nela o app diz que o aviso não existe mais.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await apagarAviso(orig.id);
                        await atualizar();
                        router.back();
                      } catch (e: any) {
                        Alert.alert('Erro', String(e?.message ?? e));
                      }
                    },
                  },
                ])
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </Fundo>
  );
}
