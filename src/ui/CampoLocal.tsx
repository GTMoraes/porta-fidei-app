// Local de uma missa, evento ou horário fixo (Administração): o texto do local, os locais já usados (um toque
// preenche o texto e o ponto do mapa) e "Marcar no mapa" (tela `mapa-local`, que devolve o ponto por `pegarPonto`).
// Usado em `editar-evento` e `editar-rotina`.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text } from 'react-native';

import { pegarPonto } from '@/estado/escolhaLocal';
import { locaisSalvos, type LocalSalvo } from '@/servidor/api';
import { Espaco, Marca, usePaleta } from '@/tema';
import { Icone, Linha, toque } from '@/ui/base';
import { Campo } from '@/ui/Formulario';

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Estado do local com ponto no mapa. `aoMarcar` recebe o endereço do ponto escolhido no mapa (quando há). */
export function useLocalComMapa(inicial: { local?: string | null; lat?: number | null; lng?: number | null }, aoMarcar?: (endereco?: string) => void) {
  const [local, setLocal] = useState(inicial.local ?? '');
  const [lat, setLat] = useState<number | null>(inicial.lat ?? null);
  const [lng, setLng] = useState<number | null>(inicial.lng ?? null);
  const [locais, setLocais] = useState<LocalSalvo[]>([]);
  const [tirou, setTirou] = useState(false); // tirou o ponto de propósito: não põe de novo sozinho

  useEffect(() => {
    locaisSalvos().then(setLocais).catch(() => {});
  }, []);
  // escreveu um local já usado que tem ponto no mapa: usa o mesmo ponto
  useEffect(() => {
    if (tirou || (lat != null && lng != null) || !local.trim()) return;
    const l = locais.find((x) => x.lat != null && igual(x.local, local));
    if (l) {
      setLat(l.lat);
      setLng(l.lng);
    }
  }, [local, locais, tirou, lat, lng]);
  // volta da tela do mapa com o ponto escolhido
  useFocusEffect(
    useCallback(() => {
      const p = pegarPonto();
      if (!p) return;
      setTirou(false);
      setLat(p.lat);
      setLng(p.lng);
      if (p.endereco) setLocal((l) => (l.trim() ? l : p.endereco!));
      aoMarcar?.(p.endereco);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const temPonto = lat != null && lng != null;
  return {
    local,
    setLocal,
    lat: temPonto ? lat : null,
    lng: temPonto ? lng : null,
    temPonto,
    locais,
    escolher: (l: LocalSalvo) => {
      setLocal(l.local);
      setLat(l.lat);
      setLng(l.lng);
      setTirou(false);
    },
    tirarPonto: () => {
      setLat(null);
      setLng(null);
      setTirou(true);
    },
  };
}

type EstadoLocal = ReturnType<typeof useLocalComMapa>;

/** O campo "Local", os já usados e o "Marcar no mapa" */
export function CampoLocal({ s, placeholder, rotuloMapa }: { s: EstadoLocal; placeholder?: string; rotuloMapa?: string }) {
  const c = usePaleta();
  const router = useRouter();
  return (
    <>
      <Campo rotulo="Local" value={s.local} onChangeText={s.setLocal} placeholder={placeholder ?? 'Ex.: Casa de Missão, Recife'} />
      {s.locais.length ? (
        <ScrollView
          keyboardDismissMode="interactive"
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingHorizontal: Espaco.l, paddingBottom: 8 }}>
          <Text style={{ color: c.textoFraco, fontSize: 13, alignSelf: 'center' }}>Já usados:</Text>
          {s.locais.map((l) => {
            const escolhido = igual(l.local, s.local) && (l.lat == null || (l.lat === s.lat && l.lng === s.lng));
            return (
              <Pressable
                key={`${l.local}${l.lat}`}
                onPress={() => {
                  toque();
                  s.escolher(l);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: escolhido ? Marca.ouro : c.escuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                }}>
                {l.lat != null ? <Icone nome="mappin" cor={escolhido ? '#fff' : c.destaque} tamanho={12} /> : null}
                <Text style={{ color: escolhido ? '#fff' : c.textoSuave, fontSize: 14 }} numberOfLines={1}>
                  {l.local.length > 34 ? `${l.local.slice(0, 33)}…` : l.local}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <Linha
        titulo={s.temPonto ? 'Marcado no mapa' : (rotuloMapa ?? 'Marcar no mapa (opcional)')}
        sub={s.temPonto ? 'Abre no ponto exato no Apple Maps, Google Maps ou Waze' : 'Sem o mapa, o botão de mapa busca pelo texto do local'}
        icone={s.temPonto ? 'mappin.circle.fill' : 'mappin.and.ellipse'}
        corIcone={s.temPonto ? Marca.ouro : undefined}
        onPress={() =>
          router.push({ pathname: '/mapa-local', params: s.temPonto ? { lat: String(s.lat), lng: String(s.lng) } : { busca: s.local.trim() } })
        }
        direita={
          s.temPonto ? (
            <Pressable
              hitSlop={10}
              onPress={() =>
                Alert.alert('Tem certeza?', 'O ponto será tirado do mapa. O texto do local continua.', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Tirar do mapa', style: 'destructive', onPress: s.tirarPonto },
                ])
              }>
              <Text style={{ color: c.textoFraco, fontSize: 14 }}>Tirar</Text>
            </Pressable>
          ) : undefined
        }
      />
    </>
  );
}
