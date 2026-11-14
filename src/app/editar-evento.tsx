import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { pode, useConta } from '@/estado/conta';
import { apagarEvento, atualizar, cancelarEvento, descancelarEvento, reagendarEvento, salvarEvento, useServidor, type BotaoLink, type TipoEvento, type VideoMidia } from '@/servidor/api';
import { Espaco, Marca, usePaleta } from '@/tema';
import { Botao, Chave, Fundo, Linha, Secao, toque } from '@/ui/base';
import { CampoLocal, useLocalComMapa } from '@/ui/CampoLocal';
import { SeletorData } from '@/ui/Data';
import { AVISO_TEXTO_NOTIF, AVISO_TITULO_NOTIF, botoesProntos, Campo, CampoBotoes, CampoEscolha, CampoImagem, CampoVideo } from '@/ui/Formulario';
import { dataCurta, diaEHora, fimDoDia, hora } from '@/util/datas';

const TIPOS: [TipoEvento, string][] = [
  ['missa', 'Missa'],
  ['evento', 'Evento'],
  ['formacao', 'Formação'],
  ['retiro', 'Retiro'],
  ['reuniao', 'Reunião'],
];

export default function EditarEvento() {
  // data (AAAA-MM-DD): evento novo já nesse dia, às 19h (aberto por um dia da Agenda)
  const { id, data } = useLocalSearchParams<{ id?: string; data?: string }>();
  const srv = useServidor();
  const router = useRouter();
  const c = usePaleta();
  const orig = srv.eventos.find((e) => e.id === id);
  // notificar e publicar em Avisos: só quem tem "Avisos e notificações" (0.7.0; o servidor também confere).
  // A coordenação edita, cancela e reagenda; criar e apagar é de quem cuida da Agenda (0.7.1).
  const conta = useConta();
  const podeAvisar = pode(conta, 'avisos');
  const podeApagar = pode(conta, 'agenda');
  const comissoes = srv.comunidade?.comissoes ?? [];
  const [comissao, setComissao] = useState(orig?.comissao ?? '');
  // quem marcou interesse recebe um aviso só para essas pessoas quando o evento muda ou é cancelado
  const nInteressados = orig?.interessados ?? 0;
  const [avisarInteressados, setAvisarInteressados] = useState(true);

  const amanha19 = new Date();
  amanha19.setDate(amanha19.getDate() + 1);
  if (data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [a, m, d] = data.split('-').map(Number);
    amanha19.setFullYear(a, m - 1, d);
  }
  amanha19.setHours(19, 0, 0, 0);

  const [tipo, setTipo] = useState<TipoEvento>(orig?.tipo ?? 'missa');
  const [titulo, setTitulo] = useState(orig?.titulo ?? 'Santa Missa');
  const [inicio, setInicio] = useState(orig ? new Date(orig.inicio) : amanha19);
  const [temFim, setTemFim] = useState(!!orig?.fim);
  const [fim, setFim] = useState(orig?.fim ? new Date(orig.fim) : new Date((orig ? new Date(orig.inicio) : amanha19).getTime() + 3600_000));
  // mudar o início leva o término junto (mantém a duração): sem isso, quem trocava só a data do início
  // deixava o término no dia antigo e o evento sumia da Agenda (ela esconde o que já terminou)
  const mudarInicio = (d: Date) => {
    setFim((f) => new Date(f.getTime() + (d.getTime() - inicio.getTime())));
    setInicio(d);
  };
  const ligarFim = (v: boolean) => {
    if (v && fim.getTime() <= inicio.getTime()) setFim(new Date(inicio.getTime() + 3600_000));
    setTemFim(v);
  };
  // local, locais já usados e ponto no mapa (opcional)
  const lugar = useLocalComMapa({ local: orig?.local, lat: orig?.lat, lng: orig?.lng });
  const { local, lat, lng, temPonto } = lugar;
  const [descricao, setDescricao] = useState(orig?.descricao ?? '');
  const [imagem, setImagem] = useState<string | null>(orig?.imagem ?? null);
  const [video, setVideo] = useState<VideoMidia | null>(orig?.video ?? null);
  const [enviandoVideo, setEnviandoVideo] = useState(false);
  const [botoes, setBotoes] = useState<BotaoLink[]>(orig?.botoes ?? []);
  const [repetir, setRepetir] = useState(0); // semanas
  const [salvando, setSalvando] = useState(false);
  // notificação (pré-preenchida; vira texto livre quando a pessoa edita)
  const [notificar, setNotificar] = useState(false);
  const [notifTitulo, setNotifTitulo] = useState<string | null>(null);
  const [notifTexto, setNotifTexto] = useState<string | null>(null);
  const [urgente, setUrgente] = useState(false);
  const [publicarAviso, setPublicarAviso] = useState(false);
  const [fixarAviso, setFixarAviso] = useState(false);
  // o aviso que nasce da notificação vale até o fim do dia do evento (ou de hoje, se o evento já passou)
  const fimAviso = new Date(Math.max(fimDoDia(temFim ? fim : inicio).getTime(), fimDoDia().getTime()));
  const av = { publicarAviso, fixarAviso: publicarAviso && fixarAviso, avisoVenceEm: publicarAviso ? fimAviso.toISOString() : null };

  const linhaPadrao = () => {
    const d = dataCurta(inicio);
    const partes = [d.charAt(0).toUpperCase() + d.slice(1), hora(inicio), local.trim()].filter(Boolean);
    return partes.join(' · ') + (!orig && repetir ? ' · toda semana' : '');
  };
  const tituloNotif = notifTitulo ?? (orig ? `Mudança: ${titulo.trim()}` : titulo.trim());
  const textoNotif = notifTexto ?? linhaPadrao();

  // notificação de cancelar / reagendar / desfazer: o texto que a pessoa escreveu ou um automático com o prefixo certo
  const notifCom = (prefixo: string) => ({
    titulo: (notifTitulo ?? `${prefixo}: ${titulo.trim()}`).trim(),
    texto: textoNotif.trim(),
    urgente,
  });
  /** aviso só para quem marcou interesse (o servidor não manda se sair a notificação para todos) */
  const aviso = (prefixo: string) => ({
    ...av,
    avisarInteressados: orig && nInteressados && avisarInteressados ? { titulo: `${prefixo}: ${titulo.trim()}`, texto: linhaPadrao() } : undefined,
  });
  const perguntarNotificar = (prefixo: string, fazer: (n?: { titulo: string; texto: string; urgente: boolean }) => void) =>
    !podeAvisar ? fazer(undefined) : Alert.alert('Avisar os membros?', `Sai uma notificação para todos: "${notifCom(prefixo).titulo}".`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Sem notificação', onPress: () => fazer(undefined) },
      { text: publicarAviso ? 'Notificar e publicar em Avisos' : 'Notificar', onPress: () => fazer(notifCom(prefixo)) },
    ]);
  const executar = async (acao: () => Promise<unknown>) => {
    setSalvando(true);
    try {
      await acao();
      await atualizar();
      router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setSalvando(false);
    }
  };
  const cancelar = () => {
    if (!orig) return;
    Alert.alert('Cancelar esta missa ou evento?', 'Pode ficar na agenda marcado como CANCELADO ou sumir dela como se nada tivesse acontecido.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Só retirar da agenda', style: 'destructive', onPress: () => perguntarNotificar('Cancelado', (n) => executar(() => cancelarEvento(orig.id, false, n, aviso('Cancelado')))) },
      { text: 'Mostrar como CANCELADO', onPress: () => perguntarNotificar('Cancelado', (n) => executar(() => cancelarEvento(orig.id, true, n, aviso('Cancelado')))) },
    ]);
  };
  const desfazerCancelamento = () => {
    if (!orig) return;
    Alert.alert('Tem certeza?', 'O evento volta a aparecer normalmente na agenda.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Desfazer cancelamento', onPress: () => perguntarNotificar('Confirmado', (n) => executar(() => descancelarEvento(orig.id, n, aviso('Confirmado')))) },
    ]);
  };

  const dados = (bts: BotaoLink[]) => ({
    lat: temPonto ? lat : null,
    lng: temPonto ? lng : null,
    tipo,
    titulo: titulo.trim(),
    local: local.trim() || null,
    descricao: descricao.trim() || null,
    imagem,
    video,
    botoes: bts,
    comissao: comissao || null,
  });

  const salvar = async () => {
    if (temFim && fim.getTime() <= inicio.getTime()) {
      Alert.alert('Confira o horário', 'O término precisa ser depois do início.');
      return;
    }
    const bts = botoesProntos(botoes);
    if (!bts) return;
    // mudou a data ou a hora de um evento que já existia: perguntar se é para sinalizar o reagendamento
    if (orig && orig.situacao !== 'cancelado' && new Date(orig.inicio).getTime() !== inicio.getTime()) {
      Alert.alert('Sinalizar o reagendamento?', 'Com a sinalização, a data antiga fica na agenda marcada como REAGENDADO, indicando a nova data. Sem ela, o evento só muda de data.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Só mudar a data', onPress: () => gravar(bts) },
        {
          text: 'Sinalizar REAGENDADO',
          onPress: () =>
            executar(() =>
              reagendarEvento(orig.id, {
                ...dados(bts),
                inicio: inicio.toISOString(),
                fim: temFim ? fim.toISOString() : null,
                notificacao: notificar && textoNotif.trim() ? notifCom('Reagendado') : undefined,
                ...aviso('Reagendado'),
              }),
            ),
        },
      ]);
      return;
    }
    gravar(bts);
  };

  const mudouQuandoOnde =
    !!orig &&
    (new Date(orig.inicio).getTime() !== inicio.getTime() ||
      (orig.fim ? new Date(orig.fim).getTime() : null) !== (temFim ? fim.getTime() : null) ||
      (orig.local ?? '').trim() !== local.trim());
  const gravar = async (bts: BotaoLink[]) => {
    setSalvando(true);
    try {
      const vezes = orig ? 1 : repetir + 1;
      for (let k = 0; k < vezes; k++) {
        const ini = new Date(inicio.getTime() + k * 7 * 86400_000);
        const fi = temFim ? new Date(fim.getTime() + k * 7 * 86400_000) : null;
        await salvarEvento({
          id: orig?.id,
          ...dados(bts),
          // só a primeira data leva a notificação (missa repetida por semanas = uma notificação)
          notificacao: notificar && k === 0 && tituloNotif.trim() && textoNotif.trim() ? { titulo: tituloNotif.trim(), texto: textoNotif.trim(), urgente } : undefined,
          // os interessados só são avisados quando muda o dia, o horário ou o local
          ...(k === 0 ? (mudouQuandoOnde ? aviso('Mudança') : av) : {}),
          inicio: ini.toISOString(),
          fim: fi ? fi.toISOString() : null,
        });
      }
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
      <ScrollView keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Secao titulo="Tipo">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: Espaco.l }}>
            {TIPOS.map(([v, n]) => (
              <Pressable
                key={v}
                onPress={() => {
                  toque();
                  setTipo(v);
                  if (v === 'missa' && !titulo) setTitulo('Santa Missa');
                }}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: tipo === v ? Marca.ouro : c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
                <Text style={{ color: tipo === v ? '#fff' : c.textoSuave, fontWeight: '600' }}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </Secao>

        <Secao titulo="Informações">
          <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} />
          {comissoes.length ? (
            <CampoEscolha
              rotulo="Comissão responsável (opcional; os membros dela veem quem marcou interesse)"
              valor={comissao}
              valores={[['', 'Nenhuma'] as [string, string], ...comissoes.map((cm) => [cm.id, cm.nome] as [string, string])]}
              mudar={setComissao}
            />
          ) : null}
          <CampoLocal s={lugar} />
          <Campo rotulo="Descrição" value={descricao} onChangeText={setDescricao} multiline placeholder="Detalhes, o que levar, contato…" />
          <CampoImagem url={imagem} mudar={setImagem} />
          <CampoVideo video={video} mudar={setVideo} aoOcupar={setEnviandoVideo} />
        </Secao>

        <Secao titulo="Botões">
          <CampoBotoes botoes={botoes} mudar={setBotoes} />
        </Secao>

        <Secao titulo="Quando">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Espaco.l }}>
            <Text style={{ color: c.texto, fontSize: 17 }}>Início</Text>
            <SeletorData valor={inicio} modo="datetime" mudar={mudarInicio} />
          </View>
          <Linha titulo="Informar horário de término" direita={<Chave valor={temFim} mudar={ligarFim} />} ultimo={!temFim} />
          {temFim ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Espaco.l }}>
              <Text style={{ color: c.texto, fontSize: 17 }}>Término</Text>
              <SeletorData valor={fim} minimo={inicio} modo="datetime" mudar={setFim} />
            </View>
          ) : null}
          {!orig ? (
            <Linha
              titulo="Repetir toda semana"
              sub={repetir ? `Cria mais ${repetir} ${repetir === 1 ? 'semana' : 'semanas'}` : 'Só esta data'}
              direita={
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <Pressable onPress={() => setRepetir((r) => Math.max(0, r - 1))} hitSlop={8}>
                    <Text style={{ color: c.destaque, fontSize: 22 }}>−</Text>
                  </Pressable>
                  <Pressable onPress={() => setRepetir((r) => Math.min(26, r + 1))} hitSlop={8}>
                    <Text style={{ color: c.destaque, fontSize: 22 }}>+</Text>
                  </Pressable>
                </View>
              }
              ultimo
            />
          ) : null}
        </Secao>

        {podeAvisar ? (
        <Secao titulo="Notificação">
          <Linha
            titulo={orig ? 'Avisar que mudou' : 'Notificar todos'}
            sub={notificar ? 'Sai para todos os membros ao publicar' : orig ? 'Para mudança de horário, local ou cancelamento' : 'Avisa os membros que a missa ou evento foi marcado'}
            direita={<Chave valor={notificar} mudar={setNotificar} />}
            ultimo={!notificar}
          />
          {notificar ? (
            <>
              <Campo rotulo="Título da notificação" value={tituloNotif} onChangeText={setNotifTitulo} limite={35} alerta={AVISO_TITULO_NOTIF} />
              <Campo rotulo="Texto da notificação" value={textoNotif} onChangeText={setNotifTexto} multiline limite={170} alerta={AVISO_TEXTO_NOTIF} />
              {notifTitulo !== null || notifTexto !== null ? (
                <Linha
                  titulo="Voltar ao texto automático"
                  icone="arrow.counterclockwise"
                  onPress={() => {
                    setNotifTitulo(null);
                    setNotifTexto(null);
                  }}
                  seta={false}
                />
              ) : null}
              <Linha
                titulo="Também publicar em Avisos"
                sub={
                  publicarAviso
                    ? `O título e o texto da notificação viram um aviso, com o botão "Ver evento". Vale até ${diaEHora(fimAviso)} (fim do dia do evento); depois fica como "Encerrado".`
                    : 'A notificação fica só na central de notificações'
                }
                icone="megaphone"
                direita={<Chave valor={publicarAviso} mudar={setPublicarAviso} />}
              />
              {publicarAviso ? <Linha titulo="Fixar no topo" icone="pin" direita={<Chave valor={fixarAviso} mudar={setFixarAviso} />} /> : null}
              <Linha
                titulo="Urgente"
                sub="Passa por cima do Foco (Dormir, Trabalho…). Use só quando for importante, como missa cancelada ou mudança em cima da hora."
                icone="exclamationmark.triangle"
                corIcone={urgente ? '#C0392B' : undefined}
                direita={<Chave valor={urgente} mudar={setUrgente} />}
                ultimo
              />
            </>
          ) : null}
        </Secao>
        ) : null}

        {orig && nInteressados ? (
          <Secao titulo="Quem marcou interesse">
            <Linha
              titulo={`Avisar ${nInteressados === 1 ? 'a pessoa que marcou' : `as ${nInteressados} pessoas que marcaram`} interesse`}
              sub="Se o evento mudar, for reagendado ou cancelado, só elas recebem a notificação (a não ser que saia uma para todos)"
              direita={<Chave valor={avisarInteressados} mudar={setAvisarInteressados} />}
              ultimo
            />
          </Secao>
        ) : null}

        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={salvando ? 'Salvando…' : notificar ? 'Publicar e notificar' : 'Publicar'} icone="checkmark" desativado={salvando || enviandoVideo || !titulo.trim()} onPress={salvar} />
          {orig && orig.situacao === 'cancelado' ? (
            <Botao titulo="Desfazer cancelamento" icone="arrow.uturn.backward" tipo="secundario" desativado={salvando} onPress={desfazerCancelamento} />
          ) : orig ? (
            <Botao titulo="Cancelar evento" icone="xmark.circle" tipo="secundario" desativado={salvando} onPress={cancelar} />
          ) : null}
          {orig && podeApagar ? (
            <Botao
              titulo="Apagar"
              tipo="perigo"
              icone="trash"
              onPress={() =>
                Alert.alert('Tem certeza?', 'Este evento será apagado para todos os membros.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await apagarEvento(orig.id);
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
