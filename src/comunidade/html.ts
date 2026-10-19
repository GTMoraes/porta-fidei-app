// Textos da Comunidade (Proposta, orações, novenas) em HTML para o Leitor.

import type { Proposta, SecaoProposta } from '@/servidor/api';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Parágrafos separados por linha em branco; linha simples vira quebra. V./R. ganham a cor das rubricas. */
export function textoParaHtml(texto: string): string {
  return texto
    .trim()
    .split(/\n{2,}/)
    .map((p) => {
      const linhas = esc(p.trim())
        .split('\n')
        .map((l) => l.replace(/^(V\.|R\.|℣\.?|℟\.?)\s*/, '<span class="r">$1</span> '))
        .map((l) => (l.length < 45 && /:$/.test(l) && !l.includes('<') ? `<b>${l}</b>` : l));
      return `<p>${linhas.join('<br/>')}</p>`;
    })
    .join('');
}

export function secaoHtml(s: SecaoProposta): string {
  return `<h2 class="sc">${esc(s.titulo)}</h2>${s.subtitulo ? `<p class="scsub">${esc(s.subtitulo)}</p>` : ''}${textoParaHtml(s.texto)}`;
}

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function semana(p: Pick<Proposta, 'inicio' | 'fim'>): string {
  if (!p.inicio || !p.fim) return '';
  const [, mi, di] = p.inicio.split('-').map(Number);
  const [, mf, df] = p.fim.split('-').map(Number);
  return mi === mf ? `${di} a ${df} de ${MES[mf - 1]}` : `${di} de ${MES[mi - 1]} a ${df} de ${MES[mf - 1]}`;
}

/** Instruções no começo (como no PDF, bom para quem está começando) ou no fim ("Pular instruções" nos Ajustes).
 *  No começo, vêm com um convite discreto para quem já está habituado. */
export function propostaHtml(p: Proposta, pularInstrucoes = false): string {
  const ehInstr = (s: SecaoProposta) => /^Instru/i.test(s.titulo);
  const instr = p.secoes.filter(ehInstr);
  const resto = p.secoes.filter((s) => !ehInstr(s));
  const dica = instr.length
    ? '<p class="dica"><a href="pf://ajuste/instrucoes">Se você já está habituado e deseja pular as instruções, toque aqui.</a></p>'
    : '';
  const ordem = pularInstrucoes ? resto.map(secaoHtml).join('') + instr.map(secaoHtml).join('') : dica + instr.map(secaoHtml).join('') + resto.map(secaoHtml).join('');
  return `<section class="parte com">${ordem}<p class="fonte">Material de Oração Pessoal · Comunidade Católica Porta Fidei</p></section>`;
}

export function oracaoHtml(texto: string): string {
  return `<section class="parte com">${textoParaHtml(texto)}</section>`;
}
