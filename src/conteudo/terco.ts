// Comportamento do Santo Rosário dentro da página do leitor (o HTML vem de `conteudo/rosario.ts`). Só entra nas
// páginas que têm essas partes (ver `paginaHtml`).
//
// O que abre e fecha:
// - `.pf-dobra` (título tocável, com setinha vermelha) abre e fecha o `.pf-corpo` de mesmo id;
// - a meditação (`.pf-med`, `data-med`): 0 = só "Meditação"; 1 = a meditação breve e "mais meditação…"; 2 = também a
//   leitura com a virtude, e "menos…" (volta ao 1). Tocar em "Meditação" fecha tudo.
// - `window.pfMostrar(el)`: abre o que estiver fechado em volta de um trecho (a busca na página usa).
//
// O contador de Ave-Marias (`.pf-terco`, `data-contas` = 3 ou 10):
// - o terço: as contas numa corda. As rezadas ficam douradas e juntas à esquerda; as que faltam, juntas à direita; a
//   folga da corda fica entre elas, logo depois da conta atual (um pouco maior, com brilho). Tocar numa conta leva a
//   contagem até ela (para a frente ou para trás); tocar na conta atual a devolve (dá para voltar até o zero). A conta
//   tocada sai primeiro e empurra as da frente; quando chegam, as que já estavam do outro lado cedem um pouco e voltam.
//   O de 3 (as três Ave-Marias do começo) tem as contas do mesmo tamanho e espaço do de 10, numa caixa menor, no centro.
// - o botão: só avança; no fim trava e fica dourado. Volta a valer se a pessoa recuar pelas contas.
// Os dois mostram a mesma contagem. Cada conta manda { tipo: 'conta', fim } e cada abre-e-fecha { tipo: 'dobra' } para o
// app (vibração). Esses toques não mostram nem escondem a barra do leitor (ver o clique em `paginaHtml`).

import type { Paleta } from '@/tema';

const SETA =
  "content:'';display:inline-block;width:.38em;height:.38em;margin-left:.45em;border-right:.12em solid var(--rb);border-bottom:.12em solid var(--rb);transform:translateY(-.2em) rotate(45deg);transition:transform .2s";

export function cssRosario(cor: Paleta) {
  const v = cor.escuro
    ? { fundo: 'rgba(222,190,130,.08)', corda: 'rgba(222,190,130,.5)', conta: '#59627A', sombra: '#2B3140', brilho: '#C9D0DE' }
    : { fundo: 'rgba(188,140,68,.09)', corda: 'rgba(143,100,36,.5)', conta: '#E9DFCC', sombra: '#B3A07F', brilho: '#FFFFFF' };
  return `
/* abre e fecha */
.pf-dobra,.pf-med-rot,.pf-mais,.pf-menos{cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
.pf-dobra::after,.pf-med[data-med="0"] .pf-med-rot::after,.pf-mais::after,.pf-menos::after{${SETA}}
.pf-dobra.pf-aberto::after,.pf-menos::after{transform:translateY(.06em) rotate(-135deg)}
.pf-med:not([data-med="0"]) .pf-med-rot::after{content:':'}
.pf-corpo{display:none}
.pf-corpo.pf-aberto{display:block}
.pf-med[data-med="0"] .pf-med-txt,.pf-med:not([data-med="2"]) .pf-leitura{display:none}
.pf-med:not([data-med="1"]) .pf-mais,.pf-med:not([data-med="2"]) .pf-menos{display:none}
.pf-mais::before{content:'mais meditação…'}
.pf-menos::before{content:'menos…'}
.pf-virtude{font-style:italic}
/* terço */
.pf-terco{--tcFundo:${v.fundo};--tcCorda:${v.corda};--tcConta:${v.conta};--tcSombra:${v.sombra};--tcBrilho:${v.brilho};max-width:400px;margin:.3em auto 1.3em;padding:10px 14px 14px;border-radius:22px;background:var(--tcFundo);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
.pf-terco3{width:-webkit-fit-content;width:fit-content;max-width:none}
.pf-fio{position:relative;height:42px;margin:0 auto}
.pf-corda{position:absolute;left:-6px;right:-6px;top:50%;height:2px;margin-top:-1px;border-radius:1px;background:var(--tcCorda)}
.pf-conta{position:absolute;left:0;top:10px;width:22px;height:22px;padding:0;margin:0;border:0;border-radius:50%;-webkit-appearance:none;appearance:none;outline:none;cursor:pointer;background:radial-gradient(circle at 34% 30%,var(--tcBrilho) 0,var(--tcConta) 48%,var(--tcSombra) 100%);box-shadow:0 1px 2px rgba(0,0,0,.22);transition:transform .42s cubic-bezier(.3,1.4,.5,1),box-shadow .3s;will-change:transform}
.pf-conta::after{content:'';position:absolute;left:-1px;right:-1px;top:-10px;bottom:-10px}
.pf-conta.pf-rezada{background:radial-gradient(circle at 34% 30%,#FFF4DA 0,#D9AE5F 48%,#8A5F22 100%)}
.pf-completo .pf-conta{box-shadow:0 0 8px 1px rgba(222,170,80,.55)}
.pf-conta.pf-atual{box-shadow:0 0 12px 3px rgba(222,170,80,.7),0 1px 2px rgba(0,0,0,.25)}
.pf-parado .pf-conta{transition:none!important}
.pf-contador{display:block;margin:6px auto 0;min-width:176px;padding:9px 20px;border-radius:22px;border:1.5px solid var(--dt);background:transparent;color:var(--dt);font:600 15px/1.2 -apple-system,system-ui,"Helvetica Neue",Roboto,sans-serif;-webkit-appearance:none;appearance:none;outline:none;cursor:pointer;transition:background .25s,color .25s,transform .1s}
.pf-terco3 .pf-contador{min-width:0;padding:9px 18px}
.pf-contador:active{transform:scale(.96)}
.pf-contador .pf-num{display:inline-block;min-width:1.2em;text-align:center;font-weight:800;font-variant-numeric:tabular-nums}
.pf-contador.pf-fim{background:var(--dt);color:var(--bg);cursor:default;transform:none}
`;
}

export const JS_ROSARIO = String.raw`
(function(){
  function post(o){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }

  // ------------------------------------------------------------------ abre e fecha
  function abrir(t, sim){
    var corpo = document.getElementById(t.getAttribute('data-dobra'));
    t.classList.toggle('pf-aberto', sim);
    t.setAttribute('aria-expanded', sim ? 'true' : 'false');
    if (corpo) corpo.classList.toggle('pf-aberto', sim);
  }
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-dobra],[data-acao]');
    if (!t) return;
    if (t.hasAttribute('data-dobra')) abrir(t, !t.classList.contains('pf-aberto'));
    else {
      var med = t.closest('.pf-med'), est = +med.getAttribute('data-med'), acao = t.getAttribute('data-acao');
      med.setAttribute('data-med', acao === 'med' ? (est ? 0 : 1) : acao === 'mais' ? 2 : 1);
    }
    post({ tipo: 'dobra' });
  });
  window.pfMostrar = function(el){
    var corpo = el.closest && el.closest('.pf-corpo');
    if (corpo && !corpo.classList.contains('pf-aberto')){
      var t = document.querySelector('[data-dobra="' + corpo.id + '"]');
      if (t) abrir(t, true);
    }
    var med = el.closest && el.closest('.pf-med');
    if (med){
      if (el.closest('.pf-leitura')) med.setAttribute('data-med', 2);
      else if (med.getAttribute('data-med') === '0') med.setAttribute('data-med', 1);
    }
  };

  // ------------------------------------------------------------------ terço
  var S = 3, ESCALA = 1.2, PASSO = 45;
  Array.prototype.forEach.call(document.querySelectorAll('.pf-terco'), function(caixa){
    var N = +caixa.getAttribute('data-contas') || 10;
    var c = 0, d = 22, G = 40;
    caixa.innerHTML = '<div class="pf-fio"><div class="pf-corda"></div></div><button type="button" class="pf-contador" aria-live="polite"></button>';
    var fio = caixa.firstChild, botao = caixa.lastChild, contas = [];
    for (var n = 0; n < N; n++) (function(i){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pf-conta';
      b.setAttribute('aria-label', 'Ave-Maria ' + (i + 1) + ' de ' + N);
      // tocar na conta atual a devolve; em qualquer outra, a contagem vai até ela
      b.addEventListener('click', function(){ mudar(i === c - 1 ? i : i + 1); });
      fio.appendChild(b); contas.push(b);
    })(n);

    // o tamanho das contas e a folga da corda são os do terço de 10 nesta largura (o de 3 usa os mesmos)
    function medir(){
      var pai = caixa.parentElement ? caixa.parentElement.clientWidth : 0;
      var W10 = Math.min(pai || 340, 400) - 28;
      d = Math.max(16, Math.min(26, Math.floor((W10 - 9 * S - 26) / 10)));
      G = Math.max(8, W10 - 10 * d - 9 * S);
      if (N !== 10) fio.style.width = (N * d + (N - 1) * S + G) + 'px';
      fio.style.height = (d + 20) + 'px';
      for (var i = 0; i < N; i++){ var s = contas[i].style; s.width = s.height = d + 'px'; s.top = '10px'; }
    }
    function x(i){ return i * (d + S) + (i >= c ? G : 0); }
    function tr(i, desvio){ return 'translateX(' + (x(i) + (desvio || 0)) + 'px) scale(' + (i === c - 1 ? ESCALA : 1) + ')'; }
    function desenhar(){
      for (var i = 0; i < N; i++){
        var b = contas[i];
        b.style.transform = tr(i);
        b.classList.toggle('pf-rezada', i < c);
        b.classList.toggle('pf-atual', i === c - 1);
      }
      var fim = c >= N;
      caixa.classList.toggle('pf-completo', fim);
      botao.disabled = fim;
      botao.classList.toggle('pf-fim', fim);
      botao.innerHTML = fim ? N + ' Ave-Marias ✓' : 'Ave-Maria <span class="pf-num">' + c + '</span> de ' + N;
    }
    function mudar(novo){
      var velho = c;
      if (novo === velho) return;
      c = novo;
      var de = Math.min(velho, novo), ate = Math.max(velho, novo), avanca = novo > velho;
      for (var i = 0; i < N; i++){
        // a conta tocada sai primeiro e empurra as da frente
        var ordem = avanca ? (novo - 1 - i) : (i - novo);
        contas[i].style.transitionDelay = (i >= de && i < ate) ? (ordem * PASSO) + 'ms' : '0ms';
      }
      desenhar();
      setTimeout(function(){ empurrar(avanca, de, ate); }, (ate - de - 1) * PASSO + 170);
      post({ tipo: 'conta', fim: c >= N });
    }
    // quando as contas chegam ao outro lado, as que já estavam lá cedem um pouco e voltam
    function empurrar(avanca, de, ate){
      var grupo = [], i;
      if (avanca) for (i = de - 1; i >= 0; i--) grupo.push(i);
      else for (i = ate; i < N; i++) grupo.push(i);
      grupo.forEach(function(j, k){
        var b = contas[j], amp = 5 - k * 1.1;
        if (amp <= 0 || !b.animate) return;
        b.animate([{ transform: tr(j) }, { transform: tr(j, avanca ? -amp : amp) }, { transform: tr(j) }], { duration: 300, delay: k * 40, easing: 'ease-out' });
      });
    }
    botao.addEventListener('click', function(){ if (c < N) mudar(c + 1); });

    function semAnimar(){ caixa.classList.add('pf-parado'); medir(); desenhar(); void caixa.offsetWidth; caixa.classList.remove('pf-parado'); }
    semAnimar();
    var largura = window.innerWidth;
    window.addEventListener('resize', function(){ if (window.innerWidth === largura) return; largura = window.innerWidth; semAnimar(); });
  });
})();
`;
