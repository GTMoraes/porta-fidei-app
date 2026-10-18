// Ponte entre a tela do mapa (mapa-local) e o cadastro do evento: o mapa deixa o ponto aqui e volta.

export interface PontoEscolhido {
  lat: number;
  lng: number;
  endereco?: string; // endereço aproximado do ponto (para sugerir no campo Local)
}

let pendente: PontoEscolhido | null = null;
export const deixarPonto = (p: PontoEscolhido) => (pendente = p);
export function pegarPonto(): PontoEscolhido | null {
  const p = pendente;
  pendente = null;
  return p;
}
