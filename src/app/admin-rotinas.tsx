// Administração › Rotinas: horários fixos que se repetem (missas da semana, adoração, grupos de oração, reuniões das
// comissões). Aparecem na aba Comunidade (Horários e encontros) e, em linhas discretas, na Agenda.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';

import { recarregarAdmin, useAdminComunidade } from '@/comunidade/admin';
import { ICONE_ROTINA, NOME_TIPO_ROTINA, TIPOS_ROTINA, horaCurta, textoRegra } from '@/comunidade/rotinas';
import { Aviso, Fundo, Linha, Secao } from '@/ui/base';

export default function AdminRotinas() {
  const router = useRouter();
  const { dados, erro } = useAdminComunidade();

  useFocusEffect(
    useCallback(() => {
      recarregarAdmin();
    }, []),
  );

  const rotinas = dados?.rotinas;
  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Secao>
          <Aviso
            icone="clock"
            texto="Horários fixos, que se repetem toda semana ou todo mês. Aparecem na aba Comunidade, em Horários e encontros, e em linhas discretas na Agenda. Para algo que acontece uma vez só, use Nova missa ou evento."
          />
        </Secao>
        {erro ? (
          <Secao>
            <Aviso icone="wifi.slash" texto={`Não foi possível carregar (${erro}).`} />
          </Secao>
        ) : null}
        {dados && rotinas === undefined ? (
          <Secao>
            <Aviso icone="exclamationmark.triangle" texto="O servidor da Comunidade ainda não tem as rotinas: ele precisa ser atualizado." />
          </Secao>
        ) : null}

        {TIPOS_ROTINA.map((tipo) => {
          const lista = (rotinas ?? [])
            .filter((r) => r.tipo === tipo)
            .sort((a, b) => (a.comissao ?? '').localeCompare(b.comissao ?? '', 'pt-BR') || (a.ordem ?? 50) - (b.ordem ?? 50) || a.hora.localeCompare(b.hora));
          if (!lista.length) return null;
          return (
            <Secao key={tipo} titulo={NOME_TIPO_ROTINA[tipo]}>
              {lista.map((r, i) => (
                <Linha
                  key={r.id}
                  titulo={r.tipo === 'comissao' && r.comissao ? `${r.comissao} · ${r.titulo}` : r.titulo}
                  sub={`${r.ativa === false ? 'Desativada · ' : ''}${textoRegra(r)}, ${horaCurta(r.hora)}${r.local ? ` · ${r.local}` : ''}`}
                  icone={ICONE_ROTINA[tipo] as any}
                  onPress={() => router.push({ pathname: '/editar-rotina', params: { id: r.id } })}
                  ultimo={i === lista.length - 1}
                />
              ))}
            </Secao>
          );
        })}

        <Secao>
          <Linha titulo="Nova rotina" icone="plus.circle" onPress={() => router.push('/editar-rotina')} ultimo />
        </Secao>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
