import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { existe, imagemUri, usePacote } from '@/conteudo/pacote';
import { infoRemota, type InfoRemota } from '@/conteudo/remoto';
import { lerAjustes } from '@/estado/ajustes';
import { COR_HEX, NOME_GRAU, NOME_TEMPO, dataPorExtenso, diaLiturgico, hojeIso } from '@/liturgia/calendario';
import { HORAS } from '@/liturgia/horas';
import { atualizar, useServidor } from '@/servidor/api';
import { Espaco, Fontes, Marca, usePaleta } from '@/tema';
import { Aviso, Fundo, Icone, Linha, Secao, toque, Vidro } from '@/ui/base';
import { horaSugerida, quando } from '@/util/datas';

const ROMANO = ['', 'I', 'II', 'III', 'IV'];

export default function Hoje() {
  const c = usePaleta();
  const router = useRouter();
  const pacote = usePacote();
  const srv = useServidor();
  const [hoje, setHoje] = useState(hojeIso());
  const jaAbriuMenu = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setHoje(hojeIso());
    }, []),
  );

  // Ajuste "Iniciar com menu aberto": abre a aba Orar ao iniciar
  useEffect(() => {
    if (!jaAbriuMenu.current && lerAjustes().iniciarMenuAberto) {
      jaAbriuMenu.current = true;
      router.navigate('/orar');
    }
  }, [router]);

  // conteúdo novo no servidor (confere uma vez ao abrir)
  const [remoto, setRemoto] = useState<InfoRemota | null>(null);
  useEffect(() => {
    infoRemota().then(setRemoto);
  }, [pacote.manifest]);
  const haAtualizacao = !!(pacote.manifest && remoto && remoto.gerado !== pacote.manifest.gerado);

  const dia = useMemo(() => diaLiturgico(hoje), [hoje]);
  const cel = dia.celebracao;
  const sugerida = HORAS.find((h) => h.id === horaSugerida())!;
  const pintura = cel.slug ? imagemUri(`paints/${cel.slug}`) : undefined;
  const santoArquivo = cel.slug && existe(`santos/${cel.slug}`) ? `santos/${cel.slug}` : undefined;
  const fotoSanto = cel.slug ? imagemUri(`santos/${cel.slug}`) : undefined;

  const agora = Date.now();
  const proximos = srv.eventos.filter((e) => new Date(e.fim ?? e.inicio).getTime() >= agora - 3600_000).slice(0, 4);
  const avisos = [...srv.avisos].sort((a, b) => Number(!!b.fixado) - Number(!!a.fixado)).slice(0, 3);

  return (
    <Fundo>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={srv.carregando} onRefresh={atualizar} tintColor={c.destaque} />}>
        {/* Cabeçalho com o logo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Espaco.xl, paddingTop: Espaco.s }}>
          <Image source={require('@/assets/marca/logo-cor.png')} style={{ width: 44, height: 48 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.textoFraco, fontSize: 12.5, letterSpacing: 0.8, textTransform: 'uppercase' }}>Comunidade Católica</Text>
            <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 24 }}>Porta Fidei</Text>
          </View>
        </View>
        <Text style={{ color: c.textoSuave, paddingHorizontal: Espaco.xl, marginTop: Espaco.l, marginBottom: Espaco.s, fontSize: 15 }}>
          {dataPorExtenso(hoje)}
        </Text>

        {/* Celebração do dia */}
        <Pressable
          onPress={() => {
            toque();
            router.push({ pathname: '/dia', params: { data: hoje } });
          }}
          style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.xl }}>
          <Vidro style={{ borderRadius: 28 }}>
            {pintura ? <Image source={{ uri: pintura }} style={{ height: 190 }} contentFit="cover" transition={250} /> : null}
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 6, backgroundColor: COR_HEX[cel.cor], opacity: cel.cor === 'branco' ? 1 : 0.9 }} />
              <View style={{ flex: 1, padding: Espaco.l, paddingLeft: Espaco.l }}>
                <Text style={{ color: c.destaque, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {NOME_GRAU[cel.grau]} · {NOME_TEMPO[dia.tempo]}
                </Text>
                <Text style={{ color: c.texto, fontFamily: Fontes.titulo, fontSize: 25, lineHeight: 31, marginTop: 6 }}>{cel.nome}</Text>
                {cel.nome !== dia.feria ? <Text style={{ color: c.textoSuave, fontSize: 14.5, marginTop: 6 }}>{dia.feria}</Text> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <Etiqueta texto={`Cor: ${cel.cor}`} cor={COR_HEX[cel.cor]} />
                  <Etiqueta texto={`Saltério: semana ${ROMANO[dia.semanaSalterio]}`} />
                  <Etiqueta texto={`Ano ${dia.anoDominical} · ${dia.anoFerial === 'I' ? 'ímpar' : 'par'}`} />
                </View>
                {dia.facultativas.length ? (
                  <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 10 }}>
                    Memória facultativa: {dia.facultativas.map((f) => f.nome).join('; ')}
                  </Text>
                ) : null}
                {dia.comemoracao ? (
                  <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 10 }}>Comemoração: {dia.comemoracao.nome}</Text>
                ) : null}
              </View>
            </View>
          </Vidro>
        </Pressable>

        {!pacote.manifest ? (
          <Secao>
            <Aviso icone="arrow.down.circle" texto="Para rezar a Liturgia das Horas e usar o Missal, baixe o conteúdo litúrgico (uma vez só; depois funciona sem internet)." />
            <Linha titulo="Baixar conteúdo litúrgico" sub={remoto ? `${(remoto.tamanho / 1e6).toFixed(0)} MB` : undefined} icone="square.and.arrow.down" onPress={() => router.push('/conteudo')} ultimo />
          </Secao>
        ) : haAtualizacao ? (
          <Secao>
            <Linha titulo="Conteúdo litúrgico atualizado" sub="Toque para baixar a versão nova" icone="arrow.down.circle" onPress={() => router.push('/conteudo')} ultimo />
          </Secao>
        ) : null}

        {/* Rezar agora */}
        <Pressable
          onPress={() => {
            toque();
            router.push({ pathname: '/hora', params: { h: sugerida.id, data: hoje } });
          }}
          style={{ marginHorizontal: Espaco.l, marginBottom: Espaco.l }}>
          <Vidro tinta="rgba(129,50,52,0.55)" style={{ borderRadius: 24 }} interativo>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: Espaco.l, gap: 14 }}>
              <Icone nome="flame" cor="#fff" tamanho={26} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' }}>Rezar agora</Text>
                <Text style={{ color: '#fff', fontFamily: Fontes.titulo, fontSize: 23 }}>{sugerida.nome}</Text>
              </View>
              <Icone nome="chevron.right" cor="#fff" tamanho={16} />
            </View>
          </Vidro>
        </Pressable>

        {/* Grade das horas */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Espaco.l - 5, marginBottom: Espaco.xl }}>
          {HORAS.map((h) => (
            <View key={h.id} style={{ width: '50%', padding: 5 }}>
              <Pressable
                onPress={() => {
                  toque();
                  router.push({ pathname: '/hora', params: { h: h.id, data: hoje } });
                }}>
                <Vidro interativo style={{ borderRadius: 18 }}>
                  <View style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                    <Text style={{ color: c.texto, fontSize: 16.5, fontWeight: '600' }}>{h.curto}</Text>
                    <Text style={{ color: c.textoFraco, fontSize: 12.5, marginTop: 2 }}>{h.quando}</Text>
                  </View>
                </Vidro>
              </Pressable>
            </View>
          ))}
        </View>

        <Secao titulo="Para hoje">
          <Linha titulo="Liturgia Diária" sub="Leituras e orações da Missa" icone="book" onPress={() => router.push('/liturgia')} />
          {santoArquivo ? (
            <Linha
              titulo="Santo do dia"
              sub={cel.nome}
              icone="sparkles"
              onPress={() => router.push({ pathname: '/texto', params: { arquivo: santoArquivo, titulo: cel.nome, imagem: fotoSanto ? `santos/${cel.slug}` : '' } })}
            />
          ) : null}
          <Linha titulo="Calendário litúrgico" sub="Tempos, festas e cores" icone="calendar" onPress={() => router.push('/calendario')} ultimo />
        </Secao>

        <Secao
          titulo="Próximas missas e eventos"
          acao={
            <Pressable onPress={() => router.navigate('/agenda')}>
              <Text style={{ color: c.destaque, fontSize: 14 }}>Ver tudo</Text>
            </Pressable>
          }>
          {proximos.length ? (
            proximos.map((e, i) => (
              <Linha
                key={e.id}
                titulo={e.titulo}
                sub={`${quando(e.inicio, e.fim)}${e.local ? ` · ${e.local}` : ''}`}
                icone={e.tipo === 'missa' ? 'building.columns' : 'person.3'}
                corIcone={e.tipo === 'missa' ? Marca.vinho : undefined}
                onPress={() => router.push({ pathname: '/evento', params: { id: e.id } })}
                ultimo={i === proximos.length - 1}
              />
            ))
          ) : (
            <Aviso
              icone={srv.erro ? 'wifi.slash' : 'calendar.badge.clock'}
              texto={srv.erro && !srv.atualizado ? 'Não foi possível falar com o servidor da Comunidade. Puxe para baixo para tentar de novo.' : 'Nenhuma missa ou evento agendado por enquanto.'}
            />
          )}
        </Secao>

        {avisos.length ? (
          <Secao titulo="Avisos">
            {avisos.map((a, i) => (
              <Linha
                key={a.id}
                titulo={a.titulo}
                sub={a.texto.length > 90 ? a.texto.slice(0, 90) + '…' : a.texto}
                icone={a.fixado ? 'pin.fill' : 'megaphone'}
                onPress={() => router.push({ pathname: '/aviso', params: { id: a.id } })}
                ultimo={i === avisos.length - 1}
              />
            ))}
          </Secao>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}

function Etiqueta({ texto, cor }: { texto: string; cor?: string }) {
  const c = usePaleta();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
      {cor ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: cor, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.2)' }} /> : null}
      <Text style={{ color: c.textoSuave, fontSize: 12.5 }}>{texto}</Text>
    </View>
  );
}
