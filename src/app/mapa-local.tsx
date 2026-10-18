// Marcar no mapa o local de uma missa ou evento (Administração).
// O alfinete fica fixo no centro: a pessoa arrasta o mapa até o ponto certo, ou busca o endereço.

import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deixarPonto } from '@/estado/escolhaLocal';
import { Espaco, Marca, usePaleta } from '@/tema';
import { Botao, Icone, toque, Vidro } from '@/ui/base';

const RECIFE = { latitude: -8.0476, longitude: -34.877 };
const PERTO = { latitudeDelta: 0.004, longitudeDelta: 0.004 };

function enderecoDe(e: Location.LocationGeocodedAddress | undefined) {
  if (!e) return '';
  const rua = [e.street, e.streetNumber].filter(Boolean).join(', ');
  const nome = e.name && e.name !== rua && e.name !== e.streetNumber ? e.name : '';
  return [nome, rua, e.district, e.city].filter(Boolean).join(' · ');
}

export default function MapaLocal() {
  const p = useLocalSearchParams<{ lat?: string; lng?: string; busca?: string }>();
  const router = useRouter();
  const c = usePaleta();
  const ins = useSafeAreaInsets();
  const mapa = useRef<MapView>(null);
  const tinha = p.lat && p.lng ? { latitude: Number(p.lat), longitude: Number(p.lng) } : null;
  const [centro, setCentro] = useState(tinha ?? RECIFE);
  const [endereco, setEndereco] = useState('');
  const [busca, setBusca] = useState(p.busca ?? '');
  const [buscando, setBuscando] = useState(false);
  const pedido = useRef(0);

  const ir = (lat: number, lng: number) => mapa.current?.animateToRegion({ latitude: lat, longitude: lng, ...PERTO }, 450);

  const buscar = async () => {
    const t = busca.trim();
    if (!t) return;
    Keyboard.dismiss();
    setBuscando(true);
    try {
      const r = await Location.geocodeAsync(t);
      if (!r.length) Alert.alert('Endereço não encontrado', 'Tente escrever com rua, número e cidade, ou arraste o mapa até o local.');
      else ir(r[0].latitude, r[0].longitude);
    } catch {
      Alert.alert('Não foi possível buscar', 'Confira a internet ou arraste o mapa até o local.');
    } finally {
      setBuscando(false);
    }
  };

  const ondeEstou = async () => {
    toque();
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Sem acesso à localização', 'Permita em Ajustes > Porta Fidei > Localização, ou busque o endereço.');
      return;
    }
    try {
      const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      ir(l.coords.latitude, l.coords.longitude);
    } catch {
      Alert.alert('Não foi possível achar sua localização');
    }
  };

  const mudou = (r: Region) => {
    setCentro({ latitude: r.latitude, longitude: r.longitude });
    const n = ++pedido.current;
    Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude })
      .then((e) => n === pedido.current && setEndereco(enderecoDe(e[0])))
      .catch(() => {});
  };

  const usar = () => {
    deixarPonto({ lat: Number(centro.latitude.toFixed(6)), lng: Number(centro.longitude.toFixed(6)), endereco: endereco || undefined });
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Marcar no mapa',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={{ color: c.destaque, fontSize: 17 }}>Cancelar</Text>
            </Pressable>
          ),
        }}
      />
      <MapView
        ref={mapa}
        style={{ flex: 1 }}
        initialRegion={{ ...(tinha ?? RECIFE), ...(tinha ? PERTO : { latitudeDelta: 0.08, longitudeDelta: 0.08 }) }}
        onRegionChangeComplete={mudou}
        showsUserLocation
        showsPointsOfInterests
        showsCompass={false}
      />

      {/* alfinete fixo no centro (a ponta fica exatamente no centro do mapa) */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ marginBottom: 44, alignItems: 'center' }}>
          <Icone nome="mappin" cor={Marca.vinho} tamanho={44} />
        </View>
      </View>

      {/* busca */}
      <View style={{ position: 'absolute', top: Espaco.m, left: Espaco.l, right: Espaco.l }}>
        <Vidro style={{ borderRadius: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
            <Icone nome="magnifyingglass" cor={c.textoFraco} tamanho={16} />
            <TextInput
              value={busca}
              onChangeText={setBusca}
              onSubmitEditing={buscar}
              returnKeyType="search"
              placeholder="Buscar endereço"
              placeholderTextColor={c.textoFraco}
              style={{ flex: 1, color: c.texto, fontSize: 16, paddingVertical: 12 }}
            />
            {buscando ? <ActivityIndicator /> : null}
          </View>
        </Vidro>
      </View>

      {/* rodapé */}
      <View style={{ position: 'absolute', left: Espaco.l, right: Espaco.l, bottom: ins.bottom + Espaco.l, gap: 10 }}>
        <Vidro style={{ borderRadius: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
            <Text numberOfLines={2} style={{ flex: 1, color: endereco ? c.texto : c.textoFraco, fontSize: 14.5 }}>
              {endereco || 'Arraste o mapa até o local do evento'}
            </Text>
            <Pressable onPress={ondeEstou} hitSlop={10} accessibilityLabel="Ir para onde estou">
              <Icone nome="location.fill" cor={c.destaque} tamanho={20} />
            </Pressable>
          </View>
        </Vidro>
        <Botao titulo="Usar este ponto" icone="checkmark" onPress={usar} />
      </View>
    </View>
  );
}
