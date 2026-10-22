import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';

import { enviarImagem, enviarVideo, useServidor, type BotaoLink, type VideoMidia } from '@/servidor/api';
import { destinos, ehLinkDoApp, nomeDestino, type Destino } from '@/util/destinos';
import { Espaco, Marca, usePaleta } from '@/tema';
import { CampoTexto } from './BarraTeclado';
import { Icone, toque } from './base';
import { CapaVideo, ImagemInteira } from './Midia';

/** Campo de texto. `limite` mostra a contagem e `alerta` aparece quando ela passa do limite. */
export function Campo({ rotulo, limite, alerta, ...props }: TextInputProps & { rotulo: string; limite?: number; alerta?: string }) {
  const c = usePaleta();
  const n = typeof props.value === 'string' ? props.value.length : 0;
  const passou = limite != null && n > limite;
  return (
    <View style={{ paddingHorizontal: Espaco.l, paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: c.textoFraco, fontSize: 13 }}>{rotulo}</Text>
        {limite != null ? <Text style={{ color: passou ? '#D35400' : c.textoFraco, fontSize: 12.5, fontVariant: ['tabular-nums'] }}>{`${n}/${limite}`}</Text> : null}
      </View>
      <CampoTexto
        placeholderTextColor={c.textoFraco}
        {...props}
        style={[
          { color: c.texto, backgroundColor: c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 12, fontSize: 16 },
          props.multiline ? { minHeight: 110, textAlignVertical: 'top' } : null,
          passou ? { borderWidth: 1, borderColor: '#D35400' } : null,
        ]}
      />
      {passou && alerta ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'flex-start' }}>
          <Icone nome="exclamationmark.triangle" cor="#D35400" tamanho={13} />
          <Text style={{ color: '#D35400', fontSize: 13, lineHeight: 18, flex: 1 }}>{alerta}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Escolhe uma imagem da galeria (inteira, sem recorte), envia ao servidor e devolve a URL */
async function escolherImagem(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, base64: true });
  if (r.canceled || !r.assets[0]?.base64) return null;
  const a = r.assets[0];
  return enviarImagem(a.base64!, a.mimeType ?? 'image/jpeg');
}

function Retirar({ texto, aoConfirmar }: { texto: string; aoConfirmar: () => void }) {
  return (
    <Pressable
      onPress={() =>
        Alert.alert('Tem certeza?', texto, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Retirar', style: 'destructive', onPress: aoConfirmar },
        ])
      }
      hitSlop={6}
      style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 6 }}>
      <Icone nome="xmark" cor="#fff" tamanho={14} />
    </Pressable>
  );
}

function Vazio({ icone, texto, ocupado, onPress }: { icone: any; texto: string; ocupado?: boolean; onPress: () => void }) {
  const c = usePaleta();
  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado}
      style={{ height: 90, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.textoFraco, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {ocupado ? <ActivityIndicator color={c.destaque} /> : <Icone nome={icone} tamanho={24} />}
      <Text style={{ color: c.textoFraco, fontSize: 13 }}>{texto}</Text>
    </Pressable>
  );
}

export function CampoImagem({ url, mudar, rotulo = 'Imagem (opcional)' }: { url?: string | null; mudar: (u: string | null) => void; rotulo?: string }) {
  const c = usePaleta();
  const [enviando, setEnviando] = useState(false);
  const escolher = async () => {
    toque();
    setEnviando(true);
    try {
      const u = await escolherImagem();
      if (u) mudar(u);
    } catch (e: any) {
      Alert.alert('Não foi possível enviar a imagem', String(e?.message ?? e));
    } finally {
      setEnviando(false);
    }
  };
  return (
    <View style={{ paddingHorizontal: Espaco.l, paddingVertical: 10 }}>
      <Text style={{ color: c.textoFraco, fontSize: 13, marginBottom: 6 }}>{rotulo}</Text>
      {url ? (
        <View style={{ borderRadius: 14, overflow: 'hidden' }}>
          <ImagemInteira uri={url} />
          <Retirar texto="A imagem será retirada." aoConfirmar={() => mudar(null)} />
        </View>
      ) : (
        <Vazio icone="photo.badge.plus" texto="Escolher imagem" ocupado={enviando} onPress={escolher} />
      )}
    </View>
  );
}

/** Vídeo: escolhe na galeria (dá para cortar o trecho), envia e espera o servidor preparar.
 *  A capa é gerada sozinha; dá para trocar por uma imagem. */
export function CampoVideo({ video, mudar, aoOcupar }: { video?: VideoMidia | null; mudar: (v: VideoMidia | null) => void; aoOcupar?: (ocupado: boolean) => void }) {
  const c = usePaleta();
  const [fase, setFase] = useState<null | 'enviando' | 'preparando'>(null);
  const [fracao, setFracao] = useState(0);
  const [trocandoCapa, setTrocandoCapa] = useState(false);

  const escolher = async () => {
    toque();
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true, // permite cortar o trecho
      videoMaxDuration: 300,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
    });
    if (r.canceled || !r.assets[0]?.uri) return;
    setFase('enviando');
    setFracao(0);
    aoOcupar?.(true);
    try {
      const v = await enviarVideo(r.assets[0].uri, (f, x) => {
        setFase(f);
        setFracao(x);
      });
      mudar(v);
    } catch (e: any) {
      Alert.alert('Não foi possível enviar o vídeo', String(e?.message ?? e));
    } finally {
      setFase(null);
      aoOcupar?.(false);
    }
  };

  const trocarCapa = async () => {
    if (!video) return;
    toque();
    setTrocandoCapa(true);
    try {
      const u = await escolherImagem();
      if (u) mudar({ ...video, capa: u });
    } catch (e: any) {
      Alert.alert('Não foi possível enviar a capa', String(e?.message ?? e));
    } finally {
      setTrocandoCapa(false);
    }
  };

  return (
    <View style={{ paddingHorizontal: Espaco.l, paddingVertical: 10 }}>
      <Text style={{ color: c.textoFraco, fontSize: 13, marginBottom: 6 }}>Vídeo (opcional)</Text>
      {fase ? (
        <View style={{ borderRadius: 14, padding: Espaco.l, backgroundColor: c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', gap: 10 }}>
          <Text style={{ color: c.texto, fontSize: 15 }}>
            {fase === 'enviando' ? `Enviando o vídeo… ${Math.round(fracao * 100)}%` : 'Preparando o vídeo no servidor…'}
          </Text>
          {fase === 'enviando' ? (
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.separador, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${Math.round(fracao * 100)}%`, backgroundColor: Marca.ouro }} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator color={c.destaque} />
              <Text style={{ color: c.textoFraco, fontSize: 13, flex: 1 }}>Pode levar alguns minutos. Não feche esta tela.</Text>
            </View>
          )}
        </View>
      ) : video ? (
        <>
          <View style={{ borderRadius: 14, overflow: 'hidden' }}>
            <CapaVideo video={video} />
            <Retirar texto="O vídeo será retirado." aoConfirmar={() => mudar(null)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 18, marginTop: 10, alignItems: 'center' }}>
            <Pressable onPress={trocarCapa} disabled={trocandoCapa} hitSlop={6} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {trocandoCapa ? <ActivityIndicator color={c.destaque} /> : <Icone nome="photo" tamanho={15} />}
              <Text style={{ color: c.destaque, fontSize: 15 }}>{video.capa ? 'Trocar capa' : 'Escolher capa'}</Text>
            </Pressable>
            {video.capa ? (
              <Pressable onPress={() => mudar({ ...video, capa: null })} hitSlop={6} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Icone nome="arrow.counterclockwise" tamanho={15} />
                <Text style={{ color: c.destaque, fontSize: 15 }}>Capa automática</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : (
        <Vazio icone="video.badge.plus" texto="Escolher vídeo (até 5 min)" onPress={escolher} />
      )}
    </View>
  );
}

/** Botões de link (inscrição, formulário...). Pode não ter nenhum. */
export function CampoBotoes({ botoes, mudar }: { botoes: BotaoLink[]; mudar: (b: BotaoLink[]) => void }) {
  const c = usePaleta();
  const fundo = c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
  const alterar = (i: number, campo: keyof BotaoLink, v: string) => mudar(botoes.map((b, j) => (j === i ? { ...b, [campo]: v } : b)));
  const mover = (i: number, d: number) => {
    const n = [...botoes];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    mudar(n);
    // o modo "Tela do app" acompanha o botão
    setModoApp((m) => {
      const r = new Set<number>();
      for (const k of m) r.add(k === i ? i + d : k === i + d ? i : k);
      return r;
    });
  };
  const tirar = (i: number) => {
    mudar(botoes.filter((_, j) => j !== i));
    setModoApp((m) => {
      const r = new Set<number>();
      for (const k of m) if (k !== i) r.add(k > i ? k - 1 : k);
      return r;
    });
  };
  const srv = useServidor();
  const grupos = destinos(srv.eventos, srv.avisos, srv.comunidade);
  const [modoApp, setModoApp] = useState<Set<number>>(new Set());
  const [escolhendo, setEscolhendo] = useState<number | null>(null);
  const escolher = (d: Destino) => {
    if (escolhendo == null) return;
    toque();
    mudar(botoes.map((b, j) => (j === escolhendo ? { texto: b.texto.trim() ? b.texto : d.sugestao, url: d.link } : b)));
    setEscolhendo(null);
  };
  return (
    <View style={{ paddingHorizontal: Espaco.l, paddingVertical: 10, gap: 12 }}>
      {botoes.map((b, i) => (
        <View key={i} style={{ borderRadius: 14, padding: 10, gap: 8, borderWidth: 1, borderColor: c.separador }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={{ color: c.textoFraco, fontSize: 13, flex: 1 }}>{`Botão ${i + 1}`}</Text>
            {i > 0 ? (
              <Pressable onPress={() => mover(i, -1)} hitSlop={8}>
                <Icone nome="arrow.up" tamanho={16} />
              </Pressable>
            ) : null}
            {i < botoes.length - 1 ? (
              <Pressable onPress={() => mover(i, 1)} hitSlop={8}>
                <Icone nome="arrow.down" tamanho={16} />
              </Pressable>
            ) : null}
            <Pressable
              hitSlop={8}
              onPress={() =>
                b.texto.trim() || b.url.trim()
                  ? Alert.alert('Tem certeza?', 'Este botão será retirado.', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Retirar', style: 'destructive', onPress: () => tirar(i) },
                    ])
                  : tirar(i)
              }>
              <Icone nome="trash" cor="#C0392B" tamanho={16} />
            </Pressable>
          </View>
          <TextInput underlineColorAndroid="transparent" cursorColor="#BC8C44"
            value={b.texto}
            onChangeText={(v) => alterar(i, 'texto', v)}
            placeholder="Texto do botão (ex.: Fazer inscrição)"
            placeholderTextColor={c.textoFraco}
            maxLength={60}
            style={{ color: c.texto, backgroundColor: fundo, borderRadius: 10, padding: 10, fontSize: 16 }}
          />
          <View style={{ flexDirection: 'row', backgroundColor: fundo, borderRadius: 10, padding: 3 }}>
            {(['site', 'app'] as const).map((tipo) => {
              const ativo = (tipo === 'app') === (modoApp.has(i) || ehLinkDoApp(b.url));
              return (
                <Pressable
                  key={tipo}
                  onPress={() => {
                    toque();
                    if (tipo === 'app') {
                      setModoApp((m) => new Set(m).add(i));
                      if (!ehLinkDoApp(b.url)) alterar(i, 'url', '');
                    } else {
                      setModoApp((m) => {
                        const n = new Set(m);
                        n.delete(i);
                        return n;
                      });
                      if (ehLinkDoApp(b.url)) alterar(i, 'url', '');
                    }
                  }}
                  style={{ flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: ativo ? (c.escuro ? 'rgba(222,190,130,0.25)' : 'rgba(188,140,68,0.22)') : 'transparent' }}>
                  <Text style={{ textAlign: 'center', color: ativo ? c.texto : c.textoFraco, fontWeight: '600', fontSize: 14 }}>{tipo === 'site' ? 'Site' : 'Tela do app'}</Text>
                </Pressable>
              );
            })}
          </View>
          {modoApp.has(i) || ehLinkDoApp(b.url) ? (
            <Pressable onPress={() => setEscolhendo(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: fundo, borderRadius: 10, padding: 11 }}>
              <Icone nome="square.grid.2x2" tamanho={16} />
              <Text style={{ flex: 1, color: b.url ? c.texto : c.textoFraco, fontSize: 15 }}>{b.url ? nomeDestino(b.url, grupos) : 'Escolher a tela…'}</Text>
              <Icone nome="chevron.right" cor={c.textoFraco} tamanho={13} />
            </Pressable>
          ) : (
            <TextInput underlineColorAndroid="transparent" cursorColor="#BC8C44"
              value={b.url}
              onChangeText={(v) => alterar(i, 'url', v)}
              placeholder="Link (ex.: https://forms.gle/...)"
              placeholderTextColor={c.textoFraco}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{ color: c.texto, backgroundColor: fundo, borderRadius: 10, padding: 10, fontSize: 15 }}
            />
          )}
        </View>
      ))}
      <EscolherDestino grupos={grupos} aberto={escolhendo != null} fechar={() => setEscolhendo(null)} escolher={escolher} />
      <Pressable
        onPress={() => {
          toque();
          mudar([...botoes, { texto: '', url: '' }]);
        }}
        style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 6 }}>
        <Icone nome="plus.circle.fill" tamanho={20} />
        <Text style={{ color: c.destaque, fontSize: 16 }}>Adicionar botão</Text>
      </Pressable>
    </View>
  );
}

/** Lista das partes do app para escolher o destino de um botão (com busca) */
function EscolherDestino({ grupos, aberto, fechar, escolher }: { grupos: ReturnType<typeof destinos>; aberto: boolean; fechar: () => void; escolher: (d: Destino) => void }) {
  const c = usePaleta();
  const [busca, setBusca] = useState('');
  const sem = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = sem(busca.trim());
  const filtrados = grupos.map((g) => ({ ...g, itens: q ? g.itens.filter((i) => sem(`${g.titulo} ${i.rotulo}`).includes(q)) : g.itens })).filter((g) => g.itens.length);
  return (
    <Modal visible={aberto} animationType="slide" presentationStyle="pageSheet" onRequestClose={fechar}>
      <View style={{ flex: 1, backgroundColor: c.fundo[0] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: Espaco.l, paddingBottom: 8 }}>
          <Text style={{ flex: 1, color: c.texto, fontSize: 18, fontWeight: '600' }}>Para onde o botão leva</Text>
          <Pressable onPress={fechar} hitSlop={10}>
            <Text style={{ color: c.destaque, fontSize: 16 }}>Fechar</Text>
          </Pressable>
        </View>
        <TextInput underlineColorAndroid="transparent" cursorColor="#BC8C44"
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar (ex.: completas, dolorosos, avisos)"
          placeholderTextColor={c.textoFraco}
          autoCorrect={false}
          style={{ marginHorizontal: Espaco.l, marginBottom: 8, color: c.texto, backgroundColor: c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 10, fontSize: 16 }}
        />
        <ScrollView keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {filtrados.map((g) => (
            <View key={g.titulo} style={{ marginTop: 14 }}>
              <Text style={{ marginHorizontal: Espaco.l, marginBottom: 4, color: c.textoSuave, fontSize: 12.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{g.titulo}</Text>
              {g.itens.map((i) => (
                <Pressable key={i.link} onPress={() => escolher(i)} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: Espaco.l, opacity: pressed ? 0.5 : 1, borderBottomWidth: 0.5, borderBottomColor: c.separador })}>
                  <Text style={{ color: c.texto, fontSize: 16 }}>{i.rotulo}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Confere os botões antes de salvar: tira os vazios, completa "https://" e aponta o que está faltando.
 *  Devolve null (e já avisa a pessoa) quando algum botão está pela metade. */
export function botoesProntos(botoes: BotaoLink[]): BotaoLink[] | null {
  const prontos: BotaoLink[] = [];
  for (const [i, b] of botoes.entries()) {
    const texto = b.texto.trim();
    let url = b.url.trim();
    if (!texto && !url) continue;
    if (url && !/^(https?:\/\/|mailto:|tel:|portafidei:\/\/)/i.test(url) && /^[\w-]+(\.[\w-]+)+/.test(url)) url = `https://${url}`;
    if (!texto || !/^(https?:\/\/|mailto:|tel:|portafidei:\/\/)/i.test(url)) {
      Alert.alert('Botão incompleto', `O botão ${i + 1} precisa de um texto e de um link (um site começando com https:// ou uma tela do app).`);
      return null;
    }
    prontos.push({ texto, url });
  }
  return prontos;
}

export const AVISO_TITULO_NOTIF = 'No iPhone, o título da notificação tem uma linha só e o que passar disso é cortado. Deixe o título curto e use o texto para o resto.';
export const AVISO_TEXTO_NOTIF = 'Na tela de bloqueio aparecem umas 4 linhas; o resto só aparece quando a pessoa abre a notificação.';
