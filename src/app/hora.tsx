import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { montarHora } from '@/conteudo/montar';
import { existe, lerDado, usePacote } from '@/conteudo/pacote';
import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { diaLiturgico, hojeIso, somaDias } from '@/liturgia/calendario';
import { planoDaHora, type Hora } from '@/liturgia/horas';
import { antifonaInvitatorio, type DadosInvitatorio } from '@/liturgia/invitatorio';
import { usePaleta } from '@/tema';
import { Icone, toque, Vidro } from '@/ui/base';
import { Leitor } from '@/ui/Leitor';
import { dataCurta } from '@/util/datas';

export default function TelaHora() {
  const p = useLocalSearchParams<{ h: Hora; data?: string }>();
  // memória facultativa só muda Invitatório, Ofício das Leituras, Laudes e Vésperas (na Hora Média e nas Completas vale o dia)
  const aceitaMemoria = ['invitatorio', 'leituras', 'laudes', 'vesperas'].includes(p.h);
  const aj = useAjustes();
  const pacote = usePacote();
  const c = usePaleta();
  const [data, setData] = useState(p.data || hojeIso());
  const [memoria, setMemoria] = useState<string | undefined>();
  const [corpo, setCorpo] = useState<string | null>(null);
  const [dadosInv, setDadosInv] = useState<DadosInvitatorio | null | undefined>(undefined);
  const ehInvitatorio = p.h === 'invitatorio';

  useEffect(() => {
    if (!ehInvitatorio) return;
    lerDado<DadosInvitatorio>('invitatorio.json').then((d) => setDadosInv(d ?? null));
  }, [ehInvitatorio, pacote.manifest]);

  const dia = useMemo(() => diaLiturgico(data), [data]);
  const plano = useMemo(
    () =>
      planoDaHora(data, p.h, {
        existe,
        bienal: aj.bienal,
        memoriaEscolhida: memoria,
        invitatorio: aj.invitatorio,
        antifonaNasEstrofes: aj.antifonaNasEstrofes,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, p.h, aj.bienal, aj.invitatorio, aj.antifonaNasEstrofes, memoria, pacote.manifest],
  );

  useEffect(() => {
    let vivo = true;
    setCorpo(null);
    if (!pacote.manifest) {
      setCorpo('<p class="c"><span class="lacuna">O conteúdo litúrgico ainda não foi instalado. Vá em Ajustes › Conteúdo litúrgico.</span></p>');
      return;
    }
    if (ehInvitatorio && dadosInv === undefined) return; // espera as antífonas
    const antifona = ehInvitatorio ? antifonaInvitatorio(dia, dadosInv ?? null, memoria) : undefined;
    montarHora(plano, aj, { antifonaInvitatorio: antifona }).then((m) => {
      if (!vivo) return;
      let html = m.corpo;
      if (!html) html = `<p class="c"><span class="lacuna">${plano.avisos[0] ?? 'Texto indisponível.'}</span></p>`;
      if (dia.comemoracao && (p.h === 'laudes' || p.h === 'vesperas'))
        html = `<p class="c"><span class="lacuna">Comemoração: ${dia.comemoracao.nome}</span></p>` + html;
      setCorpo(html);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano, aj.repetirRespostas, aj.laudesAmpliada, dadosInv]);

  const mudarDia = (n: number) => {
    toque();
    setMemoria(undefined);
    setData((d) => somaDias(d, n));
  };

  const topo = (
    <View style={{ gap: 8 }}>
      <Vidro style={{ borderRadius: 22 }} interativo>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => mudarDia(-1)} hitSlop={8} style={{ padding: 12 }}>
            <Icone nome="chevron.left" tamanho={16} />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => setData(hojeIso())}>
            <Text style={{ color: c.texto, textAlign: 'center', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
              {dataCurta(new Date(data + 'T12:00:00'))}
              {data === hojeIso() ? ' · hoje' : ''}
            </Text>
            <Text style={{ color: c.textoFraco, textAlign: 'center', fontSize: 12 }} numberOfLines={1}>
              {plano.diaCelebrado.celebracao.nome}
            </Text>
          </Pressable>
          <Pressable onPress={() => mudarDia(1)} hitSlop={8} style={{ padding: 12 }}>
            <Icone nome="chevron.right" tamanho={16} />
          </Pressable>
        </View>
      </Vidro>
      {dia.facultativas.length && !plano.primeirasVesperas && aceitaMemoria ? (
        <SeletorMemoria
          opcoes={dia.facultativas.filter((f) => !!f.slug).map((f) => ({ slug: f.slug!, nome: f.nome }))}
          escolhida={memoria}
          aoEscolher={setMemoria}
        />
      ) : null}
    </View>
  );

  const comChips = dia.facultativas.length > 0 && !plano.primeirasVesperas && aceitaMemoria;

  // Invitatório: escolha do salmo e da antífona entre as estrofes (como no iLiturgia)
  const rodape = ehInvitatorio ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6 }}>
      <Text style={{ color: c.textoSuave, fontSize: 14, marginRight: 6 }}>Salmo</Text>
      {(['94', '23', '66', '99'] as const).map((sl) => (
        <Pressable
          key={sl}
          hitSlop={4}
          onPress={() => {
            toque();
            mudarAjustes({ invitatorio: sl });
          }}
          style={{ paddingHorizontal: 7, paddingVertical: 6 }}>
          <Text style={{ fontSize: 19, fontWeight: aj.invitatorio === sl ? '700' : '400', color: aj.invitatorio === sl ? c.destaque : c.textoFraco }}>{sl}</Text>
        </Pressable>
      ))}
      <View style={{ flex: 1 }} />
      <Text style={{ color: c.textoSuave, fontSize: 13, marginRight: 8, textAlign: 'right' }} numberOfLines={2}>
        Antífona{'\n'}nas estrofes
      </Text>
      <Switch
        value={aj.antifonaNasEstrofes}
        onValueChange={(v) => {
          toque();
          mudarAjustes({ antifonaNasEstrofes: v });
        }}
        trackColor={{ true: c.destaque }}
      />
    </View>
  ) : undefined;

  return (
    <Leitor
      tipo="horas"
      rodape={rodape}
      alturaTopo={comChips ? 120 : 64}
      corpo={corpo}
      titulo={plano.titulo}
      subtitulo={plano.diaCelebrado.celebracao.nome}
      permitirSilencio={p.h === 'laudes' || p.h === 'vesperas'}
      topo={topo}
    />
  );
}

/** "Memória facultativa: Féria ▾" que abre a lista de opções do dia */
function SeletorMemoria({
  opcoes,
  escolhida,
  aoEscolher,
}: {
  opcoes: { slug: string; nome: string }[];
  escolhida?: string;
  aoEscolher: (slug: string | undefined) => void;
}) {
  const c = usePaleta();
  const [aberto, setAberto] = useState(false);
  const atual = opcoes.find((o) => o.slug === escolhida);
  const nomeCurto = (n: string) => n.split(',')[0];
  const linha = (slug: string | undefined, titulo: string, sub?: string) => {
    const ativo = escolhida === slug;
    return (
      <Pressable
        key={slug ?? 'feria'}
        onPress={() => {
          toque();
          aoEscolher(slug);
          setAberto(false);
        }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, opacity: pressed ? 0.6 : 1 })}>
        <View style={{ width: 24 }}>{ativo ? <Icone nome="checkmark" tamanho={15} /> : null}</View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.texto, fontSize: 15, fontWeight: ativo ? '600' : '400' }}>{titulo}</Text>
          {sub ? <Text style={{ color: c.textoFraco, fontSize: 12 }}>{sub}</Text> : null}
        </View>
      </Pressable>
    );
  };
  return (
    <Vidro style={{ borderRadius: 20 }} interativo>
      <Pressable
        onPress={() => {
          toque();
          setAberto((a) => !a);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textoFraco, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>Memória facultativa</Text>
          <Text style={{ color: atual ? c.destaque : c.texto, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {atual ? nomeCurto(atual.nome) : 'Não celebrar (féria)'}
          </Text>
        </View>
        <Icone nome={aberto ? 'chevron.up' : 'chevron.down'} tamanho={14} />
      </Pressable>
      {aberto ? (
        <View style={{ borderTopWidth: 0.5, borderTopColor: c.separador, paddingBottom: 4 }}>
          {linha(undefined, 'Não celebrar (féria)', 'Textos do dia da semana')}
          {opcoes.map((o) => linha(o.slug, nomeCurto(o.nome), o.nome.includes(',') ? o.nome.split(',').slice(1).join(',').trim() : undefined))}
        </View>
      ) : null}
    </Vidro>
  );
}
