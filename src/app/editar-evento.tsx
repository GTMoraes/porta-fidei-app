import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { pegarPonto } from '@/estado/escolhaLocal';
import { apagarEvento, atualizar, locaisSalvos, salvarEvento, useServidor, type LocalSalvo, type TipoEvento } from '@/servidor/api';
import { Espaco, Marca, usePaleta } from '@/tema';
import { Botao, Chave, Fundo, Icone, Linha, Secao, toque } from '@/ui/base';
import { Campo, CampoImagem } from '@/ui/Formulario';
import { dataCurta, hora } from '@/util/datas';

const TIPOS: [TipoEvento, string][] = [
  ['missa', 'Missa'],
  ['evento', 'Evento'],
  ['formacao', 'Formação'],
  ['retiro', 'Retiro'],
  ['reuniao', 'Reunião'],
];

export default function EditarEvento() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const srv = useServidor();
  const router = useRouter();
  const c = usePaleta();
  const orig = srv.eventos.find((e) => e.id === id);

  const amanha19 = new Date();
  amanha19.setDate(amanha19.getDate() + 1);
  amanha19.setHours(19, 0, 0, 0);

  const [tipo, setTipo] = useState<TipoEvento>(orig?.tipo ?? 'missa');
  const [titulo, setTitulo] = useState(orig?.titulo ?? 'Santa Missa');
  const [inicio, setInicio] = useState(orig ? new Date(orig.inicio) : amanha19);
  const [temFim, setTemFim] = useState(!!orig?.fim);
  const [fim, setFim] = useState(orig?.fim ? new Date(orig.fim) : new Date(amanha19.getTime() + 3600_000));
  const [local, setLocal] = useState(orig?.local ?? '');
  const [descricao, setDescricao] = useState(orig?.descricao ?? '');
  const [imagem, setImagem] = useState<string | null>(orig?.imagem ?? null);
  const [repetir, setRepetir] = useState(0); // semanas
  const [salvando, setSalvando] = useState(false);
  // ponto no mapa (opcional)
  const [lat, setLat] = useState<number | null>(orig?.lat ?? null);
  const [lng, setLng] = useState<number | null>(orig?.lng ?? null);
  const [locais, setLocais] = useState<LocalSalvo[]>([]);
  // notificação (pré-preenchida; vira texto livre quando a pessoa edita)
  const [notificar, setNotificar] = useState(false);
  const [notifTitulo, setNotifTitulo] = useState<string | null>(null);
  const [notifTexto, setNotifTexto] = useState<string | null>(null);
  const [urgente, setUrgente] = useState(false);

  useEffect(() => {
    locaisSalvos().then(setLocais).catch(() => {});
  }, []);

  // volta da tela do mapa com o ponto escolhido
  useFocusEffect(
    useCallback(() => {
      const p = pegarPonto();
      if (!p) return;
      setLat(p.lat);
      setLng(p.lng);
      if (p.endereco) setLocal((l) => (l.trim() ? l : p.endereco!));
    }, []),
  );

  const linhaPadrao = () => {
    const d = dataCurta(inicio);
    const partes = [d.charAt(0).toUpperCase() + d.slice(1), hora(inicio), local.trim()].filter(Boolean);
    return partes.join(' · ') + (!orig && repetir ? ' · toda semana' : '');
  };
  const tituloNotif = notifTitulo ?? (orig ? `Mudança: ${titulo.trim()}` : titulo.trim());
  const textoNotif = notifTexto ?? linhaPadrao();
  const temPonto = lat != null && lng != null;

  const salvar = async () => {
    setSalvando(true);
    try {
      const vezes = orig ? 1 : repetir + 1;
      for (let k = 0; k < vezes; k++) {
        const ini = new Date(inicio.getTime() + k * 7 * 86400_000);
        const fi = temFim ? new Date(fim.getTime() + k * 7 * 86400_000) : null;
        await salvarEvento({
          id: orig?.id,
          lat: temPonto ? lat : null,
          lng: temPonto ? lng : null,
          // só a primeira data leva a notificação (missa repetida por semanas = uma notificação)
          notificacao: notificar && k === 0 && tituloNotif.trim() && textoNotif.trim() ? { titulo: tituloNotif.trim(), texto: textoNotif.trim(), urgente } : undefined,
          tipo,
          titulo: titulo.trim(),
          inicio: ini.toISOString(),
          fim: fi ? fi.toISOString() : null,
          local: local.trim() || null,
          descricao: descricao.trim() || null,
          imagem,
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
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.l }}>
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
          <Campo rotulo="Local" value={local} onChangeText={setLocal} placeholder="Ex.: Casa de Missão, Recife" />
          {locais.filter((l) => l.local !== local.trim()).length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: Espaco.l, paddingBottom: 8 }}>
              {locais
                .filter((l) => l.local !== local.trim())
                .map((l) => (
                  <Pressable
                    key={`${l.local}${l.lat}`}
                    onPress={() => {
                      toque();
                      setLocal(l.local);
                      setLat(l.lat);
                      setLng(l.lng);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
                    {l.lat != null ? <Icone nome="mappin" cor={c.destaque} tamanho={12} /> : null}
                    <Text style={{ color: c.textoSuave, fontSize: 14 }} numberOfLines={1}>
                      {l.local.length > 34 ? `${l.local.slice(0, 33)}…` : l.local}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
          ) : null}
          <Linha
            titulo={temPonto ? 'Marcado no mapa' : 'Marcar no mapa (opcional)'}
            sub={temPonto ? 'Abre no ponto exato no Apple Maps, Google Maps ou Waze' : 'Sem o mapa, o botão de mapa busca pelo texto do local'}
            icone={temPonto ? 'mappin.circle.fill' : 'mappin.and.ellipse'}
            corIcone={temPonto ? Marca.ouro : undefined}
            onPress={() =>
              router.push({ pathname: '/mapa-local', params: temPonto ? { lat: String(lat), lng: String(lng) } : { busca: local.trim() } })
            }
            direita={
              temPonto ? (
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Tem certeza?', 'O ponto será tirado do mapa. O texto do local continua.', [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Tirar do mapa',
                        style: 'destructive',
                        onPress: () => {
                          setLat(null);
                          setLng(null);
                        },
                      },
                    ])
                  }>
                  <Text style={{ color: c.textoFraco, fontSize: 14 }}>Tirar</Text>
                </Pressable>
              ) : undefined
            }
          />
          <Campo rotulo="Descrição" value={descricao} onChangeText={setDescricao} multiline placeholder="Detalhes, o que levar, contato…" />
          <CampoImagem url={imagem} mudar={setImagem} />
        </Secao>

        <Secao titulo="Quando">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Espaco.l }}>
            <Text style={{ color: c.texto, fontSize: 17 }}>Início</Text>
            <DateTimePicker value={inicio} mode="datetime" display="compact" locale="pt-BR" accentColor={Marca.ouro} themeVariant={c.escuro ? 'dark' : 'light'} onChange={(_e, d) => d && setInicio(d)} />
          </View>
          <Linha titulo="Informar horário de término" direita={<Chave valor={temFim} mudar={setTemFim} />} ultimo={!temFim} />
          {temFim ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Espaco.l }}>
              <Text style={{ color: c.texto, fontSize: 17 }}>Término</Text>
              <DateTimePicker value={fim} mode="datetime" display="compact" locale="pt-BR" accentColor={Marca.ouro} themeVariant={c.escuro ? 'dark' : 'light'} onChange={(_e, d) => d && setFim(d)} />
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

        <Secao titulo="Notificação">
          <Linha
            titulo={orig ? 'Avisar que mudou' : 'Notificar todos'}
            sub={notificar ? 'Sai para todos os membros ao publicar' : orig ? 'Para mudança de horário, local ou cancelamento' : 'Avisa os membros que a missa ou evento foi marcado'}
            direita={<Chave valor={notificar} mudar={setNotificar} />}
            ultimo={!notificar}
          />
          {notificar ? (
            <>
              <Campo rotulo="Título da notificação" value={tituloNotif} onChangeText={setNotifTitulo} />
              <Campo rotulo="Texto da notificação" value={textoNotif} onChangeText={setNotifTexto} multiline />
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

        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={salvando ? 'Salvando…' : notificar ? 'Publicar e notificar' : 'Publicar'} icone="checkmark" desativado={salvando || !titulo.trim()} onPress={salvar} />
          {orig ? (
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
