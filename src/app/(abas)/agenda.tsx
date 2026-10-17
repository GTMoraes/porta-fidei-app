import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { arquivar, chaveAviso, useArquivados } from '@/estado/arquivados';
import { atualizar, useServidor, type Aviso as AvisoT, type Evento } from '@/servidor/api';
import { Espaco, Fontes, Marca, usePaleta } from '@/tema';
import { Aviso, Fundo, Icone, Linha, Secao, TituloTela, toque, Vidro } from '@/ui/base';
import { dataLonga, hora } from '@/util/datas';

const NOME_TIPO: Record<string, string> = {
  missa: 'Missa',
  evento: 'Evento',
  formacao: 'Formação',
  retiro: 'Retiro',
  reuniao: 'Reunião',
};

export default function Agenda() {
  const c = usePaleta();
  const router = useRouter();
  const srv = useServidor();
  const [aba, setAba] = useState<'agenda' | 'avisos'>('agenda');

  const agora = Date.now();
  const futuros = srv.eventos
    .filter((e) => new Date(e.fim ?? e.inicio).getTime() >= agora - 3600_000)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const porDia = new Map<string, Evento[]>();
  for (const e of futuros) {
    const k = new Date(e.inicio).toDateString();
    porDia.set(k, [...(porDia.get(k) ?? []), e]);
  }
  const arquivados = useArquivados();
  const [verArquivados, setVerArquivados] = useState(false);
  const todos = [...srv.avisos].sort((a, b) => Number(!!b.fixado) - Number(!!a.fixado) || b.criado.localeCompare(a.criado));
  const avisos = todos.filter((a) => !arquivados.has(chaveAviso(a)));
  const guardados = todos.filter((a) => arquivados.has(chaveAviso(a)));

  return (
    <Fundo>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={srv.carregando} onRefresh={atualizar} tintColor={c.destaque} />}>
        <TituloTela titulo="Agenda" sobre="Missas, eventos e avisos" />

        <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
          <Vidro style={{ borderRadius: 22, flexDirection: 'row', padding: 4 }}>
            {(['agenda', 'avisos'] as const).map((a) => (
              <Pressable
                key={a}
                style={{ flex: 1 }}
                onPress={() => {
                  toque();
                  setAba(a);
                }}>
                <View style={{ paddingVertical: 9, borderRadius: 18, backgroundColor: aba === a ? (c.escuro ? 'rgba(222,190,130,0.22)' : 'rgba(188,140,68,0.22)') : 'transparent' }}>
                  <Text style={{ textAlign: 'center', color: aba === a ? c.texto : c.textoSuave, fontWeight: '600' }}>
                    {a === 'agenda' ? 'Missas e eventos' : 'Avisos'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Vidro>
        </View>

        {srv.admin ? (
          <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
            <BotaoMais texto="Missa ou evento" onPress={() => router.push('/editar-evento')} />
            <BotaoMais texto="Aviso" onPress={() => router.push('/editar-aviso')} />
          </View>
        ) : null}

        {srv.erro && !srv.atualizado ? (
          <Secao>
            <Aviso icone="wifi.slash" texto={`Não foi possível falar com o servidor da Comunidade (${srv.erro}). Puxe para baixo para tentar de novo.`} />
          </Secao>
        ) : null}

        {aba === 'agenda' ? (
          porDia.size ? (
            [...porDia.entries()].map(([k, lista]) => (
              <Secao key={k} titulo={dataLonga(new Date(lista[0].inicio))}>
                {lista.map((e, i) => (
                  <Linha
                    key={e.id}
                    titulo={e.titulo}
                    sub={`${hora(new Date(e.inicio))}${e.fim ? ` às ${hora(new Date(e.fim))}` : ''} · ${NOME_TIPO[e.tipo] ?? ''}${e.local ? ` · ${e.local}` : ''}`}
                    icone={e.tipo === 'missa' ? 'building.columns' : e.tipo === 'retiro' ? 'leaf' : e.tipo === 'formacao' ? 'graduationcap' : 'person.3'}
                    corIcone={e.tipo === 'missa' ? Marca.vinho : undefined}
                    onPress={() => router.push({ pathname: '/evento', params: { id: e.id } })}
                    ultimo={i === lista.length - 1}
                  />
                ))}
              </Secao>
            ))
          ) : (
            <Secao>
              <Aviso icone="calendar.badge.clock" texto="Nenhuma missa ou evento agendado por enquanto." />
            </Secao>
          )
        ) : (
          <>
            {avisos.length ? (
              avisos.map((a) => <CartaoAviso key={a.id} a={a} onArquivar={() => arquivar(a, true, srv.avisos)} />)
            ) : (
              <Secao>
                <Aviso icone="megaphone" texto={guardados.length ? 'Nenhum aviso novo.' : 'Nenhum aviso por enquanto.'} />
              </Secao>
            )}
            {guardados.length ? (
              <Secao>
                <Linha
                  titulo={`Arquivados (${guardados.length})`}
                  sub="Só neste aparelho"
                  icone={verArquivados ? 'chevron.up' : 'archivebox'}
                  onPress={() => setVerArquivados((v) => !v)}
                  ultimo={!verArquivados}
                />
                {verArquivados
                  ? guardados.map((a, i) => (
                      <Linha
                        key={a.id}
                        titulo={a.titulo}
                        sub={dataLonga(new Date(a.criado))}
                        direita={
                          <Pressable onPress={() => arquivar(a, false)} hitSlop={8}>
                            <Icone nome="tray.and.arrow.up" tamanho={18} />
                          </Pressable>
                        }
                        onPress={() => router.push({ pathname: '/aviso', params: { id: a.id } })}
                        ultimo={i === guardados.length - 1}
                      />
                    ))
                  : null}
              </Secao>
            ) : null}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}

function CartaoAviso({ a, onArquivar }: { a: AvisoT; onArquivar: () => void }) {
  const c = usePaleta();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push({ pathname: '/aviso', params: { id: a.id } })} style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
      <Vidro style={{ borderRadius: 24 }}>
        {a.imagem ? <Image source={{ uri: a.imagem }} style={{ height: 170 }} contentFit="cover" transition={200} /> : null}
        <View style={{ padding: Espaco.l }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {a.fixado ? <Icone nome="pin.fill" tamanho={13} /> : null}
            <Text style={{ color: c.textoFraco, fontSize: 12.5, flex: 1 }}>
              {dataLonga(new Date(a.criado))}
              {a.atualizado && Date.parse(a.atualizado) - Date.parse(a.criado) > 60_000 ? ' · corrigido' : ''}
            </Text>
            <Pressable
              onPress={() => {
                toque();
                onArquivar();
              }}
              hitSlop={10}>
              <Icone nome="archivebox" cor={c.textoFraco} tamanho={17} />
            </Pressable>
          </View>
          <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 21, marginTop: 4 }}>{a.titulo}</Text>
          <Text style={{ color: c.textoSuave, fontSize: 15, lineHeight: 21, marginTop: 6 }} numberOfLines={4}>
            {a.texto}
          </Text>
        </View>
      </Vidro>
    </Pressable>
  );
}

function BotaoMais({ texto, onPress }: { texto: string; onPress: () => void }) {
  const c = usePaleta();
  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={() => {
        toque();
        onPress();
      }}>
      <Vidro interativo style={{ borderRadius: 18 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 }}>
          <Icone nome="plus" tamanho={15} />
          <Text style={{ color: c.destaque, fontWeight: '600' }}>{texto}</Text>
        </View>
      </Vidro>
    </Pressable>
  );
}
