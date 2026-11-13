// "Outros santos deste dia": nomes e títulos do Martirológio Romano (sem os elogios).
// Os santos já celebrados no calendário do dia não entram na lista.

import dados from './martirologio.json';

const LISTA = dados as unknown as Record<string, string[]>;

/** Nomes do Martirológio para a data (AAAA-MM-DD) */
export function santosDoDia(dataIso: string): string[] {
  return LISTA[dataIso.slice(5, 10)] ?? [];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Na vida do santo: um botão que abre a página "Outros santos do dia" (antes a lista vinha no fim do texto e se misturava
 *  com a vida do santo; pedido do seminarista, 0.7.0). O leitor abre `pf://martirologio/<data>`. */
export function htmlBotaoMartirologio(dataIso: string): string {
  const n = santosDoDia(dataIso).length;
  if (!n) return '';
  return `<p><a class="pf-botao" href="pf://martirologio/${dataIso}" data-titulo="Outros santos do dia">Outros santos deste dia (${n}) ›</a></p>`;
}

/** Seção em HTML para o leitor */
export function htmlMartirologio(dataIso: string, titulo = 'Outros santos deste dia'): string {
  const l = santosDoDia(dataIso);
  if (!l.length) return '';
  return `<section class="parte com"><h2 class="sc">${titulo}</h2>${l.map((n) => `<p style="margin:0 0 .55em">${esc(n)}</p>`).join('')}<p class="fonte">Segundo o Martirológio Romano</p></section>`;
}
