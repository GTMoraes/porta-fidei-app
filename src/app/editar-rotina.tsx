// Editar rotina (horário fixo que se repete): o quê, quando (toda semana em certos dias, ou todo mês na N-ésima
// semana), horário e onde. Comissão: o nome da comissão é o que aparece em Ajustes › Sua comissão.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { recarregarAdmin, useAdminComunidade } from '@/comunidade/admin';
import { TIPOS_ROTINA, TIPO_ROTINA_UM, horaCurta, nomesComissoes, textoRegra } from '@/comunidade/rotinas';
import { apagarRotina, salvarRotina, useServidor, type TipoRotina } from '@/servidor/api';
import { Espaco } from '@/tema';
import { Botao, Chave, Fundo, Linha, Secao } from '@/ui/base';
import { CampoData } from '@/ui/Data';
import { Campo, CampoDias, CampoEscolha } from '@/ui/Formulario';

/** HH:MM + minutos */
function somaMinutos(h: string, min: number) {
  const [hh, mm] = h.split(':').map(Number);
  const t = (hh * 60 + mm + min) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export default function EditarRotina() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { dados } = useAdminComunidade();
  const srv = useServidor();
  // aberta pela Agenda, os dados da Administração podem não ter carregado: vale a cópia que todos têm
  const orig = id ? (dados?.rotinas?.find((r) => r.id === id) ?? srv.comunidade?.rotinas?.find((r) => r.id === id)) : undefined;
  const existentes = nomesComissoes(dados?.rotinas);

  const [titulo, setTitulo] = useState(orig?.titulo ?? '');
  const [tipo, setTipo] = useState<TipoRotina>(orig?.tipo ?? 'missa');
  const [comissao, setComissao] = useState(orig?.comissao ?? '');
  const [repete, setRepete] = useState<'semanal' | 'mensal'>(orig?.repete ?? 'semanal');
  const [dias, setDias] = useState<number[]>(orig?.dias ?? []);
  const [semana, setSemana] = useState<number>(orig?.semana ?? 1);
  const [hora, setHora] = useState(orig?.hora ?? '19:00');
  const [temFim, setTemFim] = useState(!!orig?.fim);
  const [fim, setFim] = useState(orig?.fim ?? '');
  const [local, setLocal] = useState(orig?.local ?? '');
  const [endereco, setEndereco] = useState(orig?.endereco ?? '');
  const [obs, setObs] = useState(orig?.obs ?? '');
  const [ativa, setAtiva] = useState(orig?.ativa ?? true);
  const [salvando, setSalvando] = useState(false);

  const regra = { repete, dias: repete === 'mensal' ? dias.slice(0, 1) : dias, semana };
  const pronto = !!titulo.trim() && dias.length > 0 && (tipo !== 'comissao' || !!comissao.trim());

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarRotina({
        id: orig?.id,
        titulo: titulo.trim(),
        tipo,
        comissao: tipo === 'comissao' ? comissao.trim() : null,
        ...regra,
        semana: repete === 'mensal' ? semana : null,
        hora,
        fim: temFim && fim ? fim : null,
        local: local.trim() || null,
        endereco: endereco.trim() || null,
        obs: obs.trim() || null,
        ativa,
        ordem: orig?.ordem,
      });
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
        <Secao titulo="Rotina">
          <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Missa na Samaria" />
          <CampoEscolha rotulo="Tipo" valor={tipo} valores={TIPOS_ROTINA.map((t) => [t, TIPO_ROTINA_UM[t]] as [TipoRotina, string])} mudar={setTipo} />
          {tipo === 'comissao' ? (
            <>
              <Campo rotulo="Nome da comissão (aparece em Ajustes › Sua comissão)" value={comissao} onChangeText={setComissao} placeholder="Ex.: Música" />
              {existentes.length ? <CampoEscolha rotulo="Ou escolha uma já cadastrada" valor={comissao} valores={existentes.map((n) => [n, n] as [string, string])} mudar={setComissao} /> : null}
            </>
          ) : null}
        </Secao>

        <Secao titulo="Quando">
          <CampoEscolha
            rotulo="Repete"
            valor={repete}
            valores={[
              ['semanal', 'Toda semana'],
              ['mensal', 'Todo mês'],
            ]}
            mudar={(v) => {
              setRepete(v);
              if (v === 'mensal' && dias.length > 1) setDias(dias.slice(0, 1));
            }}
          />
          {repete === 'mensal' ? (
            <CampoEscolha
              rotulo="Semana do mês"
              valor={semana}
              valores={[
                [1, '1ª'],
                [2, '2ª'],
                [3, '3ª'],
                [4, '4ª'],
                [-1, 'Última'],
              ]}
              mudar={setSemana}
            />
          ) : null}
          <CampoDias rotulo={repete === 'mensal' ? 'Dia da semana' : 'Dias da semana'} dias={regra.dias} mudar={setDias} um={repete === 'mensal'} />
          <CampoData rotulo="Horário" valor={hora} mudar={setHora} modo="time" />
          <Linha
            titulo="Horário de término"
            sub="Aproximado. Não aparece; serve para a Agenda mostrar “agora” enquanto acontece"
            direita={
              <Chave
                valor={temFim}
                mudar={(v) => {
                  setTemFim(v);
                  if (v && !fim) setFim(somaMinutos(hora, 60));
                }}
              />
            }
          />
          {temFim ? <CampoData rotulo="Termina" valor={fim || somaMinutos(hora, 60)} mudar={setFim} modo="time" /> : null}
          <Linha titulo="Vai aparecer assim" sub={dias.length ? `${textoRegra(regra)}, ${horaCurta(hora)}` : 'Escolha o dia da semana'} ultimo />
        </Secao>

        <Secao titulo="Onde">
          <Campo rotulo="Local" value={local} onChangeText={setLocal} placeholder="Ex.: Casa Porta Fidei" />
          <Campo rotulo="Endereço, para abrir no mapa (opcional)" value={endereco} onChangeText={setEndereco} />
          <Campo rotulo="Observação (opcional)" value={obs} onChangeText={setObs} placeholder="Ex.: exceto feriados" />
          <Linha titulo="Ativa" sub="Desativada, some do app" direita={<Chave valor={ativa} mudar={setAtiva} />} ultimo />
        </Secao>

        <View style={{ marginHorizontal: Espaco.l, gap: 12, marginBottom: 60 }}>
          <Botao titulo={salvando ? 'Salvando…' : 'Salvar'} icone="checkmark" desativado={salvando || !pronto} onPress={salvar} />
          {orig ? (
            <Botao
              titulo="Apagar"
              tipo="perigo"
              icone="trash"
              onPress={() =>
                Alert.alert('Tem certeza?', 'Esta rotina será apagada para todos os membros.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await apagarRotina(orig.id);
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
