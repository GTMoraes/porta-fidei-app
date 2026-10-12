import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { apagarEvento, atualizar, salvarEvento, useServidor, type TipoEvento } from '@/servidor/api';
import { Espaco, Marca, usePaleta } from '@/tema';
import { Botao, Chave, Fundo, Linha, Secao, toque } from '@/ui/base';
import { Campo, CampoImagem } from '@/ui/Formulario';

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

  const salvar = async () => {
    setSalvando(true);
    try {
      const vezes = orig ? 1 : repetir + 1;
      for (let k = 0; k < vezes; k++) {
        const ini = new Date(inicio.getTime() + k * 7 * 86400_000);
        const fi = temFim ? new Date(fim.getTime() + k * 7 * 86400_000) : null;
        await salvarEvento({
          id: orig?.id,
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

        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={salvando ? 'Salvando…' : 'Publicar'} icone="checkmark" desativado={salvando || !titulo.trim()} onPress={salvar} />
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
