// Junta as partes de uma Hora num único HTML e gera a página do leitor (com o visual do app).

import type { Ajustes } from '@/estado/ajustes';
import type { Paleta } from '@/tema';
import type { Parte, PlanoHora } from '@/liturgia/horas';
import { ler } from './pacote';

function cortar(html: string, desde?: string, ate?: string): string {
  let ini = 0;
  if (desde) {
    const porId = html.indexOf(`id="${desde}"`);
    if (porId >= 0) ini = Math.max(0, html.lastIndexOf('<', porId));
    else {
      const porTexto = html.indexOf(desde);
      if (porTexto >= 0) ini = Math.max(0, html.lastIndexOf('<', porTexto));
    }
  }
  let fim = html.length;
  if (ate) {
    const i = html.indexOf(ate, ini + 1);
    if (i > 0) {
      // recua até o início da tag que contém o marcador (ex.: <span class="r">Leitura breve)
      const tag = html.lastIndexOf('<', i);
      fim = tag > ini && i - tag < 60 ? tag : i;
    }
  }
  return html.slice(ini, fim);
}

const temSalmodia = (html: string) => /Salmodia|Salmo\s+\d|Ant\.\s*1/i.test(html);

async function lerParte(p: Parte): Promise<string | null> {
  const bruto = await ler(p.arquivo);
  if (bruto == null) return null;
  let html = cortar(bruto, p.desde, p.ate);
  if (p.seFaltarSalmodia && !temSalmodia(html)) {
    const base = await lerParte(p.seFaltarSalmodia);
    if (base) html = base + '<div class="emenda"></div>' + html;
  }
  return html;
}

/** Tira a "Oração" de um arquivo (ex.: oração do domingo) como texto simples com quebras */
export function extrairOracao(html: string): string | null {
  const m = html.match(/Oração\s*(<\/span>|<\/b>|<\/font>)/);
  if (!m || m.index == null) return null;
  const ini = m.index + m[0].length;
  const fim = html.indexOf('Conclusão', ini);
  if (fim < 0) return null;
  let trecho = html.slice(ini, fim);
  trecho = trecho.replace(/<span class="r">\s*$/, '');
  trecho = trecho.replace(/<(?!br\s*\/?>)[^>]+>/g, ' ');
  trecho = trecho.replace(/^(\s|<br\s*\/?>)+|(\s|<br\s*\/?>)+$/g, '').replace(/\s+/g, ' ');
  return trecho.length > 20 ? trecho : null;
}

function repetirRespostas(html: string): string {
  const iP = html.search(/>\s*Preces/);
  if (iP < 0) return html;
  const resto = html.slice(iP);
  const m = resto.match(/R\.\s*<\/span>\s*<b>([\s\S]*?)<\/b>/);
  if (!m || m.index == null) return html;
  const resposta = m[1].replace(/<[^>]+>/g, '').trim();
  const depois = m.index + m[0].length;
  const fimPreces = resto.search(/Pai nosso|Oração<|Oração\s*</);
  const limite = fimPreces > depois ? fimPreces : resto.length;
  const meio = resto
    .slice(depois, limite)
    .replace(/(<span class="r">\s*R\.\s*<\/span>)(?!\s*<b>)/g, `$1 <i class="resp">${resposta}</i>`);
  return html.slice(0, iP) + resto.slice(0, depois) + meio + resto.slice(limite);
}

export interface Montado {
  corpo: string;
  faltando: string[];
}

export async function montarHora(plano: PlanoHora, aj: Ajustes): Promise<Montado> {
  const faltando: string[] = [];
  const pedacos: string[] = [];
  for (const p of plano.partes) {
    const h = await lerParte(p);
    if (h == null) faltando.push(p.arquivo);
    else pedacos.push(`<section class="parte">${h}</section>`);
  }

  // Laudes ampliada: acrescenta as leituras do Ofício das Leituras
  if (aj.laudesAmpliada && plano.hora === 'laudes' && plano.leiturasExtras) {
    for (const p of plano.leiturasExtras) {
      const h = await lerParte(p);
      if (h) pedacos.push(`<section class="parte extra"><div class="faixa">Leituras do Ofício</div>${h}</section>`);
    }
  }

  let corpo = pedacos.join('\n');

  // lacunas dos domingos do Tempo Comum
  if (corpo.includes('data-ph=')) {
    let oracao: string | null = null;
    if (plano.oracaoDe) {
      const src = await ler(plano.oracaoDe.arquivo);
      if (src) oracao = extrairOracao(src);
    }
    corpo = corpo.replace(/<span data-ph="o"><\/span>/g, oracao ? `<span class="preenchido">${oracao}</span>` : '<span class="lacuna">Oração do domingo (em digitalização)</span>');
    corpo = corpo.replace(
      /<span data-ph="a[123]"><\/span>/g,
      `<span class="lacuna">Antífona própria do domingo, ano ${plano.diaCelebrado.anoDominical} (em digitalização)</span>`,
    );
    corpo = corpo.replace(/<span data-ph="[a-z0-9]+"><\/span>/g, '');
  }

  if (aj.repetirRespostas) corpo = repetirRespostas(corpo);
  return { corpo, faltando };
}

export async function montarArquivo(arquivo: string, desde?: string, ate?: string): Promise<Montado> {
  const h = await ler(arquivo);
  if (h == null) return { corpo: '', faltando: [arquivo] };
  // o marcador de fim só vale depois do início (ex.: do título do cântico até a antífona final)
  let trecho = cortar(h, desde);
  if (ate && desde) {
    const depoisDoTitulo = trecho.indexOf('<br', 40);
    const i = trecho.indexOf(ate, Math.max(depoisDoTitulo, 0) + 200);
    if (i > 0) {
      const fimAnt = trecho.indexOf('<br', trecho.indexOf('<br', i) + 4);
      trecho = trecho.slice(0, fimAnt > 0 ? fimAnt : i);
    }
  }
  return { corpo: `<section class="parte">${trecho}</section>`, faltando: [] };
}

/** Converte o HTML em texto corrido para a leitura em voz */
export function textoParaVoz(corpo: string): string {
  return corpo
    .replace(/<sup>[\s\S]*?<\/sup>/g, ' ')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/(p|div|section)>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[*†+]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

export interface OpcoesPagina {
  titulo?: string;
  subtitulo?: string;
  topoExtra?: number; // espaço para o cabeçalho transparente
  rodapeExtra?: number;
}

export function paginaHtml(corpo: string, aj: Ajustes, cor: Paleta, op: OpcoesPagina = {}): string {
  const familia =
    aj.fonte === 'serifa'
      ? `ui-serif, "New York", "Iowan Old Style", Georgia, serif`
      : `-apple-system, system-ui, "Helvetica Neue", sans-serif`;
  const alin = aj.alinhamento === 'centro' ? 'center' : 'left';
  const cab = op.titulo
    ? `<header><h1>${op.titulo}</h1>${op.subtitulo ? `<p>${op.subtitulo}</p>` : ''}</header>`
    : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<style>
:root{--bg:${cor.leitorFundo};--tx:${cor.leitorTexto};--rb:${cor.rubrica};--dt:${cor.destaque};--fr:${cor.textoFraco};}
*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--tx);}
body{font-family:${familia};font-size:${aj.tamanhoFonte}px;line-height:1.55;padding:${(op.topoExtra ?? 0) + 8}px 22px ${(op.rodapeExtra ?? 0) + 120}px;-webkit-text-size-adjust:100%;word-wrap:break-word;}
header{text-align:center;margin:6px 0 18px}
header h1{font-size:1.35em;font-weight:600;margin:0;color:var(--dt);letter-spacing:.01em}
header p{margin:4px 0 0;font-size:.82em;color:var(--fr)}
.c,.parte,div,p{text-align:${alin}}
.parte>div,.parte>p{margin:0}
.r,.r *{color:var(--rb)!important}
.r{font-weight:600;font-size:.92em;letter-spacing:.01em}
sup .r, sup{font-size:.6em}
b,strong{font-weight:600}
i,em{font-style:italic}
.cruz{color:var(--rb);font-size:1.1em;margin-right:6px}
a{color:var(--dt);text-decoration:none}
.lacuna{display:inline-block;color:var(--fr);font-style:italic;font-size:.88em;border:1px dashed var(--fr);border-radius:10px;padding:2px 8px;margin:2px 0}
.preenchido{}
.resp{color:var(--tx);opacity:.85}
.emenda{height:0}
.faixa{margin:28px 0 8px;text-align:center;color:var(--dt);font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:.75em}
hr{border:0;border-top:1px solid var(--fr);opacity:.3;margin:18px 0}
img{max-width:100%;height:auto;border-radius:14px}
table{width:100%}
.tit{color:var(--rb);font-weight:600;margin:22px 0 6px}
.tit.h1,.tit.h2{font-size:1.1em;color:var(--dt)}
.cnbb p{margin:0 0 10px}
.fonte{color:var(--fr);font-size:.75em;margin-top:24px!important}
</style></head><body>${cab}${corpo}
<script>
(function(){
  var vel=0, raf=null, ultimo=0;
  function passo(t){ if(!vel){raf=null;return;} if(ultimo){ window.scrollBy(0,(t-ultimo)*vel*0.012); } ultimo=t;
    if((window.innerHeight+window.scrollY)>=document.body.scrollHeight-2){ vel=0; post({tipo:'fimRolagem'}); raf=null; return; }
    raf=requestAnimationFrame(passo); }
  function post(o){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  window.pfRolar=function(v){ vel=v; ultimo=0; if(v && !raf){ raf=requestAnimationFrame(passo);} };
  window.pfFonte=function(px){ document.body.style.fontSize=px+'px'; };
  document.addEventListener('click',function(e){
    var a=e.target.closest && e.target.closest('a');
    if(a){ e.preventDefault(); post({tipo:'link', href:a.getAttribute('href'), titulo:a.getAttribute('data-titulo')||a.textContent}); return; }
    post({tipo:'toque'});
  });
  var antes=0; window.addEventListener('scroll',function(){ var y=window.scrollY; if(Math.abs(y-antes)>40){ post({tipo:'rolou', desce:y>antes, y:y}); antes=y; } },{passive:true});
})();
</script></body></html>`;
}
