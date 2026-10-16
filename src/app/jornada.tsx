// Jornada de oração: novena, Quaresma de São Miguel ou Cerco de Jericó. Mostra o texto do dia,
// permite ver os outros dias e marcar "Rezei hoje" (só no aparelho).

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { oracaoHtml, textoParaHtml } from '@/comunidade/html';
import { dataDoDia, diaAtual, diasFeitos, marcar, periodo, useFeitos } from '@/comunidade/jornadas';
import { montarArquivo } from '@/conteudo/montar';
import { usePacote } from '@/conteudo/pacote';
import { hojeIso } from '@/liturgia/calendario';
import { useServidor } from '@/servidor/api';
import { usePaleta } from '@/tema';
import { Icone, toque, Vidro } from '@/ui/base';
import { Leitor } from '@/ui/Leitor';
import { dataCurta } from '@/util/datas';

const dt = (iso: string) => dataCurta(new Date(iso + 'T12:00:00'));

export default function TelaJornada() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const srv = useServidor();
  const c = usePaleta();
  usePacote();
  const hoje = hojeIso();
  const j = srv.comunidade?.jornadas.find((x) => x.id === id || x.slug === id);
  const p = j ? periodo(j, hoje) : null;
  const atual = j ? diaAtual(j, hoje) : null;
  const [dia, setDia] = useState(atual ?? 1);
  const feitos = useFeitos();
  const [doPacote, setDoPacote] = useState<string | null>(null);

  useEffect(() => {
    if (atual) setDia(atual);
  }, [atual]);

  useEffect(() => {
    if (!j?.arquivo) return;
    montarArquivo(j.arquivo).then((m) => setDoPacote(m.faltando.length ? '' : m.corpo));
  }, [j?.arquivo]);

  const corpo = useMemo(() => {
    if (!j) return '<p class="c" style="margin-top:24px"><span class="lacuna">Esta jornada não está mais disponível.</span></p>';
    const partes: string[] = [];
    if (j.arquivo) {
      if (doPacote == null) return null;
      partes.push(doPacote || '<p class="c"><span class="lacuna">Este texto está no conteúdo litúrgico. Baixe-o em Ajustes › Conteúdo litúrgico.</span></p>');
    }
    if (j.oracao) {
      const o = srv.comunidade?.oracoes.find((x) => x.slug === j.oracao || x.id === j.oracao);
      partes.push(o ? oracaoHtml(o.texto) : '');
    }
    if (j.comum?.trim()) partes.push(`<section class="parte com">${textoParaHtml(j.comum)}</section>`);
    const t = j.textos?.[dia - 1];
    if (t?.trim()) partes.push(`<section class="parte com"><h2 class="sc">${dia}º dia</h2>${textoParaHtml(t)}</section>`);
    if (!partes.join('').trim())
      partes.push('<p class="c" style="margin-top:24px"><span class="lacuna">Os textos desta jornada ainda serão publicados pela coordenação.</span></p>');
    return partes.join('');
  }, [j, dia, doPacote, srv.comunidade?.oracoes]);

  if (!j) return <Leitor corpo={corpo} titulo="Jornada de oração" />;

  const feitosAqui = p ? diasFeitos(feitos, j, p) : [];
  const dataDia = p ? dataDoDia(p, dia) : null;
  const podeMarcar = !!dataDia && dataDia <= hoje;
  const feito = !!dataDia && feitosAqui.includes(dataDia);
  const subt = !p
    ? 'Data de início a definir pela coordenação'
    : hoje < p.inicio
      ? `Começa em ${dt(p.inicio)} · termina em ${dt(p.fim)}`
      : hoje > p.fim
        ? `Terminou em ${dt(p.fim)}`
        : `${dt(p.inicio)} a ${dt(p.fim)} · ${feitosAqui.length} de ${j.dias} rezados`;

  const mudar = (n: number) => {
    toque();
    setDia((d) => Math.max(1, Math.min(j.dias, d + n)));
  };

  const topo = (
    <Vidro style={{ borderRadius: 22 }} interativo>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => mudar(-1)} hitSlop={8} style={{ padding: 12, opacity: dia > 1 ? 1 : 0.3 }}>
          <Icone nome="chevron.left" tamanho={16} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => atual && setDia(atual)}>
          <Text style={{ color: c.texto, textAlign: 'center', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            Dia {dia} de {j.dias}
            {atual === dia ? ' · hoje' : dataDia ? ` · ${dt(dataDia)}` : ''}
          </Text>
          <Text style={{ color: c.textoFraco, textAlign: 'center', fontSize: 12 }} numberOfLines={1}>
            {subt}
          </Text>
        </Pressable>
        <Pressable onPress={() => mudar(1)} hitSlop={8} style={{ padding: 12, opacity: dia < j.dias ? 1 : 0.3 }}>
          <Icone nome="chevron.right" tamanho={16} />
        </Pressable>
      </View>
    </Vidro>
  );

  const rodape =
    p && podeMarcar ? (
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <Pressable
          onPress={() => {
            toque();
            marcar(j, p, dataDia!, !feito);
          }}
          hitSlop={6}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, opacity: pressed ? 0.5 : 1 })}>
          <Icone nome={feito ? 'checkmark.circle.fill' : 'circle'} cor={c.destaque} tamanho={20} />
          <Text style={{ color: c.destaque, fontSize: 16, fontWeight: feito ? '600' : '400' }}>
            {feito ? (atual === dia ? 'Rezei hoje' : 'Rezado') : atual === dia ? 'Marcar: rezei hoje' : 'Marcar como rezado'}
          </Text>
        </Pressable>
      </View>
    ) : undefined;

  return <Leitor corpo={corpo} titulo={j.titulo} subtitulo={j.descricao ?? undefined} topo={topo} rodape={rodape} />;
}
