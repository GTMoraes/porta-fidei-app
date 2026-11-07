// Administração: cancelar ou mudar o horário de uma rotina só num dia (`acao`: cancelar | remarcar), com
// notificação para todos e aviso nos Avisos (que vence sozinho no fim do dia), como nos eventos.
// A exceção vai para o servidor; a notificação e o aviso vão pelas rotas de sempre.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { diaHoraCurtos } from '@/comunidade/rotinas';
import { atualizar, notificarTodos, salvarAviso, salvarExcecao, useServidor } from '@/servidor/api';
import { Espaco } from '@/tema';
import { Aviso, Botao, Chave, Fundo, Linha, Secao } from '@/ui/base';
import { CampoData } from '@/ui/Data';
import { Campo } from '@/ui/Formulario';

/** Fim do dia em Recife, para o aviso vencer sozinho */
const fimDoDia = (iso: string) => new Date(`${iso}T23:59:00-03:00`).toISOString();

export default function EditarExcecao() {
  const { id, data, acao } = useLocalSearchParams<{ id: string; data: string; acao: 'cancelar' | 'remarcar' }>();
  const router = useRouter();
  const srv = useServidor();
  const r = srv.comunidade?.rotinas?.find((x) => x.id === id);
  const remarcar = acao === 'remarcar';

  const [novaData, setNovaData] = useState(data);
  const [novaHora, setNovaHora] = useState(r?.hora ?? '19:00');
  const textoPadrao = (nd = novaData, nh = novaHora) =>
    r
      ? remarcar
        ? `Mudou de horário: em vez de ${diaHoraCurtos(data, r.hora)}, vai ser ${diaHoraCurtos(nd, nh)}.`
        : `Não acontece ${diaHoraCurtos(data, r.hora)}. Nos outros dias, o horário de sempre.`
      : '';
  const [titulo, setTitulo] = useState(r?.titulo ?? '');
  const [texto, setTexto] = useState(textoPadrao());
  const [mexeuTexto, setMexeuTexto] = useState(false);
  const [notificar, setNotificar] = useState(true);
  const [avisar, setAvisar] = useState(true);
  const [salvando, setSalvando] = useState(false);

  if (!r || !data)
    return (
      <Fundo>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Secao>
            <Aviso texto="Rotina não encontrada." />
          </Secao>
        </ScrollView>
      </Fundo>
    );

  // o texto acompanha o novo dia e horário, até a pessoa mexer nele
  const mudarNova = (nd: string, nh: string) => {
    setNovaData(nd);
    setNovaHora(nh);
    if (!mexeuTexto) setTexto(textoPadrao(nd, nh));
  };

  const confirmar = async () => {
    setSalvando(true);
    try {
      await salvarExcecao({ rotina: r.id, data, situacao: remarcar ? 'remarcado' : 'cancelado', novaData: remarcar ? novaData : null, novaHora: remarcar ? novaHora : null });
      const venceEm = fimDoDia(remarcar && novaData > data ? novaData : data);
      if (avisar) await salvarAviso({ titulo: titulo.trim(), texto: texto.trim(), venceEm, notificar });
      else if (notificar) await notificarTodos(titulo.trim(), texto.trim());
      await atualizar();
      router.back();
    } catch (e: any) {
      Alert.alert('Não foi possível salvar', String(e?.message ?? e));
    } finally {
      setSalvando(false);
    }
  };

  const mudouAlgo = !remarcar || novaData !== data || novaHora !== r.hora;
  return (
    <Fundo>
      <Stack.Screen options={{ title: remarcar ? 'Mudar o horário' : 'Cancelar este dia' }} />
      <ScrollView keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Secao titulo={r.titulo}>
          <Linha titulo={remarcar ? 'Dia que muda' : 'Dia cancelado'} sub={diaHoraCurtos(data, r.hora)} ultimo={!remarcar} />
          {remarcar ? (
            <>
              <CampoData rotulo="Novo dia" valor={novaData} mudar={(v) => mudarNova(v, novaHora)} />
              <CampoData rotulo="Novo horário" valor={novaHora} mudar={(v) => mudarNova(novaData, v)} modo="time" />
            </>
          ) : null}
        </Secao>

        <Secao titulo="Avisar a Comunidade">
          <Linha titulo="Enviar notificação" sub="Para todos os aparelhos" direita={<Chave valor={notificar} mudar={setNotificar} />} />
          <Linha titulo="Publicar também nos Avisos" sub="Some sozinho no fim do dia" direita={<Chave valor={avisar} mudar={setAvisar} />} ultimo={!notificar && !avisar} />
          {notificar || avisar ? (
            <>
              <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} />
              <Campo
                rotulo="Texto"
                value={texto}
                onChangeText={(t) => {
                  setMexeuTexto(true);
                  setTexto(t);
                }}
                multiline
              />
            </>
          ) : null}
        </Secao>

        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao
            titulo={salvando ? 'Salvando…' : remarcar ? 'Mudar o horário deste dia' : 'Cancelar este dia'}
            icone="checkmark"
            tipo={remarcar ? undefined : 'perigo'}
            desativado={salvando || !mudouAlgo || ((notificar || avisar) && (!titulo.trim() || !texto.trim()))}
            onPress={confirmar}
          />
        </View>
      </ScrollView>
    </Fundo>
  );
}
