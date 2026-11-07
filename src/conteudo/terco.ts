// Contador de Ave-Marias do Rosário (roda dentro da página do leitor, em cada <div class="pf-terco">):
// - o terço: 10 contas numa corda. As rezadas ficam douradas e juntas à esquerda; as que faltam, juntas à direita; a
//   folga da corda fica entre elas, logo depois da conta atual (um pouco maior, com brilho). Tocar numa conta leva a
//   contagem até ela (para a frente ou para trás); tocar na conta atual a devolve (dá para voltar até o zero). A conta
//   tocada sai primeiro e empurra as da frente; quando chegam, as que já estavam do outro lado cedem um pouco e voltam.
// - o botão: só avança, de 0 a 10; no 10 trava e fica dourado. Volta a valer se a pessoa recuar pelas contas.
// Os dois mostram a mesma contagem. Cada mudança manda { tipo: 'conta', fim } para o app (vibração).
// O toque no contador não mostra nem esconde a barra do leitor (ver o clique em `paginaHtml`).

import type { Paleta } from '@/tema';

export function cssTerco(cor: Paleta) {
  const v = cor.escuro
    ? { fundo: 'rgba(222,190,130,.08)', corda: 'rgba(222,190,130,.5)', conta: '#59627A', sombra: '#2B3140', brilho: '#C9D0DE' }
    : { fundo: 'rgba(188,140,68,.09)', corda: 'rgba(143,100,36,.5)', conta: '#E9DFCC', sombra: '#B3A07F', brilho: '#FFFFFF' };
  return `
.pf-terco{--tcFundo:${v.fundo};--tcCorda:${v.corda};--tcConta:${v.conta};--tcSombra:${v.sombra};--tcBrilho:${v.brilho};max-width:400px;margin:.3em auto 1.3em;padding:10px 14px 14px;border-radius:22px;background:var(--tcFundo);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
.pf-fio{position:relative;height:42px}
.pf-corda{position:absolute;left:-6px;right:-6px;top:50%;height:2px;margin-top:-1px;border-radius:1px;background:var(--tcCorda)}
.pf-conta{position:absolute;left:0;top:10px;width:22px;height:22px;padding:0;margin:0;border:0;border-radius:50%;-webkit-appearance:none;appearance:none;outline:none;cursor:pointer;background:radial-gradient(circle at 34% 30%,var(--tcBrilho) 0,var(--tcConta) 48%,var(--tcSombra) 100%);box-shadow:0 1px 2px rgba(0,0,0,.22);transition:transform .42s cubic-bezier(.3,1.4,.5,1),box-shadow .3s;will-change:transform}
.pf-conta::after{content:'';position:absolute;left:-1px;right:-1px;top:-10px;bottom:-10px}
.pf-conta.pf-rezada{background:radial-gradient(circle at 34% 30%,#FFF4DA 0,#D9AE5F 48%,#8A5F22 100%)}
.pf-completo .pf-conta{box-shadow:0 0 8px 1px rgba(222,170,80,.55)}
.pf-conta.pf-atual{box-shadow:0 0 12px 3px rgba(222,170,80,.7),0 1px 2px rgba(0,0,0,.25)}
.pf-parado .pf-conta{transition:none!important}
.pf-contador{display:block;margin:6px auto 0;min-width:176px;padding:9px 20px;border-radius:22px;border:1.5px solid var(--dt);background:transparent;color:var(--dt);font:600 15px/1.2 -apple-system,system-ui,"Helvetica Neue",Roboto,sans-serif;-webkit-appearance:none;appearance:none;outline:none;cursor:pointer;transition:background .25s,color .25s,transform .1s}
.pf-contador:active{transform:scale(.96)}
.pf-contador .pf-num{display:inline-block;min-width:1.2em;text-align:center;font-weight:800;font-variant-numeric:tabular-nums}
.pf-contador.pf-fim{background:var(--dt);color:var(--bg);cursor:default;transform:none}
`;
}

export const JS_TERCO = String.raw`
(function(){
  var caixas = document.querySelectorAll('.pf-terco');
  if (!caixas.length) return;
  function post(o){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  var N = 10, S = 3, ESCALA = 1.2, PASSO = 45;
  Array.prototype.forEach.call(caixas, function(caixa){
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

    // tamanho das contas pela largura; a folga (G) é o que sobra da corda
    function medir(){
      var W = fio.clientWidth || 300;
      d = Math.max(16, Math.min(26, Math.floor((W - (N - 1) * S - 26) / N)));
      G = Math.max(8, W - N * d - (N - 1) * S);
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
      botao.innerHTML = fim ? '10 Ave-Marias ✓' : 'Ave-Maria <span class="pf-num">' + c + '</span> de ' + N;
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
