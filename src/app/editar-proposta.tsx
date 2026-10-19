// Conferir e publicar a Proposta de oração (rascunho criado a partir do PDF)

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { recarregarAdmin, useAdminComunidade } from '@/comunidade/admin';
import { definirPrevia, lerPrevia } from '@/comunidade/previa';
import { hojeIso, somaDias } from '@/liturgia/calendario';
import { anexarPdfProposta, apagarProposta, salvarProposta, type SecaoProposta } from '@/servidor/api';
import { escolherPdf } from '@/comunidade/pdf';
import { Espaco } from '@/tema';
import { Aviso, Botao, Chave, Fundo, Linha, Secao } from '@/ui/base';
import { CampoData } from '@/ui/Data';
import { Campo } from '@/ui/Formulario';

export default function EditarProposta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dados } = useAdminComunidade();
  const orig = lerPrevia(id) ?? dados?.propostas.find((p) => p.id === id);

  const [titulo, setTitulo] = useState(orig?.titulo ?? '');
  const [inicio, setInicio] = useState(orig?.inicio ?? hojeIso());
  const [fim, setFim] = useState(orig?.fim ?? somaDias(orig?.inicio ?? hojeIso(), 6));
  const [secoes, setSecoes] = useState<SecaoProposta[]>(orig?.secoes ?? []);
  const [publicada, setPublicada] = useState(true);
  const [notificar, setNotificar] = useState(!orig?.publicada);
  const [aberta, setAberta] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!orig)
    return (
      <Fundo>
        <ScrollView keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
          <Secao>
            <Aviso texto="Proposta não encontrada." />
          </Secao>
        </ScrollView>
      </Fundo>
    );

  const atual = () => ({ ...orig, titulo: titulo.trim(), inicio, fim, secoes });

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarProposta({ ...atual(), publicada, notificar: publicada && notificar });
      definirPrevia(null);
      await recarregarAdmin();
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
        <Secao titulo="Proposta">
          <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} />
          <CampoData rotulo="Semana: de" valor={inicio} mudar={setInicio} />
          <CampoData rotulo="até" valor={fim} mudar={setFim} />
          <Linha
            titulo={orig.temPdf ? 'PDF original anexado' : 'Anexar o PDF original'}
            sub={orig.temPdf ? 'Os membros podem abrir a proposta com a arte da Comissão. Toque para trocar.' : 'Para os membros poderem ver a proposta com a arte da Comissão'}
            icone={orig.temPdf ? 'checkmark.circle' : 'doc.badge.plus'}
            onPress={async () => {
              try {
                const pdf = await escolherPdf();
                if (!pdf) return;
                const n = await anexarPdfProposta(orig.id, pdf.base64);
                definirPrevia({ ...atual(), temPdf: n.temPdf });
                await recarregarAdmin();
                Alert.alert('PDF anexado', 'O PDF original desta proposta já pode ser aberto no app.');
              } catch (e: any) {
                Alert.alert('Não foi possível anexar', String(e?.message ?? e));
              }
            }}
            ultimo
          />
        </Secao>

        <Secao titulo={`Seções lidas do PDF (${secoes.length})`}>
          {secoes.map((s, i) =>
            aberta === i ? (
              <View key={i}>
                <Campo rotulo="Título da seção" value={s.titulo} onChangeText={(t) => setSecoes((l) => l.map((x, k) => (k === i ? { ...x, titulo: t } : x)))} />
                <Campo rotulo="Texto" value={s.texto} multiline onChangeText={(t) => setSecoes((l) => l.map((x, k) => (k === i ? { ...x, texto: t } : x)))} />
                <Linha titulo="Fechar" icone="chevron.up" onPress={() => setAberta(null)} ultimo={i === secoes.length - 1} />
              </View>
            ) : (
              <Linha
                key={i}
                titulo={s.titulo + (s.subtitulo ? ` · ${s.subtitulo}` : '')}
                sub={s.texto.replace(/\s+/g, ' ').slice(0, 90) + (s.texto.length > 90 ? '…' : '')}
                onPress={() => setAberta(i)}
                ultimo={i === secoes.length - 1}
              />
            ),
          )}
        </Secao>

        <Secao titulo="Publicação">
          <Linha titulo="Publicada" sub="Aparece na tela Hoje e em Rezar para todos" direita={<Chave valor={publicada} mudar={setPublicada} />} />
          <Linha titulo="Notificar os membros" sub="Envia a notificação “Proposta de oração da semana”" direita={<Chave valor={notificar} mudar={setNotificar} />} ultimo />
        </Secao>

        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao
            titulo="Ver como fica"
            icone="eye"
            tipo="secundario"
            onPress={() => {
              definirPrevia(atual());
              router.push({ pathname: '/proposta', params: { id: orig.id } });
            }}
          />
          <Botao titulo={salvando ? 'Salvando…' : publicada ? 'Publicar' : 'Salvar rascunho'} icone="paperplane" desativado={salvando || !titulo.trim()} onPress={salvar} />
          <Botao
            titulo="Apagar"
            tipo="perigo"
            icone="trash"
            onPress={() =>
              Alert.alert('Tem certeza?', 'Esta proposta será apagada para todos os membros.', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Apagar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await apagarProposta(orig.id);
                      definirPrevia(null);
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
        </View>
      </ScrollView>
    </Fundo>
  );
}
