import { File } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from 'react-native';

import { baixarEInstalar, instalarDeArquivo, removerPacote, usePacote } from '@/conteudo/pacote';
import { baixarConteudo, infoRemota, temDownloadDireto, type InfoRemota } from '@/conteudo/remoto';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Botao, Fundo, Linha, Secao } from '@/ui/base';

export default function Conteudo() {
  const pacote = usePacote();
  const c = usePaleta();
  const [progresso, setProgresso] = useState<{ fase: string; feito: number; total: number } | null>(null);
  const [link, setLink] = useState('');
  const [remoto, setRemoto] = useState<InfoRemota | null | undefined>(undefined);
  const [outrasFormas, setOutrasFormas] = useState(false);

  useEffect(() => {
    infoRemota().then(setRemoto);
  }, [pacote.manifest]);

  const executar = async (f: () => Promise<unknown>) => {
    try {
      setProgresso({ fase: 'Preparando', feito: 0, total: 1 });
      await f();
      Alert.alert('Pronto', 'Conteúdo litúrgico instalado.');
    } catch (e: any) {
      Alert.alert('Não foi possível instalar', String(e?.message ?? e));
    } finally {
      setProgresso(null);
    }
  };
  const prog = (fase: string, feito: number, total: number) => setProgresso({ fase, feito, total });

  const doArquivos = async () => {
    try {
      const r = await File.pickFileAsync({ mimeTypes: ['application/zip', 'application/x-zip-compressed', 'public.zip-archive'] } as any);
      const escolhido = (r as any)?.result ?? r;
      if (!escolhido || (r as any)?.canceled) return;
      await executar(() => instalarDeArquivo(escolhido as File, prog));
    } catch (e: any) {
      Alert.alert('Seletor de arquivos', `${String(e?.message ?? e)}\n\nSe estiver no LiveContainer, use "Procurar na pasta do app" ou "Baixar de um link".`);
    }
  };

  const remover = () =>
    Alert.alert('Tem certeza?', 'O conteúdo litúrgico será apagado deste aparelho. Dá para instalar de novo depois.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => removerPacote() },
    ]);

  const m = pacote.manifest;
  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
        <Secao titulo="Situação" >
          {m ? (
            <>
              <Linha titulo={m.tipo === 'provisorio' ? 'Pacote provisório de demonstração' : 'Pacote oficial'} sub={m.descricao} icone="checkmark.seal" />
              <Linha titulo={`${m.arquivos.length.toLocaleString('pt-BR')} textos · ${m.imagens.length} imagens`} sub={`Gerado em ${new Date(m.gerado).toLocaleDateString('pt-BR')}`} icone="books.vertical" ultimo />
            </>
          ) : (
            <Aviso icone="exclamationmark.triangle" texto="Nenhum conteúdo instalado. Sem ele, o app mostra a estrutura das horas mas não os textos." />
          )}
        </Secao>

        {progresso ? (
          <Secao>
            <View style={{ padding: Espaco.xl, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={c.destaque} />
              <Text style={{ color: c.texto }}>
                {progresso.fase}
                {progresso.total > 1 ? ` · ${Math.round((progresso.feito / progresso.total) * 100)}%` : ''}
              </Text>
              <View style={{ height: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: c.separador, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${progresso.total ? (progresso.feito / progresso.total) * 100 : 0}%`, backgroundColor: c.destaque }} />
              </View>
            </View>
          </Secao>
        ) : (
          <>
            {temDownloadDireto() ? (
              <Secao titulo="Baixar">
                {remoto === undefined ? (
                  <Linha titulo="Procurando o conteúdo…" icone="arrow.triangle.2.circlepath" ultimo />
                ) : remoto === null ? (
                  <Linha titulo="Servidor de conteúdo indisponível" sub="Confira a internet e abra esta tela de novo." icone="wifi.exclamationmark" ultimo />
                ) : m && m.gerado === remoto.gerado ? (
                  <Linha titulo="Conteúdo em dia" sub={`Versão de ${new Date(remoto.gerado).toLocaleDateString('pt-BR')}`} icone="checkmark.circle" ultimo />
                ) : (
                  <Linha
                    titulo={m ? 'Atualizar conteúdo litúrgico' : 'Baixar conteúdo litúrgico'}
                    sub={`${(remoto.tamanho / 1e6).toFixed(1)} MB · versão de ${new Date(remoto.gerado).toLocaleDateString('pt-BR')}`}
                    icone="arrow.down.circle"
                    onPress={() => executar(() => baixarConteudo(prog))}
                    ultimo
                  />
                )}
              </Secao>
            ) : null}

            {!temDownloadDireto() || outrasFormas ? (
              <>
            <Secao titulo="Instalar de um arquivo">
              <Linha titulo="Escolher no app Arquivos" sub="Selecione o arquivo pf-conteudo.zip" icone="folder" onPress={doArquivos} ultimo />
            </Secao>

            <Secao titulo="Baixar de um link">
              <View style={{ padding: Espaco.l, gap: 12 }}>
                <TextInput
                  value={link}
                  onChangeText={setLink}
                  placeholder="https://… (link temporário do pacote)"
                  placeholderTextColor={c.textoFraco}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={{ color: c.texto, backgroundColor: c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 12, fontSize: 15 }}
                />
                <Botao titulo="Baixar e instalar" icone="arrow.down.circle" desativado={!/^https?:\/\//.test(link.trim())} onPress={() => executar(() => baixarEInstalar(link, prog))} />
              </View>
            </Secao>
              </>
            ) : (
              <Text onPress={() => setOutrasFormas(true)} style={{ color: c.textoFraco, textAlign: 'center', marginBottom: 24, fontSize: 13 }}>
                Outras formas de instalar
              </Text>
            )}

            {m ? (
              <View style={{ marginHorizontal: Espaco.l, marginBottom: 40 }}>
                <Botao titulo="Apagar conteúdo" tipo="perigo" icone="trash" onPress={remover} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Fundo>
  );
}
