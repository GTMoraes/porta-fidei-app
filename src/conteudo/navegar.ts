// Script do leitor (roda dentro da página): índice das partes do texto e busca na página.
// O índice é deduzido do próprio HTML: linhas inteiras em vermelho (Hino, Salmodia, Leitura breve...),
// títulos em negrito e maiúsculas (rituais), .sec (Liturgia Diária) e h2.sc (textos da Comunidade).

export const JS_NAVEGAR = String.raw`
(function(){
  function post(o){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  var BLOCO = /^(P|DIV|CENTER|SECTION|H1|H2|H3|H4|LI|HEADER|TABLE|TR|TD|UL|OL)$/;
  var NAO = /^(V\.|R\.|Ant\.|Ou(\s|:|$)|ou\s|Ref\.|Resp\.|Pres\.|Todos(\s|:|$)|Oremos|Amém)/;
  var REF = /^[1-3]?\s?[A-Z][a-zçã]{0,3}\.?\s\d/;
  var itens = [];

  var PARTE = /^(Hino|Salmodia|Leitura|Responsório|Cântico evangélico|Preces|Oração|Conclusão|Invocação|Pai nosso|Bênção|Antífona|Exame|Hora|Evangelho|Salmo responsorial|Aclamação|Primeira|Segunda|Ritos?|Liturgia)/i;
  function titulo(t){
    t = t.replace(/\s+/g,' ').replace(/,?\s*Ant\.?$/,'').trim();
    if (/latim/i.test(t)) return '';
    if (t.length < 3 || t.length > 52) return '';
    if (!/^[A-ZÀ-Ý0-9]/.test(t) || NAO.test(t) || REF.test(t) || /[:;,]$/.test(t)) return '';
    var palavras = t.split(' ').length;
    if (palavras > 7 && !/\d/.test(t)) return '';
    return t;
  }

  // percorre o texto em "linhas" (quebra em <br> e em blocos); cada linha guarda os trechos e o tipo deles
  function linhas(raiz){
    var out = [], atual = null;
    function nova(){ if (atual && atual.partes.length) out.push(atual); atual = { partes: [] }; }
    nova();
    (function anda(n){
      for (var c = n.firstChild; c; c = c.nextSibling){
        if (c.nodeType === 3){
          if (!c.nodeValue.trim()) continue;
          var el = c.parentElement;
          var ignora = el.closest('a,sup,.rub,.refdir,header,.fonte,.nota,.cel,.antinv,.ref');
          var verm = !!el.closest('.r,.sec,h2.sc');
          var negrito = !!el.closest('b,strong');
          atual.partes.push({ no: c, t: c.nodeValue, ignora: !!ignora, verm: verm, negrito: negrito });
        } else if (c.nodeType === 1){
          if (c.tagName === 'BR'){ nova(); continue; }
          if (c.tagName === 'SCRIPT' || c.tagName === 'STYLE' || c.tagName === 'HEADER') continue;
          var bloco = BLOCO.test(c.tagName);
          if (bloco) nova();
          anda(c);
          if (bloco) nova();
        }
      }
    })(raiz);
    nova();
    return out;
  }

  function montarIndice(){
    itens = [];
    var vistos = 0;
    linhas(document.body).forEach(function(l){
      var uteis = l.partes.filter(function(p){ return !p.ignora; });
      if (!uteis.length) return;
      var texto = uteis.map(function(p){ return p.t; }).join('');
      var todoVerm = uteis.every(function(p){ return p.verm; });
      var todoNegrito = uteis.every(function(p){ return p.negrito; });
      var t = titulo(texto);
      if (!t) return;
      var maiusc = t === t.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(t);
      if (!(todoVerm || (todoNegrito && (maiusc || t.split(' ').length <= 6)))) return;
      var alvo = uteis[0].no.parentElement;
      var id = 'pfi' + (vistos++);
      alvo.setAttribute('data-pfi', id);
      var nome = maiusc ? t.charAt(0) + t.slice(1).toLowerCase() : t;
      var nivel = maiusc && todoNegrito ? 0 : (/^(Salmo|Cântico|Ct)\b/.test(t) && !/evangélico/i.test(t) ? 2 : 1);
      var ant = itens[itens.length - 1];
      // título temático logo depois do salmo ("Sede de Deus") não entra
      if (ant && /^(Salmo|Cântico)/.test(ant.titulo) && !PARTE.test(t) && !/^(Salmo|Cântico)/.test(t)) return;
      itens.push({ id: id, titulo: nome, nivel: nivel });
    });
    // o que se repete muito (antífonas) não é parte do texto
    var conta = {};
    itens.forEach(function(i){ conta[i.titulo] = (conta[i.titulo] || 0) + 1; });
    itens = itens.filter(function(i){ return conta[i.titulo] < 3; });
    // índice curto demais não vale
    if (itens.length < 3) itens = [];
    post({ tipo: 'indice', itens: itens });
    marcarAtual(true);
  }

  var ultimoAtual = -1;
  function marcarAtual(forca){
    if (!itens.length) return;
    var topo = (window.pfTopo || 0) + 24, atual = 0;
    for (var i = 0; i < itens.length; i++){
      var el = document.querySelector('[data-pfi="' + itens[i].id + '"]');
      if (el && el.getBoundingClientRect().top <= topo) atual = i; else if (el) break;
    }
    if (forca || atual !== ultimoAtual){ ultimoAtual = atual; post({ tipo: 'indiceAtual', i: atual }); }
  }
  var agendado = false;
  window.addEventListener('scroll', function(){ if (agendado) return; agendado = true; setTimeout(function(){ agendado = false; marcarAtual(false); }, 150); }, { passive: true });

  window.pfIr = function(id){
    var el = document.querySelector('[data-pfi="' + id + '"]');
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - (window.pfTopo || 0) - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  // ----------------------------------------------------------- busca na página (sem acento e sem maiúsculas)
  var marcas = [], marcaAtual = -1;
  function base(ch){ var b = ch.normalize('NFD').charAt(0).toLowerCase(); return /[a-z0-9]/.test(b) ? b : ' '; }
  function limpar(){
    marcas.forEach(function(m){ var p = m.parentNode; if (!p) return; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); });
    marcas = []; marcaAtual = -1;
  }
  window.pfLimparBusca = function(){ limpar(); post({ tipo: 'busca', total: 0, atual: 0 }); };
  window.pfBuscar = function(termo){
    limpar();
    var palavras = Array.prototype.map.call(String(termo || ''), base).join('').split(' ').filter(Boolean);
    if (palavras.join('').length < 2){ post({ tipo: 'busca', total: 0, atual: 0 }); return; }
    var re = new RegExp(palavras.join(' +'), 'g');
    var nos = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function(n){
      return n.parentElement.closest('script,style,header') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    while (w.nextNode()) nos.push(w.currentNode);
    nos.forEach(function(n){
      var txt = n.nodeValue, norm = Array.prototype.map.call(txt, base).join('');
      var pos = [], r; re.lastIndex = 0;
      while ((r = re.exec(norm))){ pos.push([r.index, r[0].length]); }
      if (!pos.length) return;
      var frag = document.createDocumentFragment(), ult = 0;
      pos.forEach(function(p){
        if (p[0] > ult) frag.appendChild(document.createTextNode(txt.slice(ult, p[0])));
        var m = document.createElement('mark'); m.className = 'pfm'; m.textContent = txt.slice(p[0], p[0] + p[1]);
        frag.appendChild(m); marcas.push(m); ult = p[0] + p[1];
      });
      if (ult < txt.length) frag.appendChild(document.createTextNode(txt.slice(ult)));
      n.parentNode.replaceChild(frag, n);
    });
    if (marcas.length) window.pfProxima(1); else post({ tipo: 'busca', total: 0, atual: 0 });
  };
  window.pfProxima = function(d){
    if (!marcas.length) return;
    if (marcaAtual >= 0) marcas[marcaAtual].classList.remove('pfa');
    marcaAtual = (marcaAtual + d + marcas.length) % marcas.length;
    var m = marcas[marcaAtual]; m.classList.add('pfa');
    var r = m.getBoundingClientRect(), alto = window.innerHeight;
    var y = r.top + window.scrollY - alto * 0.35;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    post({ tipo: 'busca', total: marcas.length, atual: marcaAtual + 1 });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarIndice); else montarIndice();
})();
`;
