// Instrução Geral sobre a Liturgia das Horas (arquivo IGLH do pacote). No original, o índice do começo levava a
// cada capítulo, a seta ↑ do título do capítulo voltava ao índice, o número de cada nota levava ao rodapé e a ↑ da
// nota voltava ao texto. A conversão perdeu os links e deixou as setas soltas: aqui eles voltam. Os elementos com
// `data-ir` rolam a página até o elemento com aquele id (script de `paginaHtml`, em montar.ts).
//
// As notas são numeradas por capítulo (cada capítulo recomeça do 1): o número N no texto do capítulo K aponta para
// a nota N do bloco "CAPÍTULO K" das "NOTAS DE RODAPÉ". Número sem nota no pacote fica como estava.

const SETA = (alvo: string, rotulo: string) => `<span class="pf-volta" data-ir="${alvo}" role="link" aria-label="${rotulo}">↑</span>`;

export function ligarIglh(html: string): string {
  const iNotas = html.indexOf('NOTAS DE RODAP');
  if (iNotas < 0 || !html.includes('↑')) return html;
  let texto = html.slice(0, iNotas);
  let notas = html.slice(iNotas);

  // 1. Quais notas existem (capítulo e número), para só ligar o que tem destino
  const existe = new Set<string>();
  let cap = '';
  for (const m of notas.matchAll(/<span class="r">CAPÍTULO\s+([IVX]+)<\/span>|<sup>\s*(\d+)\s*<\/sup>/g)) {
    if (m[1]) cap = m[1];
    else if (cap) existe.add(`${cap}-${m[2]}`);
  }

  // 2. Índice do começo: o título ganha um id e cada capítulo vira link para o título do capítulo
  const iPrimeiro = texto.search(/CAPÍTULO\s+[IVX]+\s*↑/);
  if (iPrimeiro > 0) {
    let cabeca = texto.slice(0, iPrimeiro);
    cabeca = cabeca.replace('<span class="r"><b>ÍNDICE</b></span>', '<span class="r" id="pf-indice"><b>ÍNDICE</b></span>');
    cabeca = cabeca.replace(/(CAPÍTULO\s+([IVX]+)\s+-\s+[^<]+?)(\s*<br\/>)/g, '<span class="pf-ir" data-ir="pf-cap-$2" role="link">$1</span>$3');
    texto = cabeca + texto.slice(iPrimeiro);
  }

  // 3. No texto: títulos dos capítulos (a ↑ volta ao índice) e números das notas (levam ao rodapé)
  cap = '';
  const refs = new Set<string>();
  texto = texto.replace(/(?:<sup>\s*<\/sup>)?CAPÍTULO\s+([IVX]+)\s*↑|<sup>\s*(\d+)\s*<\/sup>/g, (todo, c: string, n: string) => {
    if (c) {
      cap = c;
      return `<span id="pf-cap-${c}"></span>CAPÍTULO ${c} ${SETA('pf-indice', 'Voltar ao índice')}`;
    }
    const k = `${cap}-${n}`;
    if (!cap || !existe.has(k)) return todo;
    const id = refs.has(k) ? '' : ` id="pf-r-${k}"`;
    refs.add(k);
    return `<sup class="pf-nota" data-ir="pf-n-${k}" role="link"${id}>${n}</sup>`;
  });

  // 4. No rodapé: cada nota ganha um id e a ↑ dela volta ao ponto do texto (sem esse ponto, ao título do capítulo)
  cap = '';
  let nota = '';
  notas = notas.replace(/<span class="r">CAPÍTULO\s+([IVX]+)<\/span>|<sup>\s*(\d+)\s*<\/sup>|↑/g, (todo, c: string, n: string) => {
    if (c) {
      cap = c;
      nota = '';
      return todo;
    }
    if (n) {
      nota = `${cap}-${n}`;
      return cap ? `<sup id="pf-n-${nota}">${n}</sup>` : todo;
    }
    if (!cap) return todo;
    const alvo = nota && refs.has(nota) ? `pf-r-${nota}` : `pf-cap-${cap}`;
    nota = ''; // uma seta por nota
    return SETA(alvo, 'Voltar ao texto');
  });

  return texto + notas;
}
