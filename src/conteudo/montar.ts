// Junta as partes de uma Hora num único HTML e gera a página do leitor (com o visual do app).

import type { Ajustes } from '@/estado/ajustes';
import { JS_NAVEGAR } from '@/conteudo/navegar';
import type { Paleta } from '@/tema';
import type { Parte, PlanoHora } from '@/liturgia/horas';
import { ler } from '@/conteudo/pacote';

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

/**
 * Ajusta o HTML do pacote para a leitura no celular, sem mudar o texto:
 * - rubricas longas que vinham dentro de <sup>/<sub> viram um bloco de rubrica (tamanho legível, sem sobrescrito);
 * - referência ao lado do título (ex.: "Antífona de entrada" + "Is 61,10") vai para a direita, como no Missal.
 */
export function normalizar(html: string): string {
  const semTags = (t: string) => t.replace(/<[^>]+>/g, '').replace(/&nbsp;|\s+/g, ' ').trim();
  let h = html.replace(/<(sup|sub)>([\s\S]*?)<\/\1>/g, (m, _t, dentro: string) =>
    semTags(dentro).length > 8 ? `<span class="rub">${dentro}</span>` : m,
  );
  h = h.replace(/<sub>([\s\S]*?)<\/sub>/g, '$1');
  h = h.replace(/(<span class="r">[^<]{2,40}<\/span>)<span>(?:<span class="r">)?([^<]{2,40})(?:<\/span>)?<\/span>/g, '$1<span class="refdir">$2</span>');
  return h;
}

const temSalmodia = (html: string) => /Salmodia|Salmo\s+\d|Ant\.\s*1/i.test(html);

async function lerParte(p: Parte): Promise<string | null> {
  const bruto = await ler(p.arquivo);
  if (bruto == null) return null;
  let html = normalizar(cortar(bruto, p.desde, p.ate));
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

export interface ExtrasHora {
  antifonaInvitatorio?: string; // texto da antífona do dia (com \n nas quebras)
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function montarHora(plano: PlanoHora, aj: Ajustes, extras: ExtrasHora = {}): Promise<Montado> {
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

  // Invitatório: a antífona do dia entra em todos os lugares marcados no arquivo
  if (corpo.includes('id="antifonaInvitatorio')) {
    const ant = extras.antifonaInvitatorio
      ? escapar(extras.antifonaInvitatorio).replace(/\n/g, '<br/>')
      : '<span class="lacuna">Antífona do dia (em digitalização)</span>';
    corpo = corpo.replace(/<span id="antifonaInvitatorio\d+">\s*<\/span>/g, `<span class="antinv">${ant}</span>`);
    corpo = corpo.replace(/<span id="coletasalmodica">\s*<\/span>/g, '');
  }

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
  let trecho = normalizar(cortar(h, desde));
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
  /** horas: segue o ajuste de alinhamento; texto: respeita o alinhamento do original */
  tipo?: 'horas' | 'texto';
}

export function paginaHtml(corpo: string, aj: Ajustes, cor: Paleta, op: OpcoesPagina = {}): string {
  const familia =
    aj.fonte === 'serifa'
      ? `"Times New Roman", "New York", ui-serif, Georgia, serif`
      : `-apple-system, system-ui, "Helvetica Neue", sans-serif`;
  const horasEsquerda = op.tipo === 'horas' && aj.alinhamento === 'esquerda';
  const cab = op.titulo
    ? `<header><h1>${op.titulo}</h1>${op.subtitulo ? `<p>${op.subtitulo}</p>` : ''}</header>`
    : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<style>
:root{--bg:${cor.leitorFundo};--tx:${cor.leitorTexto};--rb:${cor.rubrica};--dt:${cor.destaque};--fr:${cor.textoFraco};}
*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--tx);}
body{font-family:${familia};font-size:${aj.tamanhoFonte}px;line-height:1.42;padding:${(op.topoExtra ?? 0) + 8}px 20px ${(op.rodapeExtra ?? 0) + 120}px;-webkit-text-size-adjust:100%;word-wrap:break-word;-webkit-hyphens:manual;}
header{text-align:center;margin:4px 0 20px}
header h1{font-size:1.25em;font-weight:600;margin:0;color:var(--dt);letter-spacing:.01em}
header p{margin:4px 0 0;font-size:.8em;color:var(--fr);line-height:1.3}
.parte{text-align:left}
.c{text-align:center}
${horasEsquerda ? '.c,[align=center],center{text-align:left!important}' : ''}
p{margin:0 0 .9em}
.r,.r *{color:var(--rb)}
b,strong{font-weight:700}
i,em{font-style:italic}
sup{font-size:.62em;line-height:0;vertical-align:.55em}
sup sup{font-size:1em;vertical-align:0}
.rub{font-size:.78em;line-height:1.35;color:var(--rb);display:inline-block;margin:.15em 0}
.rub *{font-size:1em}
.refdir{float:right;color:var(--rb);font-size:.92em;margin-left:12px}
.antinv{font-weight:700}
.cruz{color:var(--rb);margin-right:6px}
a{color:inherit;text-decoration:none}
a u,u{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}
.lacuna{display:inline-block;color:var(--fr);font-style:italic;font-size:.85em;border:1px dashed var(--fr);border-radius:10px;padding:2px 8px;margin:2px 0}
.resp{color:var(--tx);opacity:.85}
.emenda{height:0}
.faixa{margin:30px 0 10px;text-align:center;color:var(--dt);font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:.72em;font-family:-apple-system,system-ui,sans-serif}
hr{border:0;border-top:1px solid var(--fr);opacity:.3;margin:18px 0}
img{max-width:100%;height:auto;border-radius:14px}
table{width:100%}
/* Liturgia Diária (texto da CNBB) */
.cnbb{text-align:left}
.cnbb .sec{text-align:center;color:var(--rb);letter-spacing:.06em;margin:1.7em 0 .35em}
.cnbb .lema{text-align:right;margin:.1em 0 .7em}
.cnbb .vl{display:flex;align-items:baseline}
.cnbb .vn{flex:0 0 2.3em;font-size:.6em;color:var(--rb);white-space:nowrap;overflow:hidden}
.cnbb .vt{flex:1;min-width:0}
.cnbb .ref{color:var(--rb);opacity:.85}
.cnbb .cel{text-align:center;margin:0 0 4px}
.cnbb .nota{text-align:center;color:var(--fr);font-style:italic;font-size:.8em;margin:0 0 6px}
.missa{text-align:left;margin:0 0 1.2em}
/* Textos da Comunidade (Proposta, orações, jornadas) */
.com{text-align:left}
.com p{margin:0 0 .85em}
.com h2.sc{font-size:.74em;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--rb);text-align:center;margin:2em 0 .8em;font-family:-apple-system,system-ui,sans-serif}
.com h2.sc:first-child{margin-top:.4em}
.com .scsub{text-align:center;font-weight:700;margin:-.4em 0 .9em}
.com .dia{text-align:center;color:var(--dt);font-weight:600;margin:0 0 1em}
mark.pfm{background:rgba(222,190,130,.4);color:inherit;border-radius:3px;padding:0 1px}
mark.pfa{background:#E5A33A;color:#1a1208}
.fonte{color:var(--fr);font-size:.72em;text-align:center;margin:28px 0 0!important;font-family:-apple-system,system-ui,sans-serif}
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
  document.addEventListener('touchstart',function(){ post({tipo:'tocou'}); },{passive:true});
  document.addEventListener('click',function(e){
    var a=e.target.closest && e.target.closest('a');
    if(a){ e.preventDefault(); post({tipo:'link', href:a.getAttribute('href'), titulo:a.getAttribute('data-titulo')||a.textContent}); return; }
    post({tipo:'toque'});
  });
  var antes=0; window.addEventListener('scroll',function(){ var y=window.scrollY; if(Math.abs(y-antes)>40){ post({tipo:'rolou', desce:y>antes, y:y}); antes=y; } },{passive:true});
})();
</script>
<script>window.pfTopo=${op.topoExtra ?? 0};${JS_NAVEGAR}</script></body></html>`;
}
