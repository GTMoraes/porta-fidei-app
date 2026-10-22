// "Vale até" de um aviso: depois da validade ele sai do topo da tela Hoje e da lista de Avisos de todos
// e fica guardado em Arquivados como "Encerrado" (dá para abrir e ler). Sem validade, fica até ser
// encerrado ou apagado na Administração.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Espaco, Marca, usePaleta } from '@/tema';
import { diaEHora, fimDoDia } from '@/util/datas';
import { toque } from './base';
import { SeletorData } from './Data';

type Modo = 'hoje' | 'amanha' | 'semana' | 'outra' | 'nunca';

const OPCOES: { modo: Modo; rotulo: string }[] = [
  { modo: 'hoje', rotulo: 'Fim de hoje' },
  { modo: 'amanha', rotulo: 'Amanhã' },
  { modo: 'semana', rotulo: '7 dias' },
  { modo: 'outra', rotulo: 'Outra data' },
  { modo: 'nunca', rotulo: 'Sem vencimento' },
];

function modoDe(v: Date | null): Modo {
  if (!v) return 'nunca';
  const t = v.getTime();
  if (t === fimDoDia().getTime()) return 'hoje';
  if (t === fimDoDia(new Date(), 1).getTime()) return 'amanha';
  if (t === fimDoDia(new Date(), 7).getTime()) return 'semana';
  return 'outra';
}

export function CampoValidade({ valor, mudar }: { valor: Date | null; mudar: (d: Date | null) => void }) {
  const c = usePaleta();
  const [outra, setOutra] = useState(false); // "Outra data" escolhida: mostra o seletor mesmo se cair num atalho
  const modo = outra ? 'outra' : modoDe(valor);
  const escolher = (m: Modo) => {
    toque();
    setOutra(m === 'outra');
    if (m === 'hoje') mudar(fimDoDia());
    else if (m === 'amanha') mudar(fimDoDia(new Date(), 1));
    else if (m === 'semana') mudar(fimDoDia(new Date(), 7));
    else if (m === 'nunca') mudar(null);
    else if (!valor || valor.getTime() <= Date.now()) mudar(fimDoDia(new Date(), 2));
  };
  const passou = !!valor && valor.getTime() <= Date.now();
  return (
    <View style={{ padding: Espaco.l, gap: 12 }}>
      <Text style={{ color: c.texto, fontSize: 17 }}>Vale até</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {OPCOES.map((o) => {
          const ativo = modo === o.modo;
          return (
            <Pressable
              key={o.modo}
              onPress={() => escolher(o.modo)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: ativo ? Marca.ouro : c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
              <Text style={{ color: ativo ? '#FFFFFF' : c.texto, fontSize: 15, fontWeight: ativo ? '600' : '400' }}>{o.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
      {modo === 'outra' && valor ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.textoSuave, fontSize: 15 }}>Data e hora</Text>
          <SeletorData valor={valor} minimo={new Date()} modo="datetime" mudar={mudar} />
        </View>
      ) : null}
      <Text style={{ color: passou ? '#C0392B' : c.textoFraco, fontSize: 13.5, lineHeight: 19 }}>
        {!valor
          ? 'Fica no app até você encerrar ou apagar o aviso.'
          : passou
            ? `Encerrado em ${diaEHora(valor)}. Escolha uma nova validade para ele voltar para todos.`
            : `Em ${diaEHora(valor)} sai do topo e da lista de Avisos de todos e fica guardado como "Encerrado".`}
      </Text>
    </View>
  );
}
