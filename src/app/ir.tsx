// Links portafidei://ir?d=... abertos de fora do app (WhatsApp, Safari...): vai para a parte certa.

import { Redirect, useLocalSearchParams } from 'expo-router';

import { rotaDoLink } from '@/util/destinos';

export default function Ir() {
  const p = useLocalSearchParams<Record<string, string>>();
  const r = rotaDoLink(p as Record<string, string>);
  return <Redirect href={r ? ({ pathname: r.pathname, params: r.params } as any) : '/'} />;
}
