// Editar jornada de oração: datas, aviso diário e textos (digitados ou tirados de um PDF)

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { recarregarAdmin, useAdminComunidade } from '@/comunidade/admin';
import { escolherPdf } from '@/comunidade/pdf';
import { hojeIso } from '@/liturgia/calendario';
import { apagarJornada, jornadaDoPdf, salvarJornada, type Jornada } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Botao, Chave, Fundo, Linha, Secao, toque } from '@/ui/base';
import { CampoData } from '@/ui/Data';
import { Campo } from '@/ui/Formulario';

export default function EditarJornada() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const c = usePaleta();
  const { dados } = useAdminComunidade();
  const orig = dados?.jornadas.find((j) => j.id === id);

  const [titulo, setTitulo] = useState(orig?.titulo ?? '');
  const [descricao, setDescricao] = useState(orig?.descricao ?? '');
  const [temData, setTemData] = useState(!!orig?.inicioBase || !orig);
  const [inicio, setInicio] = useState(orig?.inicioBase ?? hojeIso());
  const [dias, setDias] = useState(orig?.dias ?? 9);
  const [anual, setAnual] = useState(orig?.anual ?? false);
  const [ativa, setAtiva] = useState(orig?.ativa ?? true);
  const [hora, setHora] = useState(orig?.hora ?? '07:00');
  const [comum, setComum] = useState(orig?.comum ?? '');
  const [textos, setTextos] = useState<string[]>(orig?.textos ?? []);
  const [verTextos, setVerTextos] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const fixo = orig?.arquivo || orig?.oracao; // Quaresma (pacote) e Cerco (oração da Comunidade)

  const doPdf = async () => {
    try {
      const pdf = await escolherPdf();
      if (!pdf) return;
      setLendo(true);
      const r = await jornadaDoPdf(pdf.base64);
      setComum(r.comum);
      setTextos(r.textos);
      if (r.textos.length) setDias(Math.max(dias, r.textos.length));
      setVerTextos(true);
      Alert.alert('PDF lido', `${r.textos.length ? `${r.textos.length} dias encontrados` : 'Nenhum “1º dia” encontrado: tudo ficou como texto de todos os dias'}. Confira antes de salvar.`);
    } catch (e: any) {
      Alert.alert('Não foi possível ler o PDF', String(e?.message ?? e));
    } finally {
      setLendo(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const j: Partial<Jornada> = {
        ...orig,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        inicioBase: temData ? inicio : null,
        dias,
        anual: temData && anual,
        ativa,
        hora,
        comum,
        textos: textos.slice(0, dias),
      };
      await salvarJornada(j);
      await recarregarAdmin();
      router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setSalvando(false);
    }
  };

  const Contador = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Text onPress={() => (toque(), setDias((d) => Math.max(1, d - 1)))} style={{ color: c.destaque, fontSize: 24, paddingHorizontal: 6 }}>
        −
      </Text>
      <Text style={{ color: c.texto, fontSize: 17, minWidth: 24, textAlign: 'center' }}>{dias}</Text>
      <Text onPress={() => (toque(), setDias((d) => Math.min(60, d + 1)))} style={{ color: c.destaque, fontSize: 24, paddingHorizontal: 6 }}>
        +
      </Text>
    </View>
  );

  return (
    <Fundo>
      <ScrollView keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Secao titulo="Jornada">
          <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} />
          <Campo rotulo="Descrição (opcional)" value={descricao} onChangeText={setDescricao} multiline />
        </Secao>

        <Secao titulo="Quando">
          <Linha titulo="Data de início marcada" direita={<Chave valor={temData} mudar={setTemData} />} />
          {temData ? <CampoData rotulo="Primeiro dia" valor={inicio} mudar={setInicio} /> : null}
          <Linha titulo="Duração (dias)" direita={<Contador />} />
          {temData ? <Linha titulo="Repetir todo ano" sub="Mesma data a cada ano (novenas dos baluartes)" direita={<Chave valor={anual} mudar={setAnual} />} /> : null}
          <CampoData rotulo="Aviso diário às" valor={hora} mudar={setHora} modo="time" />
          <Linha titulo="Ativa" sub="Desativada, some do app e não envia avisos" direita={<Chave valor={ativa} mudar={setAtiva} />} ultimo />
        </Secao>

        {fixo ? (
          <Secao titulo="Textos">
            <Aviso texto={orig?.arquivo ? 'O texto vem do conteúdo litúrgico e é o mesmo todos os dias.' : 'O texto é a oração da Comunidade de mesmo nome (edite em Orações da Comunidade).'} />
          </Secao>
        ) : (
          <Secao titulo="Textos">
            <Linha
              titulo={lendo ? 'Lendo o PDF…' : 'Carregar textos de um PDF'}
              sub="Separa “1º dia”, “Primeiro dia” ou “Dia 1”; o que vem antes vale para todos os dias"
              icone="doc.badge.plus"
              direita={lendo ? <ActivityIndicator /> : undefined}
              onPress={lendo ? undefined : doPdf}
            />
            <Linha
              titulo={verTextos ? 'Esconder os textos' : 'Ver e editar os textos'}
              sub={`${comum.trim() ? 'Texto de todos os dias + ' : ''}${textos.filter((t) => t?.trim()).length} de ${dias} dias`}
              icone={verTextos ? 'chevron.up' : 'text.alignleft'}
              onPress={() => setVerTextos((v) => !v)}
              ultimo={!verTextos}
            />
            {verTextos ? (
              <View>
                <Campo rotulo="Todos os dias (antes do texto do dia)" value={comum} onChangeText={setComum} multiline />
                {Array.from({ length: dias }, (_, i) => (
                  <Campo
                    key={i}
                    rotulo={`${i + 1}º dia`}
                    value={textos[i] ?? ''}
                    multiline
                    onChangeText={(t) =>
                      setTextos((l) => {
                        const n = [...l];
                        while (n.length <= i) n.push('');
                        n[i] = t;
                        return n;
                      })
                    }
                  />
                ))}
              </View>
            ) : null}
          </Secao>
        )}

        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={salvando ? 'Salvando…' : 'Salvar'} icone="checkmark" desativado={salvando || !titulo.trim()} onPress={salvar} />
          {orig ? (
            <Botao
              titulo="Apagar"
              tipo="perigo"
              icone="trash"
              onPress={() =>
                Alert.alert('Tem certeza?', 'Esta jornada será apagada para todos os membros.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await apagarJornada(orig.id);
                        await recarregarAdmin();
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
