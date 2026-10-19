// Peças da Agenda: linha de evento (com CANCELADO / REAGENDADO) e o calendário do mês com as datas marcadas.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MESES } from '@/liturgia/calendario';
import { useServidor, type Evento } from '@/servidor/api';
import { Espaco, Fontes, Marca, usePaleta } from '@/tema';
import { Icone, toque, Vidro } from './base';
import { dataCurta, hora, quando } from '@/util/datas';

export const NOME_TIPO: Record<string, string> = {
  missa: 'Missa',
  evento: 'Evento',
  formacao: 'Formação',
  retiro: 'Retiro',
  reuniao: 'Reunião',
};
export const iconeEvento = (e: Evento) => (e.tipo === 'missa' ? 'building.columns' : e.tipo === 'retiro' ? 'leaf' : e.tipo === 'formacao' ? 'graduationcap' : 'person.3');

/** Dia local no formato AAAA-MM-DD */
export const diaIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const COR_CANCELADO = '#C0392B';
export const COR_REAGENDADO = '#C77700';

export function Etiqueta({ situacao }: { situacao: 'cancelado' | 'reagendado' }) {
  const cor = situacao === 'cancelado' ? COR_CANCELADO : COR_REAGENDADO;
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1, borderColor: cor, paddingHorizontal: 6, paddingVertical: 1.5 }}>
      <Text style={{ color: cor, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>{situacao === 'cancelado' ? 'CANCELADO' : 'REAGENDADO'}</Text>
    </View>
  );
}

/** "Reagendado para sáb. 8 de nov. às 19:00" (quando o novo ainda existe) */
export function textoReagendado(e: Evento, eventos: Evento[]) {
  const novo = e.reagendadoPara ? eventos.find((x) => x.id === e.reagendadoPara) : undefined;
  if (!novo) return 'Reagendado';
  const d = new Date(novo.inicio);
  return `Reagendado para ${dataCurta(d)} às ${hora(d)}`;
}

/** Linha de um evento nas listas. `comData`: mostra o dia (lista da tela Hoje) em vez de só a hora. */
export function LinhaEvento({ e, ultimo, comData }: { e: Evento; ultimo?: boolean; comData?: boolean }) {
  const c = usePaleta();
  const router = useRouter();
  const srv = useServidor();
  const cancelado = e.situacao === 'cancelado';
  const reag = e.situacao === 'reagendado';
  const base = comData ? quando(e.inicio, e.fim) : `${hora(new Date(e.inicio))}${e.fim ? ` às ${hora(new Date(e.fim))}` : ''} · ${NOME_TIPO[e.tipo] ?? ''}`;
  const sub = reag ? textoReagendado(e, srv.eventos) : `${base}${e.local ? ` · ${e.local}` : ''}`;
  return (
    <View>
      <Pressable
        onPress={() => {
          toque();
          router.push({ pathname: '/evento', params: { id: e.id } });
        }}
        style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: Espaco.l, gap: Espaco.m, opacity: cancelado || reag ? 0.75 : 1 }}>
          <View style={{ width: 30, alignItems: 'center' }}>
            <Icone nome={iconeEvento(e) as any} cor={e.tipo === 'missa' && !cancelado && !reag ? Marca.vinho : undefined} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            {cancelado || reag ? <Etiqueta situacao={e.situacao!} /> : null}
            <Text style={{ color: c.texto, fontSize: 17, textDecorationLine: cancelado ? 'line-through' : 'none' }}>{e.titulo}</Text>
            <Text style={{ color: reag ? COR_REAGENDADO : c.textoFraco, fontSize: 13.5 }}>{sub}</Text>
          </View>
          <Icone nome="chevron.right" cor={c.textoFraco} tamanho={14} />
        </View>
      </Pressable>
      {!ultimo ? <View style={{ height: 0.5, backgroundColor: c.separador, marginLeft: 58 }} /> : null}
    </View>
  );
}

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Calendário do mês com as datas de missas e eventos marcadas; tocar num dia abre os eventos dele.
 *  Começa aberto e pode ser recolhido. */
export function CalendarioAgenda({ eventos }: { eventos: Evento[] }) {
  const c = usePaleta();
  const router = useRouter();
  const hoje = diaIso(new Date());
  const [aberto, setAberto] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  // por dia: há algo que acontece (não cancelado) ou só cancelados/reagendados?
  const porDia = useMemo(() => {
    const m = new Map<string, { ativos: number; outros: number }>();
    for (const e of eventos) {
      const k = diaIso(new Date(e.inicio));
      const v = m.get(k) ?? { ativos: 0, outros: 0 };
      if (e.situacao) v.outros++;
      else v.ativos++;
      m.set(k, v);
    }
    return m;
  }, [eventos]);

  const dias = useMemo(() => {
    const n = new Date(ano, mes, 0).getDate();
    const primeiro = new Date(ano, mes - 1, 1).getDay();
    const cel: (string | null)[] = Array(primeiro).fill(null);
    for (let d = 1; d <= n; d++) cel.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    while (cel.length % 7) cel.push(null);
    return cel;
  }, [ano, mes]);

  // de 3 meses atrás (o servidor manda os últimos 90 dias) até 12 meses à frente ou o mês do último evento
  const agora = new Date();
  const mesAgora = agora.getFullYear() * 12 + agora.getMonth();
  const ultimoEv = eventos.length ? new Date(eventos[eventos.length - 1].inicio) : agora;
  const minimo = mesAgora - 3;
  const maximo = Math.max(mesAgora + 12, ultimoEv.getFullYear() * 12 + ultimoEv.getMonth());
  const atual = ano * 12 + mes - 1;
  const mudarMes = (n: number) => {
    const alvo = atual + n;
    if (alvo < minimo || alvo > maximo) return;
    toque();
    setAno(Math.floor(alvo / 12));
    setMes((alvo % 12) + 1);
  };

  return (
    <View style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
      <Vidro style={{ borderRadius: 26, padding: Espaco.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {aberto ? (
            <Pressable onPress={() => mudarMes(-1)} hitSlop={10} style={{ padding: 8, opacity: atual <= minimo ? 0.3 : 1 }}>
              <Icone nome="chevron.left" tamanho={17} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              toque();
              setAberto((a) => !a);
            }}
            style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: aberto ? 0 : 6 }}>
            <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 20, textTransform: 'capitalize' }}>{aberto ? `${MESES[mes - 1]} ${ano}` : 'Calendário'}</Text>
            <Icone nome={aberto ? 'chevron.up' : 'chevron.down'} cor={c.textoFraco} tamanho={12} />
          </Pressable>
          {aberto ? (
            <Pressable onPress={() => mudarMes(1)} hitSlop={10} style={{ padding: 8, opacity: atual >= maximo ? 0.3 : 1 }}>
              <Icone nome="chevron.right" tamanho={17} />
            </Pressable>
          ) : null}
        </View>
        {aberto ? (
          <>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {SEMANA.map((s, i) => (
                <Text key={i} style={{ flex: 1, textAlign: 'center', color: c.textoFraco, fontSize: 12, fontWeight: '600' }}>
                  {s}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
              {dias.map((d, i) => {
                const info = d ? porDia.get(d) : undefined;
                const passado = d ? d < hoje : false;
                return (
                  <View key={i} style={{ width: `${100 / 7}%`, height: 44, padding: 2 }}>
                    {d ? (
                      <Pressable
                        disabled={!info}
                        onPress={() => {
                          toque();
                          router.push({ pathname: '/agenda-dia', params: { data: d } });
                        }}
                        style={({ pressed }) => ({
                          flex: 1,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: d === hoje ? 1.2 : 0,
                          borderColor: c.destaque,
                          backgroundColor: pressed ? (c.escuro ? 'rgba(222,190,130,0.25)' : 'rgba(188,140,68,0.2)') : 'transparent',
                        })}>
                        <Text style={{ color: passado ? c.textoFraco : c.texto, fontSize: 16, fontWeight: info && !passado ? '600' : '400' }}>{Number(d.slice(8))}</Text>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            marginTop: 3,
                            backgroundColor: !info ? 'transparent' : info.ativos ? (passado ? c.textoFraco : Marca.ouro) : COR_CANCELADO,
                            opacity: info && !info.ativos ? 0.6 : 1,
                          }}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </Vidro>
    </View>
  );
}
