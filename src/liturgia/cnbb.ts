// Liturgia Diária da CNBB (Edições CNBB). O site busca as leituras numa API por data;
// o app faz a mesma busca dentro de uma página invisível do próprio site, limpa o HTML
// (mantendo número do versículo na margem, títulos e refrão) e guarda no aparelho.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const URL_CNBB = 'https://liturgiadiaria.edicoescnbb.com.br/';
export const API_CNBB = 'https://api-liturgia.edicoescnbb.com.br/contents/in/date/';
export const DIAS_ADIANTE = 30;

export interface DiaCNBB {
  data: string;
  html: string; // leituras já limpas
  arquivo: string; // nome do arquivo do lecionário (ex.: Est51b272b3Ap121513a1516aJo2111) = nome do Comentário no pacote
  celebracao: string; // ex.: "Bem-aventurada Virgem Maria da Conceição Aparecida, Solenidade, Ano A"
  nota: string; // ex.: "Hoje, omite-se a Festa de São Lucas, Evangelista"
}

const PREFIXO = 'pf.cnbb.v1.';

export async function lerDiaCNBB(data: string): Promise<DiaCNBB | null> {
  try {
    const v = await AsyncStorage.getItem(PREFIXO + data);
    return v ? (JSON.parse(v) as DiaCNBB) : null;
  } catch {
    return null;
  }
}

export async function guardarDiaCNBB(d: DiaCNBB) {
  await AsyncStorage.setItem(PREFIXO + d.data, JSON.stringify(d)).catch(() => {});
}

/** Quais destas datas ainda não estão guardadas */
export async function faltando(datas: string[]): Promise<string[]> {
  try {
    const pares = await AsyncStorage.multiGet(datas.map((d) => PREFIXO + d));
    return pares.filter(([, v]) => !v).map(([k]) => k.slice(PREFIXO.length));
  } catch {
    return datas;
  }
}

/** Apaga dias antigos (mais de 10 dias antes de hoje) */
export async function limparAntigos(hoje: string) {
  try {
    const chaves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIXO) && k.slice(PREFIXO.length) < menosDias(hoje, 10));
    if (chaves.length) await AsyncStorage.multiRemove(chaves);
  } catch {}
}

function menosDias(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - n));
  return t.toISOString().slice(0, 10);
}

/**
 * Função (JavaScript puro, roda no navegador) que transforma o HTML da CNBB no HTML do app.
 * Exportada como texto para ser injetada na página invisível e também usada nos testes.
 */
export const JS_LIMPAR = String.raw`
function pfLimparCNBB(body){
  var doc = new DOMParser().parseFromString('<div id="pfr">' + body + '</div>', 'text/html');
  var r = doc.getElementById('pfr');
  function troca(el, tag, cls){ var n = doc.createElement(tag); if (cls) n.className = cls; while (el.firstChild) n.appendChild(el.firstChild); el.parentNode.replaceChild(n, el); return n; }
  function semEspaco(s){ return (s || '').replace(/\s/g, '').toLowerCase(); }
  [].slice.call(r.querySelectorAll('meta,script,style,h3,link')).forEach(function(x){ x.remove(); });
  [].slice.call(r.querySelectorAll('[style]')).forEach(function(x){ if (/display:none/.test(semEspaco(x.getAttribute('style')))) x.remove(); });
  // linhas de versículo: <div style="display:flex"><div>NÚMERO</div><div>TEXTO</div></div>
  [].slice.call(r.querySelectorAll('div')).forEach(function(d){
    if (!d.parentNode) return;
    var st = semEspaco(d.getAttribute('style'));
    if (st.indexOf('display:flex') < 0 || st.indexOf('flex-direction:row') < 0 || d.children.length < 2) return;
    var num = (d.children[0].textContent || '').replace(/\u00a0/g, ' ').trim();
    var linha = doc.createElement('div'); linha.className = 'vl';
    var n = doc.createElement('span'); n.className = 'vn'; n.textContent = num;
    var t = doc.createElement('div'); t.className = 'vt';
    for (var i = 1; i < d.children.length; i++) t.innerHTML += d.children[i].innerHTML;
    linha.appendChild(n); linha.appendChild(t);
    d.parentNode.replaceChild(linha, d);
  });
  // títulos centrais (PRIMEIRA LEITURA, EVANGELHO...)
  [].slice.call(r.querySelectorAll('center')).forEach(function(c){ troca(c, 'div', 'sec'); });
  // cores do site -> classes do app
  [].slice.call(r.querySelectorAll('font')).forEach(function(f){
    var cor = (f.getAttribute('color') || '').toLowerCase();
    var cls = /tomato|ff6666/.test(cor) ? 'r ref' : (cor ? 'r' : '');
    if (f.querySelector('div')) { while (f.firstChild) f.parentNode.insertBefore(f.firstChild, f); f.remove(); return; }
    troca(f, 'span', cls);
  });
  [].slice.call(r.querySelectorAll('[style]')).forEach(function(e){
    var st = semEspaco(e.getAttribute('style'));
    if (/color:(rgb\(255,0,0\)|#f00|#ff0000|red)/.test(st)) e.classList.add('r');
    e.removeAttribute('style');
  });
  [].slice.call(r.querySelectorAll('p[align]')).forEach(function(p){ if ((p.getAttribute('align') || '').toLowerCase() === 'right') p.className = 'lema'; p.removeAttribute('align'); });
  [].slice.call(r.querySelectorAll('img')).forEach(function(i){ var s = doc.createElement('span'); s.className = 'cruz'; s.textContent = '\u2720'; i.parentNode.replaceChild(s, i); });
  var manter = ['vl','vn','vt','sec','r','ref','lema','cruz'];
  [].slice.call(r.querySelectorAll('[class]')).forEach(function(e){
    var k = e.className.split(/\s+/).filter(function(c){ return manter.indexOf(c) >= 0; });
    if (k.length) e.className = k.join(' '); else e.removeAttribute('class');
  });
  [].slice.call(r.querySelectorAll('[id]')).forEach(function(e){ e.removeAttribute('id'); });
  // vazios (sem texto e sem quebra útil)
  [].slice.call(r.querySelectorAll('span,p,b,i')).forEach(function(e){ if (e.className === 'vn') return; if (!e.textContent.replace(/\u00a0/g, '').trim() && !e.querySelector('span.cruz')) { if (e.tagName === 'SPAN' && e.querySelector('br') && !e.className) return; e.remove(); } });
  var html = r.innerHTML;
  // rodapé de direitos, se algum dia vier junto
  html = html.replace(/Confer[êe]ncia Nacional dos Bispos do Brasil\s*(<br\s*\/?>)?\s*©[^<]*/gi, '');
  return html;
}
function pfDetalhesCNBB(details){
  var doc = new DOMParser().parseFromString('<div>' + (details || '') + '</div>', 'text/html');
  var cel = '', nota = '';
  [].slice.call(doc.querySelectorAll('div[style]')).forEach(function(d){
    var st = (d.getAttribute('style') || '').replace(/\s/g, '');
    if (!cel && st.indexOf('font-size:26px') >= 0) cel = d.textContent.replace(/\s+/g, ' ').trim();
  });
  var i = doc.querySelector('i'); if (i) nota = i.textContent.replace(/\s+/g, ' ').trim();
  return { celebracao: cel, nota: nota };
}
`;

/** Script injetado na página invisível do site: baixa as datas pedidas e devolve uma a uma */
export function jsBaixar(datas: string[]): string {
  return `
${JS_LIMPAR}
(function(){
  var datas = ${JSON.stringify(datas)};
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  var i = 0, ok = 0;
  function proximo(){
    if (i >= datas.length) { post({ tipo: 'fim', ok: ok }); return; }
    var data = datas[i++];
    fetch('${API_CNBB}' + data)
      .then(function(r){ if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function(j){
        var c = j && j.content;
        if (!c || !c.body) throw new Error('vazio');
        var det = pfDetalhesCNBB(c.details);
        ok++;
        post({ tipo: 'dia', data: data, html: pfLimparCNBB(c.body), arquivo: (c.filename || '').replace(/\\.html?$/i, ''), celebracao: det.celebracao, nota: det.nota });
      })
      .catch(function(e){ post({ tipo: 'erro', data: data, erro: String(e && e.message || e) }); })
      .then(function(){ setTimeout(proximo, 120); });
  }
  proximo();
})();
true;`;
}
