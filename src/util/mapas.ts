// Abre o local de um evento no app de mapa que a pessoa preferir (Apple Maps, Google Maps ou Waze).
// Com o ponto marcado no mapa, abre no ponto exato; sem ele, busca pelo texto do local.
// No Android quem pergunta qual app usar é o próprio sistema (link geo:).

import { Linking, Platform } from 'react-native';

import { mostrarOpcoes } from '@/ui/Opcoes';

export interface LugarMapa {
  nome: string; // título do evento (rótulo do alfinete)
  local?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export const temPonto = (l: LugarMapa) => typeof l.lat === 'number' && typeof l.lng === 'number';

function opcoes(l: LugarMapa) {
  const rotulo = encodeURIComponent(l.local || l.nome);
  if (temPonto(l)) {
    const ll = `${l.lat},${l.lng}`;
    return [
      { nome: 'Apple Maps', url: `maps://?ll=${ll}&q=${rotulo}` },
      { nome: 'Google Maps', url: `comgooglemaps://?q=${ll}&center=${ll}&zoom=17` },
      { nome: 'Waze', url: `waze://?ll=${ll}&navigate=yes` },
    ];
  }
  return [
    { nome: 'Apple Maps', url: `maps://?q=${rotulo}` },
    { nome: 'Google Maps', url: `comgooglemaps://?q=${rotulo}` },
    { nome: 'Waze', url: `waze://?q=${rotulo}&navigate=yes` },
  ];
}

/** Link do mapa (vai no campo "URL" do evento salvo na agenda): Apple Maps no iOS, Google Maps no Android */
export function linkMapa(l: LugarMapa) {
  const q = encodeURIComponent(l.local || l.nome);
  if (Platform.OS === 'android') {
    return `https://www.google.com/maps/search/?api=1&query=${temPonto(l) ? `${l.lat},${l.lng}` : q}`;
  }
  return temPonto(l) ? `https://maps.apple.com/?ll=${l.lat},${l.lng}&q=${q}` : `https://maps.apple.com/?q=${q}`;
}

export async function abrirNoMapa(l: LugarMapa) {
  if (Platform.OS === 'android') {
    const rotulo = encodeURIComponent(l.local || l.nome);
    const url = temPonto(l) ? `geo:${l.lat},${l.lng}?q=${l.lat},${l.lng}(${rotulo})` : `geo:0,0?q=${rotulo}`;
    return Linking.openURL(url).catch(() => Linking.openURL(linkMapa(l)).catch(() => {}));
  }
  const todas = opcoes(l);
  // o Apple Maps sempre existe; os outros só aparecem se estiverem instalados
  const extras = await Promise.all(todas.slice(1).map(async (o) => ((await Linking.canOpenURL(o.url).catch(() => false)) ? o : null)));
  const lista = [todas[0], ...extras.filter((o): o is (typeof todas)[number] => !!o)];
  if (lista.length === 1) return Linking.openURL(lista[0].url).catch(() => {});
  mostrarOpcoes(
    l.local || l.nome,
    lista.map((o) => ({ rotulo: o.nome, onPress: () => void Linking.openURL(o.url).catch(() => {}) })),
  );
}
