/* extras.js — funciones añadidas a los lectores latino y griego:
   vocabulario del documento, repaso con tarjetas, biblioteca (Perseus) y escansión métrica.
   Usa la API que expone index.html en window.Lector. Licencia GNU GPL v3. */
(() => {
'use strict';
const L = window.Lector;
if (!L) return;
const { el, $, toast, store, idb } = L;
const GR = L.lang === 'grc';
const LG = GR ? 'grc' : 'la';
const LANGNAME = GR ? 'griego' : 'latín';
const plain = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ўЎ]/g, 'y').toLowerCase();

/* ================================================================== estilos */
const css = `
.panel.wide { width: min(46rem, calc(100vw - 24px)); }
.panel.center { left: 50%; right: auto; transform: translateX(-50%); }
.x-close { position: absolute; top: 8px; right: 8px; border: 0; background: none; font-size: 1.4rem; line-height: 1; color: var(--muted); cursor: pointer; width: 32px; height: 32px; border-radius: 8px; }
.x-close:hover { background: var(--chip); }
.panel { position: fixed; }
.x-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 10px; }
.x-row label { font-size: 0.85rem; color: var(--muted); display: inline-flex; align-items: center; gap: 6px; }
.x-row select, .x-input { height: 34px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); color: var(--ink); padding: 0 8px; font: inherit; font-size: 0.88rem; }
.x-input { flex: 1; min-width: 10rem; }
.x-btn { border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 8px; padding: 6px 12px; cursor: pointer; font: inherit; font-size: 0.88rem; }
.x-btn:hover { border-color: var(--accent); }
.x-btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.x-btn.small { padding: 2px 8px; font-size: 0.78rem; }
.x-btn[disabled] { opacity: 0.5; cursor: default; }
.x-muted { color: var(--muted); font-size: 0.86rem; }
.x-progress { height: 6px; border-radius: 3px; background: var(--chip); overflow: hidden; margin: 6px 0 10px; }
.x-progress > div { height: 100%; width: 0; background: var(--accent); transition: width 0.2s; }
.vocab-tools { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
/* vocabulario del documento */
.dv-list { list-style: none; margin: 0; padding: 0; }
.dv-list li { display: grid; grid-template-columns: 3.2em 1fr auto; gap: 4px 10px; padding: 8px 0; border-top: 1px solid var(--line); align-items: baseline; }
.dv-n { font-variant-numeric: tabular-nums; color: var(--muted); font-size: 0.85rem; text-align: right; }
.dv-lem { font-family: var(--f-text); font-weight: 700; color: var(--accent); }
.dv-ind { font-family: var(--f-text); color: var(--muted); }
.dv-tr { grid-column: 2 / 4; font-size: 0.9rem; }
.dv-forms { grid-column: 2 / 4; font-family: var(--f-text); color: var(--muted); font-size: 0.85rem; }
.dv-acts { display: flex; gap: 4px; }
.dv-sum { margin: 4px 0 8px; }
/* tarjetas */
.cards-box { min-height: 16rem; display: grid; gap: 12px; align-content: start; text-align: center; padding: 6px 4px; }
.card-front { font-family: var(--f-text); font-size: 2rem; font-weight: 700; color: var(--accent); margin-top: 18px; }
.card-front.es { font-family: var(--f-ui); font-size: 1.3rem; color: var(--ink); font-weight: 400; }
.card-ind { font-family: var(--f-text); color: var(--muted); font-size: 1.05rem; }
.card-back { border-top: 1px solid var(--line); padding-top: 12px; display: grid; gap: 8px; }
.card-tr { font-size: 1.1rem; }
.card-ctx { font-family: var(--f-text); font-style: italic; color: var(--muted); }
.card-ctx b { color: var(--ink); font-style: normal; }
.card-btns { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.card-btns .x-btn { display: grid; gap: 2px; padding: 8px 4px; }
.card-btns .x-btn small { color: var(--muted); font-size: 0.72rem; }
.card-btns .again { border-color: #c0504d; } .card-btns .easy { border-color: #4f8a4f; }
.cards-stats { display: flex; justify-content: center; gap: 14px; font-size: 0.85rem; color: var(--muted); }
/* biblioteca */
.lib-list { list-style: none; margin: 0; padding: 0; }
.lib-author { border-top: 1px solid var(--line); }
.lib-author > button { width: 100%; text-align: left; border: 0; background: none; padding: 9px 4px; cursor: pointer; font: inherit; display: flex; justify-content: space-between; gap: 8px; color: var(--ink); }
.lib-author > button b { font-weight: 700; }
.lib-author > button span { color: var(--muted); font-size: 0.85rem; }
.lib-works { list-style: none; margin: 0 0 8px; padding: 0 0 0 10px; }
.lib-works li { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; }
.lib-works button.w { border: 0; background: none; padding: 0; text-align: left; cursor: pointer; color: var(--accent); font: inherit; }
.lib-works button.w:hover { text-decoration: underline; }
.lib-works small { color: var(--muted); }
.lib-dl { color: #4f8a4f; font-size: 0.8rem; white-space: nowrap; }
.lib-note { font-size: 0.8rem; color: var(--muted); margin-top: 10px; }
/* textos TEI */
.doc .tei-h { font-family: var(--f-ui); color: var(--muted); font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; margin: 2.2em 0 0.6em; }
.doc .tei-h2 { font-family: var(--f-ui); color: var(--muted); font-size: 0.8rem; margin: 1.4em 0 0.4em; }
.doc .tei-head { font-weight: 700; text-align: center; }
.doc .tei-sec { font-family: var(--f-ui); font-size: 0.65em; color: var(--muted); vertical-align: super; margin-right: 0.2em; user-select: none; }
.doc .verses { margin: 0 0 1em; }
.doc .l { position: relative; padding-left: 0; margin: 0; line-height: 1.55; }
.doc .l[data-n]::after { content: attr(data-n); position: absolute; right: 100%; margin-right: 0.8em; font-family: var(--f-ui); font-size: 0.62em; color: var(--muted); top: 0.45em; user-select: none; }
.doc .l.nonum::after { display: none; }
.doc .stanza { margin-bottom: 0.9em; }
.doc .speaker { font-family: var(--f-ui); font-size: 0.8em; font-weight: 700; color: var(--muted); margin: 0.9em 0 0.15em; letter-spacing: 0.04em; }
.doc .tei-del { color: var(--muted); }
.doc .tei-gap { color: var(--muted); }
/* escansión */
.scan-verse { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0; font-family: var(--f-text); font-size: 1.25rem; margin: 10px 0 4px; line-height: 1.2; }
.scan-syl { display: inline-flex; flex-direction: column; align-items: center; padding: 0 1px; }
.scan-syl .m { font-family: var(--f-ui); font-size: 0.75rem; color: var(--accent); height: 1.1em; font-weight: 700; }
.scan-syl.el { color: var(--muted); }
.scan-syl.el .m { color: transparent; }
.scan-sp { width: 0.45em; }
.scan-foot { width: 1px; align-self: stretch; background: var(--accent); opacity: 0.45; margin: 0 4px; }
.scan-caes { font-family: var(--f-ui); color: #c0504d; font-weight: 700; margin: 0 2px; align-self: center; }
.scan-pattern { font-family: var(--f-ui); color: var(--muted); font-size: 0.9rem; margin: 8px 0; letter-spacing: 0.06em; }
.scan-q { font-family: var(--f-text); font-size: 1.15rem; margin: 6px 0 10px; }
.scan-nav { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; }
.pop-foot .x-scan { border: 0; background: none; padding: 0; color: var(--accent); cursor: pointer; font: inherit; text-decoration: underline; }
@media print {
  body.x-print > *:not(#panelDocVocab) { display: none !important; }
  body.x-print #panelDocVocab { position: static !important; width: auto !important; max-height: none !important; box-shadow: none !important; border: 0 !important; transform: none !important; }
  body.x-print #panelDocVocab .x-noprint { display: none !important; }
}
`;
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

/* ================================================================== utilidades */
function panel(id, title, cls) {
  const p = el('div', 'panel' + (cls ? ' ' + cls : '')); p.id = id; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', title);
  const h = el('h2', null, title); const x = el('button', 'x-close x-noprint', '×'); x.type = 'button'; x.title = 'Cerrar'; x.setAttribute('aria-label', 'Cerrar');
  x.addEventListener('click', () => { p.hidden = true; });
  p.append(h, x); document.body.appendChild(p);
  return p;
}
function openPanel(p) { L.closePanels(); L.closePop(); p.hidden = false; }
function btn(text, cls, fn) { const b = el('button', 'x-btn' + (cls ? ' ' + cls : ''), text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
function download(text, name, type) {
  try {
    const blob = new Blob([text], { type: type || 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return true;
  } catch (e) { return false; }
}
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const DAY = 86400000;

/* ================================================================== texto del documento */
const WORD_RE = GR ? /[\p{L}\p{M}]+[’ʼ᾽'᾿]?/gu : /[\p{L}]+/gu;
const IS_LANG = GR ? (w) => /[Ͱ-Ͽἀ-῿]/.test(w) : (w) => /^[A-Za-zÀ-ÿĀ-ž]+$/.test(w) && /[aeiouyAEIOUY]/.test(w);
function cleanText(t) {
  return t.replace(/­/g, '').replace(/(\p{L})[-‐‑¬]\s*\n\s*(\p{L})/gu, '$1$2');
}
function visibleStartNode() {
  const rr = L.reader.getBoundingClientRect();
  const w = document.createTreeWalker(L.docEl, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (!n.data.trim()) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const b = r.getBoundingClientRect();
    if (b.bottom >= rr.top + 4 && b.height > 0) return n;
  }
  return null;
}
async function documentText(scope, onProg) {
  if (L.Pdf.active()) {
    const N = L.Pdf.numPages(); let start = 1;
    if (scope !== 'all') { const c = L.Pdf.currentPage(); if (c) start = c.n; }
    const lim = scope === 'all' ? Infinity : Number(scope);
    let out = '', words = 0;
    for (let i = start; i <= N; i++) {
      const t = await L.Pdf.pageText(i); out += t + '\n'; words += (t.match(WORD_RE) || []).length;
      if (onProg) onProg((i - start + 1) / (N - start + 1) * 0.3);
      if (words >= lim) break;
    }
    return cleanText(out);
  }
  const root = L.docEl;
  const startNode = scope === 'all' ? null : visibleStartNode();
  let on = !startNode, out = '';
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        if (n.matches('[lang="es"], .tei-sec, .speaker, .tei-h, .tei-h2, script, style')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n, prevBlock = null;
  while ((n = w.nextNode())) {
    if (!on && (n === startNode || (startNode.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING))) on = true;
    if (!on) continue;
    const blk = n.parentElement && n.parentElement.closest(L.BLOCK + ',.l');
    if (blk !== prevBlock) { out += '\n'; prevBlock = blk; }
    out += n.data;
  }
  return cleanText(out);
}
function limitWords(text, lim) {
  if (!isFinite(lim)) return text;
  let k = 0, cut = text.length;
  for (const m of text.matchAll(WORD_RE)) { if (IS_LANG(m[0]) && ++k > lim) { cut = m.index; break; } }
  return text.slice(0, cut);
}
function sentenceAt(text, idx) {
  let a = idx; while (a > 0 && !/[.;!?·\n]/.test(text[a - 1]) && idx - a < 220) a--;
  let b = idx; while (b < text.length && !/[.;!?·]/.test(text[b]) && b - idx < 220) b++;
  return text.slice(a, Math.min(text.length, b + 1)).replace(/\s+/g, ' ').trim();
}

/* palabras muy comunes que se pueden ocultar */
const STOP = new Set((GR
  ? 'ο η το και δε τε γαρ μεν ου ουκ ουχ μη εν εις ες εκ εξ επι προς κατα δια απο υπο περι παρα μετα συν ξυν ανα αντι υπερ προ αμφι ως οτι ει αν αλλα ουν γε δη η ουδε μηδε ουτε μητε ος οστις αυτος ουτος εκεινος οδε τις εγω συ ημεις υμεις σφεις ειμι πας αλλος οσος τοιουτος επει οτε ινα οπως πριν εως ουτω ουτως νυν ετι ηδη πολυς μεγας εαυτου ου αυ περ τοι μην ποτε που πως εμος σος ημετερος υμετερος αρα αρ κε κεν ως ωσπερ ωστε καιπερ ουδεις μηδεις εαν φημι εως'
  : 'et in non sum qui quis is hic ille ipse iste ad cum ut ne de e ex a ab abs per sed si quod quam tam enim autem nec neque atque ac aut vel que ego tu nos vos sui se suus meus tuus noster vester omnis nihil etiam iam tum tunc nunc sic ita ubi ibi ibi inter post ante sub super pro prae ob propter apud contra quoque at an num nisi dum donec quia quoniam quidem vero tamen ergo igitur itaque nam namque alius idem ullus nullus unus solus totus quisque possum facio do dico habeo'
).split(/\s+/).map(plain));

/* ================================================================== vocabulario del documento */
const known = new Set(store.get('known', []));
const saveKnown = () => store.set('known', [...known]);
const DV = (() => {
  const p = panel('panelDocVocab', 'Vocabulario de este documento', 'wide center');
  const bar = el('div', 'x-row x-noprint');
  const scopeSel = el('select'); scopeSel.innerHTML = '<option value="all">Todo el documento</option><option value="500">Desde aquí: 500 palabras</option><option value="1500" selected>Desde aquí: 1500 palabras</option><option value="5000">Desde aquí: 5000 palabras</option>';
  const minSel = el('select'); minSel.innerHTML = '<option value="1">1 vez o más</option><option value="2">2 veces o más</option><option value="3">3 veces o más</option><option value="5">5 veces o más</option>';
  const sortSel = el('select'); sortSel.innerHTML = '<option value="freq">Por frecuencia</option><option value="order">Por orden de aparición</option><option value="alpha">Alfabético</option>';
  const common = el('input'); common.type = 'checkbox'; common.checked = store.get('dvCommon', true);
  const knownCb = el('input'); knownCb.type = 'checkbox'; knownCb.checked = store.get('dvKnown', true);
  const lab = (t, c) => { const l = el('label'); if (c.type === 'checkbox') l.append(c, document.createTextNode(t)); else l.append(document.createTextNode(t), c); return l; };
  const go = btn('Preparar la lista', 'primary', () => run());
  bar.append(scopeSel, go);
  const bar2 = el('div', 'x-row x-noprint');
  bar2.append(lab('Mostrar ', minSel), lab('', sortSel), lab('Ocultar palabras muy comunes', common), lab('Ocultar las que ya sé', knownCb));
  const prog = el('div', 'x-progress x-noprint'); const progIn = el('div'); prog.append(progIn); prog.hidden = true;
  const sum = el('p', 'dv-sum x-muted');
  const list = el('ul', 'dv-list');
  const foot = el('div', 'x-row x-noprint'); foot.style.marginTop = '12px';
  const bSaveAll = btn('Guardar las visibles en Mi vocabulario', null, saveAll);
  const bCopy = btn('Copiar para Excel', null, copy);
  const bPrint = btn('Imprimir', null, () => { document.body.classList.add('x-print'); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('x-print'), 500); }, 50); });
  foot.append(bSaveAll, bCopy, bPrint); foot.hidden = true;
  p.append(el('p', 'x-muted x-noprint', 'Reúne los lemas del documento (o de lo que vas a leer a continuación) con su enunciado y su significado, para repasarlos antes de leer. Cuando una forma admite varios lemas se cuenta el más probable.'), bar, bar2, prog, sum, list, foot);
  let rows = [], txt = '', running = false, shown = 400;
  [minSel, sortSel, common, knownCb].forEach((c) => c.addEventListener('change', () => { store.set('dvCommon', common.checked); store.set('dvKnown', knownCb.checked); render(); }));
  async function run() {
    if (running) return; running = true; go.disabled = true; prog.hidden = false; progIn.style.width = '0%';
    list.replaceChildren(); foot.hidden = true; sum.textContent = 'Leyendo el texto…';
    try {
      const scope = scopeSel.value;
      let text = await documentText(scope, (f) => (progIn.style.width = (f * 100) + '%'));
      text = limitWords(text, scope === 'all' ? Infinity : Number(scope));
      txt = text;
      const forms = new Map(); let total = 0;
      for (const m of text.matchAll(WORD_RE)) {
        let w = m[0]; if (!IS_LANG(w)) continue; total++;
        const f = forms.get(w); if (f) f.n++; else forms.set(w, { n: 1, first: m.index });
      }
      if (!total) { sum.textContent = 'No encuentro texto en ' + LANGNAME + ' en esta parte del documento.'; return; }
      const lem = new Map(); const keys = [...forms.keys()]; let done = 0;
      const B = 40;
      for (let i = 0; i < keys.length; i += B) {
        const chunk = keys.slice(i, i + B);
        const res = await Promise.all(chunk.map((w) => L.Lex.analyse(w)));
        chunk.forEach((w, j) => {
          const r = res[j]; const f = forms.get(w);
          if (!r || !r.length) { const k = '?|' + w; const o = lem.get(k) || { a: null, key: k, n: 0, forms: new Map(), first: f.first, unknown: w }; o.n += f.n; o.forms.set(w, f.n); o.first = Math.min(o.first, f.first); lem.set(k, o); return; }
          const a = r[0]; const k = L.Vocab.keyOf(a);
          const o = lem.get(k) || { a, key: k, n: 0, forms: new Map(), first: f.first };
          o.n += f.n; o.forms.set(w, (o.forms.get(w) || 0) + f.n); o.first = Math.min(o.first, f.first); lem.set(k, o);
        });
        done += chunk.length; progIn.style.width = (30 + 70 * done / keys.length) + '%';
        sum.textContent = 'Analizando ' + done.toLocaleString('es-ES') + ' de ' + keys.length.toLocaleString('es-ES') + ' formas…';
      }
      rows = [...lem.values()];
      sum.dataset.total = total;
      render();
    } catch (e) { console.error(e); sum.textContent = 'No se pudo preparar la lista: ' + (e.message || e); }
    finally { running = false; go.disabled = false; prog.hidden = true; }
  }
  function isCommon(o) { return o.a && STOP.has(plain(o.a.base || o.a.lemme).replace(/\s*\(\d\)$/, '').split(',')[0].trim()); }
  function isKnown(o) { return known.has(o.key) || L.Vocab.all().some((x) => x.key === o.key && x.estado === 'sabida'); }
  function visible() {
    const min = Number(minSel.value);
    let v = rows.filter((o) => o.n >= min && !(common.checked && isCommon(o)) && !(knownCb.checked && isKnown(o)));
    const s = sortSel.value;
    if (s === 'freq') v.sort((a, b) => b.n - a.n || a.first - b.first);
    else if (s === 'order') v.sort((a, b) => a.first - b.first);
    else v.sort((a, b) => plain(a.a ? a.a.lemme : a.unknown).localeCompare(plain(b.a ? b.a.lemme : b.unknown)));
    return v;
  }
  function render() {
    if (!rows.length) return;
    const v = visible(); shown = Math.max(shown, 0);
    list.replaceChildren();
    const total = Number(sum.dataset.total || 0);
    sum.textContent = total.toLocaleString('es-ES') + ' palabras · ' + rows.length.toLocaleString('es-ES') + ' lemas distintos · ' + v.length.toLocaleString('es-ES') + ' en la lista';
    for (const o of v.slice(0, shown)) list.append(row(o));
    if (v.length > shown) { const li = el('li'); li.append(el('span'), btn('Mostrar ' + Math.min(400, v.length - shown) + ' más', 'small', () => { shown += 400; render(); })); list.append(li); }
    foot.hidden = false;
  }
  function row(o) {
    const li = el('li');
    li.append(el('span', 'dv-n', String(o.n)));
    const head = el('span');
    if (o.a) {
      const lm = el('span', 'dv-lem', L.shownLatin(o.a.lemme)); lm.lang = LG;
      head.append(lm);
      if (o.a.indMorph) { const ind = el('span', 'dv-ind', L.shownLatin(o.a.indMorph)); ind.lang = LG; head.append(ind); }
    } else { const lm = el('span', 'dv-lem', o.unknown); lm.lang = LG; lm.style.color = 'var(--muted)'; head.append(lm); }
    const acts = el('span', 'dv-acts x-noprint');
    if (o.a) {
      const saved = L.Vocab.has(o.key);
      const bs = btn(saved ? '★' : '☆', 'small', () => { add(o); bs.textContent = '★'; bs.disabled = true; L.Vocab.count && L.Vocab.count(); });
      bs.title = 'Guardar en Mi vocabulario'; if (saved) bs.disabled = true;
      const bk = btn('La sé', 'small', () => { known.add(o.key); saveKnown(); if (knownCb.checked) li.remove(); else bk.disabled = true; });
      bk.title = 'No volver a mostrarla en estas listas';
      acts.append(bs, bk);
    }
    li.append(head, acts);
    li.append(el('span', 'dv-tr', o.a ? (o.a.trad || '').slice(0, 220) : 'No está en el léxico.'));
    const fs = [...o.forms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f, n]) => f + (n > 1 ? ' ×' + n : '')).join(', ');
    const fe = el('span', 'dv-forms', fs); fe.lang = LG; li.append(fe);
    return li;
  }
  function entryFor(o) {
    const form = [...o.forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const fi = txt.indexOf(form);
    return { key: o.key, lemme: o.a.lemme, ind: o.a.indMorph || '', trad: (o.a.trad || '').slice(0, 400), forme: form, frase: fi >= 0 ? sentenceAt(txt, fi).slice(0, 400) : '', doc: (L.currentDoc && (L.currentDoc.title || L.currentDoc.name)) || 'Texto de ejemplo', fecha: Date.now(), estado: 'repasar' };
  }
  function add(o) { if (o.a) L.Vocab.add(entryFor(o)); }
  function saveAll() {
    const v = visible().filter((o) => o.a && !L.Vocab.has(o.key));
    if (!v.length) { toast('Ya están todas en Mi vocabulario.'); return; }
    v.slice().reverse().forEach(add); render();
    toast(v.length + ' palabras guardadas en Mi vocabulario. Puedes repasarlas con las tarjetas.');
  }
  function copy() {
    const esc = (s) => String(s || '').replace(/[\t\n\r]+/g, ' ');
    const lines = [['Veces', 'Lema', 'Enunciado', 'Significado', 'Formas'].join('\t')];
    for (const o of visible()) lines.push([o.n, o.a ? o.a.lemme : o.unknown, o.a ? (o.a.indMorph || '').replace(/^,\s*/, '') : '', o.a ? o.a.trad : '', [...o.forms.keys()].join(', ')].map(esc).join('\t'));
    const text = lines.join('\n');
    try { navigator.clipboard.writeText(text).then(() => toast('Lista copiada: pégala en Excel o en una hoja de cálculo.'), () => download(text, 'vocabulario.tsv', 'text/tab-separated-values')); }
    catch (e) { download(text, 'vocabulario.tsv', 'text/tab-separated-values'); }
  }
  return { open() { openPanel(p); if (!rows.length) sum.textContent = 'Elige qué parte del documento quieres y pulsa «Preparar la lista».'; } };
})();

/* ================================================================== tarjetas (repetición espaciada) */
const SRS = (() => {
  let srs = store.get('srs', {}); if (!srs || typeof srs !== 'object') srs = {};
  const save = () => store.set('srs', srs);
  const p = panel('panelCards', 'Repaso con tarjetas', 'center');
  p.style.width = 'min(30rem, calc(100vw - 24px))';
  const top = el('div', 'x-row');
  const dirSel = el('select'); dirSel.innerHTML = '<option value="lem">' + (GR ? 'Griego' : 'Latín') + ' → español</option><option value="es">Español → ' + (GR ? 'griego' : 'latín') + '</option>';
  dirSel.value = store.get('cardDir', 'lem'); dirSel.addEventListener('change', () => { store.set('cardDir', dirSel.value); show(); });
  const stats = el('div', 'cards-stats');
  top.append(dirSel);
  const box = el('div', 'cards-box');
  const foot = el('div', 'x-row'); foot.style.marginTop = '12px'; foot.style.justifyContent = 'space-between';
  foot.append(btn('Exportar copia', 'small', exportAll), btn('Importar copia', 'small', () => fileIn.click()));
  const fileIn = el('input'); fileIn.type = 'file'; fileIn.accept = '.json,application/json'; fileIn.hidden = true;
  fileIn.addEventListener('change', async () => { const f = fileIn.files && fileIn.files[0]; fileIn.value = ''; if (f) importText(await f.text()); });
  p.append(top, stats, box, foot, fileIn);
  let queue = [], cur = null, revealed = false, sessionDone = 0;
  const NEW_PER_DAY = 20;
  function cards() { return L.Vocab.all().filter((x) => x.estado !== 'sabida'); }
  function st(k) { return srs[k] || null; }
  function dueList() {
    const now = Date.now(); const cs = cards();
    const due = cs.filter((x) => st(x.key) && st(x.key).due <= now).sort((a, b) => st(a.key).due - st(b.key).due);
    const newToday = Object.values(srs).filter((s) => s.first && s.first >= today0()).length;
    const fresh = cs.filter((x) => !st(x.key)).reverse().slice(0, Math.max(0, NEW_PER_DAY - newToday));
    return due.concat(fresh);
  }
  function pending() { return dueList().length; }
  function fmt(days) { if (days < 1) return '<1 día'; if (days < 30) return Math.round(days) + ' d'; if (days < 365) return Math.round(days / 30) + ' m'; return (days / 365).toFixed(1) + ' a'; }
  function next(s, grade) {
    s = s ? { ...s } : { ivl: 0, ease: 2.5, reps: 0, lapses: 0, first: Date.now() };
    if (grade === 0) { s.reps = 0; s.lapses++; s.ease = Math.max(1.3, s.ease - 0.2); s.ivl = 0; s.due = Date.now() + 60 * 1000; return s; }
    if (grade === 1) { s.ivl = s.reps ? Math.max(1, s.ivl * 1.2) : 1; s.ease = Math.max(1.3, s.ease - 0.15); }
    if (grade === 2) { s.ivl = s.reps === 0 ? 1 : s.reps === 1 ? 3 : s.ivl * s.ease; }
    if (grade === 3) { s.ivl = s.reps === 0 ? 4 : Math.max(s.ivl * s.ease * 1.3, s.ivl + 1); s.ease += 0.15; }
    s.reps++; s.due = today0() + Math.round(s.ivl) * DAY + 4 * 3600 * 1000;
    return s;
  }
  function preview(grade) { const s = next(st(cur.key), grade); return grade === 0 ? '1 min' : fmt(s.ivl); }
  function show() {
    box.replaceChildren();
    const nAll = cards().length;
    stats.replaceChildren(el('span', null, 'Pendientes hoy: ' + queue.length), el('span', null, 'Repasadas: ' + sessionDone), el('span', null, 'En el mazo: ' + nAll));
    if (!nAll) { box.append(el('p', 'x-muted', 'Aún no tienes palabras guardadas. Guarda palabras con «☆ Guardar» en las fichas, o desde «Vocabulario de este documento», y vuelve aquí para repasarlas.')); return; }
    cur = queue[0] || null; revealed = false;
    if (!cur) {
      const fut = cards().map((x) => st(x.key)).filter(Boolean).map((s) => s.due).sort((a, b) => a - b)[0];
      box.append(el('div', 'card-front es', '¡Repaso terminado!'), el('p', 'x-muted', fut ? 'Próximo repaso: ' + new Date(fut).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + '.' : 'Vuelve mañana.'));
      return;
    }
    const lemFront = dirSel.value === 'lem';
    const f = el('div', 'card-front' + (lemFront ? '' : ' es'), lemFront ? L.shownLatin(cur.lemme) : cur.trad); if (lemFront) f.lang = LG;
    box.append(f);
    if (lemFront && cur.ind) { const i = el('div', 'card-ind', L.shownLatin(cur.ind.replace(/^,\s*/, ''))); i.lang = LG; box.append(i); }
    const b = btn('Mostrar la respuesta', 'primary', reveal); b.style.justifySelf = 'center'; box.append(b);
  }
  function reveal() {
    if (!cur || revealed) return; revealed = true;
    box.lastChild.remove();
    const back = el('div', 'card-back');
    if (dirSel.value === 'lem') back.append(el('div', 'card-tr', cur.trad));
    else { const lm = el('div', 'card-front', L.shownLatin(cur.lemme)); lm.lang = LG; lm.style.marginTop = '0'; back.append(lm); if (cur.ind) { const i = el('div', 'card-ind', L.shownLatin(cur.ind.replace(/^,\s*/, ''))); i.lang = LG; back.append(i); } }
    if (cur.frase) {
      const c = el('div', 'card-ctx'); c.lang = LG; const i = cur.frase.indexOf(cur.forme);
      if (i >= 0) c.append(document.createTextNode(cur.frase.slice(0, i)), el('b', null, cur.forme), document.createTextNode(cur.frase.slice(i + cur.forme.length))); else c.textContent = cur.frase;
      back.append(c);
    }
    const g = el('div', 'card-btns');
    [['Otra vez', 'again', 0], ['Difícil', '', 1], ['Bien', '', 2], ['Fácil', 'easy', 3]].forEach(([t, c, k]) => {
      const bb = btn('', c, () => grade(k)); bb.append(el('span', null, t), el('small', null, preview(k))); bb.title = 'Tecla ' + (k + 1); g.append(bb);
    });
    back.append(g); box.append(back);
  }
  function grade(k) {
    if (!cur) return;
    srs[cur.key] = next(st(cur.key), k); save();
    queue.shift(); sessionDone++;
    if (k === 0) queue.splice(Math.min(queue.length, 3), 0, cur);
    show();
  }
  document.addEventListener('keydown', (e) => {
    if (p.hidden || e.target.closest('input,select,textarea')) return;
    if (e.key === ' ' || e.key === 'Enter') { if (!revealed) { e.preventDefault(); reveal(); } }
    else if (revealed && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) - 1);
  });
  function exportAll() {
    const data = { app: 'lector', lang: L.lang, fecha: new Date().toISOString(), vocab: L.Vocab.all(), srs, known: [...known] };
    const name = 'vocabulario-' + (GR ? 'griego' : 'latin') + '-' + new Date().toISOString().slice(0, 10) + '.json';
    if (!download(JSON.stringify(data), name)) toast('No se pudo descargar el archivo.');
    else toast('Copia guardada como ' + name + '. Ábrela con «Importar copia» en otro dispositivo.', 6000);
  }
  function importText(t) {
    let d; try { d = JSON.parse(t); } catch (e) { toast('El archivo no es una copia válida.'); return; }
    if (!d || !Array.isArray(d.vocab)) { toast('El archivo no es una copia válida.'); return; }
    if (d.lang && d.lang !== L.lang) { toast('Esa copia es del lector ' + (d.lang === 'grc' ? 'griego' : 'latino') + '.'); return; }
    const cur = L.Vocab.all(); const have = new Map(cur.map((x) => [x.key, x])); let added = 0;
    for (const x of d.vocab) { if (!x || !x.key) continue; if (!have.has(x.key)) { cur.push(x); have.set(x.key, x); added++; } else if (x.estado === 'sabida') have.get(x.key).estado = 'sabida'; }
    L.Vocab.replaceAll(cur);
    for (const [k, s] of Object.entries(d.srs || {})) { const m = srs[k]; if (!m || (s.reps || 0) > (m.reps || 0) || ((s.reps || 0) === (m.reps || 0) && s.due > m.due)) srs[k] = s; }
    save(); for (const k of d.known || []) known.add(k); saveKnown();
    queue = dueList(); show();
    toast('Importadas ' + added + ' palabras nuevas; repasos combinados.');
  }
  return { open() { openPanel(p); queue = dueList(); sessionDone = 0; show(); }, pending };
})();

/* ================================================================== biblioteca */
const LIB = (() => {
  const p = panel('panelLib', 'Biblioteca', 'wide');
  const row = el('div', 'x-row');
  const q = el('input', 'x-input'); q.type = 'search'; q.placeholder = 'Buscar autor u obra (p. ej. ' + (GR ? 'Jenofonte, Odisea' : 'César, Eneida') + ')';
  const gen = el('select'); gen.innerHTML = '<option value="">Todos los géneros</option>';
  row.append(q, gen);
  const status = el('p', 'x-muted');
  const listEl = el('ul', 'lib-list');
  const note = el('p', 'lib-note', 'Textos de la Perseus Digital Library (Tufts University), licencia CC BY-SA. Cada obra se descarga la primera vez que la abres y queda guardada en este dispositivo para leerla sin conexión.');
  p.append(row, status, listEl, note);
  let cat = null, loading = null, dl = new Set(store.get('libDl', []));
  async function load() {
    if (cat) return cat;
    if (!loading) loading = fetch('biblioteca.json').then((r) => { if (!r.ok) throw new Error('biblioteca.json'); return r.json(); }).then((d) => {
      cat = d;
      const gs = [...new Set(d.obras.map((w) => w[4]))].sort((a, b) => a.localeCompare(b, 'es'));
      for (const g of gs) { const o = el('option', null, g); o.value = g; gen.append(o); }
      return d;
    });
    return loading;
  }
  function render() {
    if (!cat) return;
    const t = plain(q.value.trim()); const g = gen.value;
    const by = new Map();
    for (const w of cat.obras) {
      if (g && w[4] !== g) continue;
      if (t && !plain(w[2] + ' ' + w[3] + ' ' + w[5]).includes(t)) continue;
      if (!by.has(w[2])) by.set(w[2], []); by.get(w[2]).push(w);
    }
    listEl.replaceChildren();
    const authors = [...by.keys()].sort((a, b) => a.localeCompare(b, 'es'));
    const n = [...by.values()].reduce((s, v) => s + v.length, 0);
    status.textContent = n.toLocaleString('es-ES') + ' obras de ' + authors.length + ' autores' + (dl.size ? ' · ' + dl.size + ' descargadas' : '');
    const open1 = authors.length <= 3 || !!t;
    for (const a of authors) {
      const li = el('li', 'lib-author');
      const hb = el('button'); hb.type = 'button'; hb.append(el('b', null, a), el('span', null, by.get(a).length + (by.get(a).length === 1 ? ' obra' : ' obras')));
      const ul = el('ul', 'lib-works'); ul.hidden = !open1;
      hb.addEventListener('click', () => { ul.hidden = !ul.hidden; if (!ul.hidden && !ul.childNodes.length) fill(ul, by.get(a)); });
      if (open1) fill(ul, by.get(a));
      li.append(hb, ul); listEl.append(li);
    }
  }
  function fill(ul, works) {
    for (const w of works.sort((x, y) => x[3].localeCompare(y[3], 'es'))) {
      const li = el('li');
      const b = el('button', 'w', w[3]); b.type = 'button'; b.title = w[6] || '';
      b.addEventListener('click', () => openWork(w));
      li.append(b);
      if (w[5] && plain(w[5]) !== plain(w[3])) li.append(el('small', null, w[5]));
      if (dl.has(w[0])) li.append(el('span', 'lib-dl', '✓ descargada'));
      ul.append(li);
    }
  }
  async function openWork(w) {
    const [id, path, autor, titulo] = w;
    const name = autor + ' · ' + titulo + '.tei.xml';
    let xml = await idb.get('lib:' + id);
    if (!xml) {
      toast('Descargando ' + titulo + '…', 2500);
      for (const base of [cat.base, cat.raw]) {
        try { const r = await fetch(base + path); if (r.ok) { xml = await r.text(); break; } } catch (e) { /* probar la siguiente fuente */ }
      }
      if (!xml) { toast('No se pudo descargar la obra. Comprueba la conexión a internet.', 6000); return; }
      await idb.put('lib:' + id, xml); dl.add(id); store.set('libDl', [...dl]);
    }
    L.closePanels();
    const buf = new TextEncoder().encode(xml).buffer;
    L.openBuffer(buf, name, 'application/tei+xml');
  }
  q.addEventListener('input', () => { clearTimeout(q._t); q._t = setTimeout(render, 150); });
  gen.addEventListener('change', render);
  return {
    async open() {
      openPanel(p);
      if (!cat) { status.textContent = 'Cargando el catálogo…'; try { await load(); } catch (e) { status.textContent = 'No se pudo cargar el catálogo de la biblioteca.'; return; } }
      render(); setTimeout(() => q.focus(), 30);
    }
  };
})();

/* ================================================================== textos TEI → lector */
const SUBTYPE = { book: 'Libro', chapter: 'Capítulo', section: '', poem: 'Poema', card: '', speech: 'Discurso', letter: 'Carta', hymn: 'Himno', satire: 'Sátira', elegy: 'Elegía', ode: 'Oda', episode: '', scene: 'Escena', act: 'Acto', fragment: 'Fragmento', epigram: 'Epigrama', life: 'Vida', play: '', part: 'Parte', line: '', verse: '', textpart: '' };
function openTei(buf, name) {
  const text = new TextDecoder('utf-8').decode(buf);
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('El archivo XML no es válido.');
  const art = L.resetSurface('html'); art.lang = LG;
  const body = doc.getElementsByTagName('body')[0] || doc.documentElement;
  const toc = []; let hid = 0;
  const title = name.replace(/\.tei\.xml$/i, '').replace(/\.xml$/i, '');
  const h1 = el('h1', null, title.split(' · ').slice(-1)[0]); h1.lang = 'es'; h1.style.fontFamily = 'var(--f-ui)'; h1.style.fontSize = '1.3rem';
  if (title.includes(' · ')) { const au = el('div', 'tei-h', title.split(' · ')[0]); au.lang = 'es'; au.style.marginTop = '0'; art.append(au); }
  art.append(h1);
  const lname = (n) => n.localName;
  function label(div, depth) {
    const st = (div.getAttribute('subtype') || '').toLowerCase(); const n = div.getAttribute('n') || '';
    const w = SUBTYPE[st] != null ? SUBTYPE[st] : (st ? st[0].toUpperCase() + st.slice(1) : '');
    return (w ? w + ' ' : '') + n;
  }
  function heading(lbl, level) {
    const h = el(level === 0 ? 'h2' : 'h3', level === 0 ? 'tei-h' : 'tei-h2', lbl); h.lang = 'es'; h.id = 'tei_' + (++hid);
    const id = h.id; toc.push({ label: lbl, level, go: () => L.jumpTo(id) });
    return h;
  }
  function inline(src, dest) {
    for (const n of Array.from(src.childNodes)) {
      if (n.nodeType === 3) { dest.appendChild(document.createTextNode(n.data.replace(/\s+/g, ' '))); continue; }
      if (n.nodeType !== 1) continue;
      const t = lname(n);
      if (['note', 'bibl', 'ref', 'figure', 'interp', 'fw', 'pb', 'lb', 'cb', 'milestone', 'head'].includes(t)) { if (t === 'lb') dest.appendChild(document.createTextNode(' ')); continue; }
      if (t === 'gap') { dest.appendChild(el('span', 'tei-gap', ' … ')); continue; }
      if (t === 'del') { const s = el('span', 'tei-del'); s.append('['); inline(n, s); s.append(']'); dest.appendChild(s); continue; }
      if (t === 'add' || t === 'supplied') { dest.append('⟨'); inline(n, dest); dest.append('⟩'); continue; }
      if (t === 'choice') { const c = Array.from(n.children).find((x) => ['corr', 'reg', 'expan'].includes(lname(x))) || n.children[0]; if (c) inline(c, dest); continue; }
      if (t === 'sic' || t === 'orig' || t === 'abbr') { if (lname(n.parentNode) === 'choice') continue; inline(n, dest); continue; }
      if (t === 'foreign' || t === 'emph' || t === 'hi' || t === 'title') { const i = el('i'); inline(n, i); dest.appendChild(i); continue; }
      inline(n, dest);
    }
  }
  function block(src, dest, depth) {
    let verses = null;
    const flush = () => { verses = null; };
    for (const n of Array.from(src.childNodes)) {
      if (n.nodeType === 3) { if (n.data.trim()) { const p = el('p'); p.textContent = n.data.trim(); dest.appendChild(p); } continue; }
      if (n.nodeType !== 1) continue;
      const t = lname(n);
      if (t === 'div' || t === 'div1' || t === 'div2' || t === 'div3') {
        flush();
        const type = n.getAttribute('type');
        if (type === 'edition' || type === 'translation') { block(n, dest, depth); continue; }
        const st = (n.getAttribute('subtype') || '').toLowerCase();
        const hasDivs = Array.from(n.children).some((c) => /^div/.test(lname(c)));
        const head = Array.from(n.children).find((c) => lname(c) === 'head');
        if (st === 'section' || st === 'line' || st === 'verse' || (!hasDivs && depth >= 2 && st !== 'poem')) {
          // sección pequeña: número volado al principio del primer párrafo
          const holder = el('div'); block(n, holder, depth + 1);
          const firstP = holder.querySelector('p, .l');
          if (firstP && n.getAttribute('n') && st === 'section') firstP.prepend(el('span', 'tei-sec', n.getAttribute('n')));
          while (holder.firstChild) dest.appendChild(holder.firstChild);
          continue;
        }
        if (st !== 'card' && (n.getAttribute('n') || head)) {
          const lbl = label(n, depth);
          if (lbl.trim()) dest.appendChild(heading(lbl.trim(), depth === 0 ? 0 : 1));
        }
        if (head) { const h = el('p', 'tei-head'); inline(head, h); if (h.textContent.trim()) dest.appendChild(h); }
        block(n, dest, depth + 1);
        continue;
      }
      if (t === 'head') continue;
      if (t === 'p' || t === 'ab') { flush(); const p = el('p'); inline(n, p); if (p.textContent.trim()) dest.appendChild(p); continue; }
      if (t === 'l') {
        if (!verses) { verses = el('div', 'verses'); dest.appendChild(verses); }
        const d = el('div', 'l'); const num = n.getAttribute('n');
        if (num && (/^\d+$/.test(num) ? Number(num) % 5 === 0 : true)) d.dataset.n = num;
        inline(n, d); verses.appendChild(d); continue;
      }
      if (t === 'lg') { flush(); const s = el('div', 'stanza verses'); block(n, s, depth + 1); dest.appendChild(s); continue; }
      if (t === 'sp') { flush(); const s = el('div', 'sp'); block(n, s, depth + 1); dest.appendChild(s); continue; }
      if (t === 'speaker') { flush(); const s = el('div', 'speaker'); inline(n, s); dest.appendChild(s); continue; }
      if (['note', 'bibl', 'milestone', 'pb', 'lb', 'figure', 'fw', 'gap'].includes(t)) continue;
      if (t === 'q' || t === 'quote' || t === 'said' || t === 'cit' || t === 'list' || t === 'item' || t === 'table' || t === 'row' || t === 'cell' || t === 'lg' || t === 'castList') { block(n, dest, depth); continue; }
      // cualquier otro: si contiene bloques, seguir; si no, como párrafo
      if (Array.from(n.children).some((c) => ['p', 'l', 'div', 'lg', 'sp'].includes(lname(c)))) block(n, dest, depth);
      else { const p = el('p'); inline(n, p); if (p.textContent.trim()) dest.appendChild(p); }
    }
  }
  const ed = Array.from(body.getElementsByTagName('div')).find((d) => d.getAttribute('type') === 'edition') || body;
  block(ed, art, 0);
  // si hay demasiadas entradas de segundo nivel, el índice solo muestra el primero
  const lv1 = toc.filter((x) => x.level === 1).length;
  L.setToc(lv1 > 250 ? toc.filter((x) => x.level === 0) : toc);
  const credit = el('p', 'lib-note', 'Texto: Perseus Digital Library, licencia CC BY-SA.'); credit.lang = 'es'; art.append(credit);
  return { title: title.split(' · ').slice(-1)[0] + (title.includes(' · ') ? ' — ' + title.split(' · ')[0] : '') };
}

/* ================================================================== escansión */
/* --- resolución métrica común: pesos H (pesada), L (ligera), ? (dudosa, con preferencia opcional) --- */
function fitMeter(syl) {
  // syl: [{w:'H'|'L'|'?', pref:'H'|'L'|null}] ; devuelve el mejor encaje como hexámetro o pentámetro
  const n = syl.length;
  const cost = (i, want) => {
    const s = syl[i];
    if (s.w === want) return 0;
    if (s.w === '?') return s.pref && s.pref !== want ? 0.6 : 0.05;
    return Infinity;
  };
  const best = [];
  // hexámetro
  (function hex() {
    const memo = new Map();
    function f(i, foot) {
      const k = i * 8 + foot; if (memo.has(k)) return memo.get(k);
      let r = null;
      if (foot === 6) {
        if (i + 2 === n) { const c = cost(i, 'H'); if (c < Infinity) r = { c, feet: ['X'], at: [i] }; }
      } else {
        // dáctilo
        if (i + 3 <= n) { const c = cost(i, 'H') + cost(i + 1, 'L') + cost(i + 2, 'L') + (foot === 5 ? 0 : 0.02); if (c < Infinity) { const t = f(i + 3, foot + 1); if (t && c + t.c < (r ? r.c : Infinity)) r = { c: c + t.c, feet: ['D'].concat(t.feet), at: [i].concat(t.at) }; } }
        if (i + 2 <= n) { const c = cost(i, 'H') + cost(i + 1, 'H') + (foot === 5 ? 1.5 : 0.1); if (c < Infinity) { const t = f(i + 2, foot + 1); if (t && c + t.c < (r ? r.c : Infinity)) r = { c: c + t.c, feet: ['S'].concat(t.feet), at: [i].concat(t.at) }; } }
      }
      memo.set(k, r); return r;
    }
    const r = f(0, 1); if (r) best.push({ meter: 'hexámetro', ...r });
  })();
  // pentámetro: (D|S)(D|S) H ‖ D D X
  (function pen() {
    const opts = [];
    const firsts = [['D', 3], ['S', 2]];
    for (const [a, la] of firsts) for (const [b, lb] of firsts) {
      const i1 = la, i2 = la + lb, i3 = i2 + 1;
      if (i3 + 7 !== n) continue;
      let c = 0;
      const pat = (i, f) => f === 'D' ? cost(i, 'H') + cost(i + 1, 'L') + cost(i + 2, 'L') : cost(i, 'H') + cost(i + 1, 'H') + 0.1;
      c += pat(0, a) + pat(i1, b) + cost(i2, 'H') + pat(i3, 'D') + pat(i3 + 3, 'D');
      if (c < Infinity) opts.push({ meter: 'pentámetro', c: c + 0.3, feet: [a, b, '|', 'D', 'D', 'X'], at: [0, i1, i2, i3, i3 + 3, n - 1] });
    }
    opts.sort((x, y) => x.c - y.c); if (opts[0]) best.push(opts[0]);
  })();
  best.sort((a, b) => a.c - b.c);
  return best[0] || null;
}
function fitWithSynizesis(syl, keepWeight) {
  let fit = fitMeter(syl);
  if (fit && fit.c < 1.5) return { fit, syl, syn: null };
  let best = fit ? { fit, syl, syn: null } : null;
  for (let i = 0; i + 1 < syl.length; i++) {
    if (!syl[i].hiatus) continue;
    const merged = syl.slice(0, i).concat([{ ...syl[i + 1], w: keepWeight ? syl[i + 1].w : 'H', pref: keepWeight ? syl[i + 1].pref : null, syn: true, ref2: syl[i].ref }]).concat(syl.slice(i + 2));
    const f = fitMeter(merged);
    if (f) { f.c += 0.8; if (!best || f.c < best.fit.c) best = { fit: f, syl: merged, syn: i }; }
  }
  return best || { fit: null, syl, syn: null };
}
function assignWeights(syl, fit) {
  // devuelve el peso final de cada sílaba según el encaje
  const out = syl.map((s) => s.w);
  if (!fit) return out;
  if (fit.meter === 'hexámetro') {
    fit.feet.forEach((f, k) => { const i = fit.at[k]; if (f === 'D') { out[i] = 'H'; out[i + 1] = 'L'; out[i + 2] = 'L'; } else if (f === 'S') { out[i] = 'H'; out[i + 1] = 'H'; } else if (f === 'X') { out[i] = 'H'; out[i + 1] = out[i + 1] === '?' ? 'X' : out[i + 1]; } });
  } else {
    const [a, b] = fit.feet; let i = 0;
    const put = (f) => { if (f === 'D') { out[i] = 'H'; out[i + 1] = 'L'; out[i + 2] = 'L'; i += 3; } else { out[i] = 'H'; out[i + 1] = 'H'; i += 2; } };
    put(a); put(b); out[i] = 'H'; i++; put('D'); put('D'); out[i] = out[i] === '?' ? 'X' : out[i];
  }
  return out;
}
function footStarts(fit, n) {
  const set = new Set(); if (!fit) return set;
  if (fit.meter === 'hexámetro') fit.at.forEach((i) => set.add(i));
  else { const [a, b] = fit.feet; const la = a === 'D' ? 3 : 2, lb = b === 'D' ? 3 : 2; [0, la, la + lb, la + lb + 1, la + lb + 4].forEach((i) => set.add(i)); }
  return set;
}
function caesura(fit, syl) {
  // índice de sílaba tras la que cae la cesura principal (fin de palabra)
  if (!fit) return null;
  if (fit.meter === 'pentámetro') { const [a, b] = fit.feet; return { after: (a === 'D' ? 3 : 2) + (b === 'D' ? 3 : 2), name: 'diéresis central' }; }
  const s3 = fit.at[2], s4 = fit.at[3], f3 = fit.feet[2];
  const end = (i) => i >= 0 && i < syl.length && syl[i].wordEnd;
  if (end(s3)) return { after: s3 + 1, name: 'pentemímera' };
  if (f3 === 'D' && end(s3 + 1)) return { after: s3 + 2, name: 'trocaica' };
  if (end(s4)) return { after: s4 + 1, name: 'heptemímera' };
  if (end(fit.at[1])) return { after: fit.at[1] + 1, name: 'trihemímera' };
  return null;
}

/* --- latín --- */
const LV = 'aeiouyAEIOUY';
function latinUnits(q) {
  // q: forma con cantidades (ā ă ō̆…). Devuelve letras con cantidad: [{c, v: bool, q:'L'|'S'|'?'|''}]
  const s = q.replace(/ў/g, 'y\u0306').replace(/Ў/g, 'Y\u0306').normalize('NFD'); const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]; if (/[̀-ͯ]/.test(ch)) continue;
    let marks = ''; let j = i + 1; while (j < s.length && /[̀-ͯ]/.test(s[j])) marks += s[j++];
    const lo = ch.toLowerCase();
    if (LV.includes(ch)) {
      let qq = '';
      if (marks.includes('̄') && marks.includes('̆')) qq = '?'; else if (marks.includes('̄')) qq = 'L'; else if (marks.includes('̆')) qq = 'S';
      out.push({ c: ch, v: true, q: qq });
    } else out.push({ c: ch, v: false, cons: lo });
  }
  // marcar núcleos: vocal sin cantidad tras vocal = segundo elemento de diptongo; u sin cantidad ante vocal = semiconsonante
  for (let i = 0; i < out.length; i++) {
    const u = out[i]; if (!u.v || u.q) continue;
    const prev = out[i - 1], next = out[i + 1]; const lo = u.c.toLowerCase(), pl = prev && prev.v && !prev.glide ? prev.c.toLowerCase() : '';
    if (pl && ((lo === 'e' && 'ao'.includes(pl)) || (lo === 'u' && 'ae'.includes(pl)) || (lo === 'i' && 'eu'.includes(pl)))) { u.diph = true; prev.long2 = true; continue; }
    if (lo === 'u' && next && next.v && prev && !prev.v) { u.glide = true; continue; }
    u.q = '?';
  }
  return out;
}
async function latinCandidates(word) {
  const res = await L.Lex.analyse(word);
  const set = []; const seen = new Set();
  for (const a of res || []) for (const f of a.formes || []) {
    let g = f.grq || f.forme || ''; if (!g) continue;
    if (f.enclitique) g += { que: 'quĕ', ne: 'nĕ', ve: 'vĕ', cum: 'cŭm' }[f.enclitique] || f.enclitique;
    if (!seen.has(g)) { seen.add(g); set.push(g); }
  }
  return set;
}
const COMMON_FINAL = new Set('mihi tibi sibi ibi ubi nisi quasi ego modo homo cito duo ergo'.split(' '));
function mergeLatin(cands, word) {
  if (!cands.length) {
    // desconocida: solo cantidades por posición
    return latinUnits(word.replace(/^i(?=[aeiou])/i, 'j').replace(/([aeiou])i(?=[aeiou])/gi, '$1j'));
  }
  const base = latinUnits(cands[0]);
  const nuc = (us) => us.filter((u) => u.v && !u.glide && !u.diph).length;
  const n0 = nuc(base);
  for (const c of cands.slice(1)) {
    const us = latinUnits(c); if (nuc(us) !== n0) continue;
    const a = base.filter((u) => u.v && !u.glide && !u.diph), b = us.filter((u) => u.v && !u.glide && !u.diph);
    a.forEach((u, k) => { if (u.q !== b[k].q) u.q = '?'; });
  }
  if (COMMON_FINAL.has(word.toLowerCase())) { const nu = base.filter((u) => u.v && !u.glide && !u.diph); if (nu.length) nu[nu.length - 1].q = '?'; }
  return base;
}
async function scanLatin(line) {
  const toks = [...line.matchAll(/[A-Za-zÀ-ÿĀ-ž]+/g)].map((m) => m[0]);
  if (toks.length < 3) return null;
  const words = [];
  for (const w of toks) { const c = await latinCandidates(w); words.push({ w, units: mergeLatin(c, w) }); }
  // aplanar: sílabas = núcleos; consonantes intermedias
  const seq = []; // {type:'V', u, wi} | {type:'C', c, wi}
  words.forEach((wd, wi) => { wd.units.forEach((u) => seq.push(u.v && !u.glide && !u.diph ? { type: 'V', u, wi } : { type: 'C', u, wi, c: (u.cons || u.c.toLowerCase()) })); seq.push({ type: 'B', wi }); });
  // elisión: palabra que termina en vocal (o vocal + m) ante palabra que empieza por vocal o h
  const firstSound = (wi) => { const us = words[wi].units; const f = us[0]; return f ? (f.v && !f.glide ? 'V' : f.cons === 'h' ? (us[1] && us[1].v ? 'V' : 'C') : 'C') : 'C'; };
  const elided = new Set();
  for (let wi = 0; wi < words.length - 1; wi++) {
    const us = words[wi].units; const last = us[us.length - 1]; const pen = us[us.length - 2];
    const endsV = last && last.v && !last.glide; const endsVm = last && last.cons === 'm' && pen && pen.v;
    if ((endsV || endsVm) && firstSound(wi + 1) === 'V' && !/^es(t)?$/i.test(words[wi + 1].w)) {
      // núcleo final elidido
      for (let k = seq.length - 1; k >= 0; k--) { const s = seq[k]; if (s.wi === wi && s.type === 'V') { elided.add(s); break; } }
      if (endsVm) for (const s of seq) if (s.wi === wi && s.u === last) elided.add(s);
    }
  }
  // prodelisión de est / es
  for (let wi = 1; wi < words.length; wi++) {
    if (/^es(t)?$/i.test(words[wi].w)) {
      const us = words[wi - 1].units; const last = us[us.length - 1];
      if ((last && last.v) || (last && last.cons === 'm')) {
        for (const s of seq) if (s.wi === wi && s.type === 'V') { elided.add(s); break; }
      }
    }
  }
  const vs = seq.map((s, i) => ({ s, i })).filter((x) => x.s.type === 'V' && !elided.has(x.s));
  const syl = [];
  const STOPS = 'pbtdcgkf', LIQ = 'lr';
  vs.forEach((x, k) => {
    const u = x.s.u; const nextI = k + 1 < vs.length ? vs[k + 1].i : seq.length;
    let cons = []; let crossesWord = false;
    for (let i = x.i + 1; i < nextI; i++) { const s = seq[i]; if (s.type === 'B') { crossesWord = true; continue; } if (s.type === 'C' && !elided.has(s)) { if (s.u && (s.u.glide || s.u.diph)) continue; cons.push({ c: s.c, wi: s.wi }); } }
    const cc = cons.filter((c) => c.c !== 'h');
    let n = 0; for (const c of cc) n += 'xz'.includes(c.c) ? 2 : 1;
    // j entre vocales cuenta doble (maior = maj-jor)
    if (cc.length === 1 && cc[0].c === 'j' && !crossesWord) n = 2;
    const diph = !!u.long2;
    let w, pref = null;
    const openFinal = crossesWord && !cons.some((c) => c.wi === x.s.wi);
    if (u.q === 'L' && !diph && openFinal) { w = '?'; pref = 'H'; }
    else if (diph || u.q === 'L') w = 'H';
    else if (n >= 2) {
      const mcl = cc.length === 2 && STOPS.includes(cc[0].c) && LIQ.includes(cc[1].c) && cc[0].wi === cc[1].wi && (u.q === 'S' || u.q === '' || u.q === '?');
      w = mcl ? '?' : 'H'; if (mcl) pref = null;
    } else if (u.q === 'S') w = 'L';
    else if (n === 0 && !crossesWord) w = 'L';
    else w = '?';
    const wordEnd = (() => { for (let i = x.i + 1; i < seq.length; i++) { if (seq[i].type === 'V' && !elided.has(seq[i])) return false; if (seq[i].type === 'B') return true; } return true; })();
    syl.push({ w, pref, wordEnd, ref: x.s, hiatus: !crossesWord && cc.length === 0 && k + 1 < vs.length && 'iu'.includes(u.c.toLowerCase()) && u.q !== 'L' });
  });
  const ff = fitWithSynizesis(syl, true);
  const fin = assignWeights(ff.syl, ff.fit);
  return { words, seq, elided, syl: ff.syl, fit: ff.fit, fin, syn: ff.syn };
}
function renderLatinScan(r, box) {
  // verso con cantidades sobre las vocales, sílabas por pies
  const starts = footStarts(r.fit, r.syl.length); const cz = caesura(r.fit, r.syl);
  const verse = el('div', 'scan-q'); verse.lang = 'la';
  const sylIndex = new Map(r.syl.map((s, i) => [s.ref, i]));
  const mark = (ch, w) => (w === 'H' ? ch + '̄' : w === 'L' ? ch + '̆' : ch).normalize('NFC');
  let wi = -1, caesNext = false;
  for (const s of r.seq) {
    if (s.type === 'B') { if (caesNext) { verse.append(el('span', 'scan-caes', '‖')); caesNext = false; } verse.append(' '); continue; }
    if (s.wi !== wi) wi = s.wi;
    const u = s.u;
    if (s.type === 'V') {
      const i = sylIndex.get(s);
      if (r.elided.has(s)) { verse.append(el('span', 'tei-del', u.c)); continue; }
      const isSyn = r.syl[i] && r.syl[i].ref2 === s;
      const fw = r.fin[i]; verse.append(isSyn ? u.c : mark(u.c, fw === 'X' ? '' : fw));
      if (cz && cz.after === i + 1) caesNext = true;
    } else {
      if (r.elided.has(s)) { verse.append(el('span', 'tei-del', u.c)); continue; }
      let c = u.c; if (c === 'j') c = 'i'; if (c === 'J') c = 'I'; if (c === 'v' && !/v/i.test(r.words[s.wi].w)) c = 'u'; if (c === 'V' && !/v/i.test(r.words[s.wi].w)) c = 'U';
      verse.append(c);
    }
  }
  box.append(verse);
}

/* --- griego --- */
const GV = 'αεηιουω';
function greekUnits(word) {
  const s = word.normalize('NFD'); const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]; if (/[̀-ͯͅ]/.test(ch)) continue;
    let marks = ''; let j = i + 1; while (j < s.length && /[̀-ͯͅ]/.test(s[j])) marks += s[j++];
    const lo = ch.toLowerCase();
    const d = (ch + marks).normalize('NFC');
    if (GV.includes(lo)) out.push({ c: ch, d, lo, v: true, marks });
    else if (/[α-ως]/.test(lo)) out.push({ c: ch, d, lo, v: false, marks });
    else if (/[’ʼ᾽'᾿]/.test(ch)) out.push({ c: ch, d: '’', apos: true });
  }
  // diptongos
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    if (!a.v || !b.v || a.diph || b.marks.includes('̈')) continue;
    if ((b.lo === 'ι' && 'αεουυ'.includes(a.lo)) || (b.lo === 'υ' && 'αεηω'.includes(a.lo)) || (b.lo === 'υ' && a.lo === 'ο')) { b.diph = true; a.long2 = true; a.marks += b.marks; }
  }
  return out;
}
function greekQ(u) {
  if (u.long2) return 'L';
  if (u.marks.includes('ͅ') || u.marks.includes('͂')) return 'L';
  if (u.marks.includes('̄')) return 'L';
  if (u.marks.includes('̆')) return 'S';
  if (u.lo === 'η' || u.lo === 'ω') return 'L';
  if (u.lo === 'ε' || u.lo === 'ο') return 'S';
  return '?';
}
async function scanGreek(line) {
  const toks = [...line.matchAll(/[\p{L}\p{M}]+[’ʼ᾽'᾿]?/gu)].map((m) => m[0]).filter((w) => /[Ͱ-Ͽἀ-῿]/.test(w));
  if (toks.length < 3) return null;
  const words = [];
  for (const w of toks) {
    let units = greekUnits(w);
    // cantidades del léxico (macron / breve) si las hay
    try {
      const res = await L.Lex.analyse(w);
      const cand = [];
      for (const a of res || []) for (const f of a.formes || []) if (f.exact && /[̄̆]/.test(f.forme.normalize('NFD'))) cand.push(f.forme);
      if (cand.length) {
        const cu = greekUnits(cand[0]); const av = units.filter((u) => u.v && !u.diph), cv = cu.filter((u) => u.v && !u.diph);
        if (av.length === cv.length) av.forEach((u, k) => { const m = cv[k].marks; if (m.includes('̄') && !u.marks.includes('̄')) u.marks += '̄'; else if (m.includes('̆') && !u.marks.includes('̆')) u.marks += '̆'; });
      }
    } catch (e) { /* sin léxico: solo reglas */ }
    words.push({ w, units });
  }
  const seq = [];
  words.forEach((wd, wi) => { wd.units.forEach((u) => { if (u.apos) u.c = '’'; seq.push(u.v && !u.diph ? { type: 'V', u, wi } : { type: 'C', u, wi }); }); seq.push({ type: 'B', wi }); });
  const vs = seq.map((s, i) => ({ s, i })).filter((x) => x.s.type === 'V');
  const STOPS = 'πβφτδθκγχ', LIQ = 'λρμν';
  const syl = [];
  vs.forEach((x, k) => {
    const u = x.s.u; const nextI = k + 1 < vs.length ? vs[k + 1].i : seq.length;
    const cons = []; let crossesWord = false;
    for (let i = x.i + 1; i < nextI; i++) { const s = seq[i]; if (s.type === 'B') { crossesWord = true; continue; } if (s.type === 'C' && !s.u.diph && !s.u.apos) cons.push({ c: s.u.lo, wi: s.wi }); }
    let n = 0; for (const c of cons) n += 'ζξψ'.includes(c.c) ? 2 : 1;
    const q = greekQ(u);
    let w, pref = null;
    if (q === 'L') {
      // abreviación épica: larga final ante vocal inicial
      if (n === 0 && crossesWord && k + 1 < vs.length) { w = '?'; pref = 'L'; }
      else if (n === 0 && !crossesWord && u.long2 && k + 1 < vs.length) { w = '?'; pref = 'H'; }
      else w = 'H';
    } else if (n >= 2) {
      const mcl = cons.length === 2 && STOPS.includes(cons[0].c) && LIQ.includes(cons[1].c) && cons[0].wi === cons[1].wi;
      if (mcl) { w = '?'; pref = 'H'; } else w = 'H';
    } else if (q === 'S') w = 'L';
    else { w = '?'; }
    const wordEnd = (() => { for (let i = x.i + 1; i < seq.length; i++) { if (seq[i].type === 'V') return false; if (seq[i].type === 'B') return true; } return true; })();
    syl.push({ w, pref, wordEnd, ref: x.s, hiatus: !crossesWord && n === 0 && k + 1 < vs.length });
  });
  const ff = fitWithSynizesis(syl);
  const fin = assignWeights(ff.syl, ff.fit);
  return { words, seq, elided: new Set(), syl: ff.syl, fit: ff.fit, fin, syn: ff.syn };
}

/* --- presentación común --- */
function renderSyllables(r, box) {
  const starts = footStarts(r.fit, r.syl.length); const cz = caesura(r.fit, r.syl);
  const sylIndex = new Map(r.syl.map((s, i) => [s.ref, i])); r.syl.forEach((s, i) => { if (s.ref2) sylIndex.set(s.ref2, i); });
  const vrow = el('div', 'scan-verse'); vrow.lang = LG;
  const show = (u, s) => { let c = u.d || u.c; if (!GR) { if (c === 'j') c = 'i'; else if (c === 'J') c = 'I'; else if ((c === 'v' || c === 'V') && s && r.words[s.wi] && !/v/i.test(r.words[s.wi].w)) c = c === 'v' ? 'u' : 'U'; } return c; };
  const MCL = GR ? /^[πβφτδθκγχ][λρμν]$/ : /^[pbtdcgf][lr]$/i;
  // agrupar por palabra
  const byWord = new Map();
  for (const s of r.seq) { if (s.type === 'B') continue; if (!byWord.has(s.wi)) byWord.set(s.wi, []); byWord.get(s.wi).push(s); }
  [...byWord.keys()].sort((a, b) => a - b).forEach((wi, wn) => {
    if (wn) vrow.append(el('span', 'scan-sp'));
    const items = byWord.get(wi);
    const sylls = []; let pending = ''; let pendU = [];
    for (const s of items) {
      const isNuc = s.type === 'V';
      if (!isNuc) {
        if ((s.u.diph || s.u.apos) && sylls.length && !pending) { sylls[sylls.length - 1].t += show(s.u, s); continue; }
        pending += show(s.u, s); pendU.push(s.u); continue;
      }
      const prevS = sylls[sylls.length - 1];
      if (prevS && prevS.s && !pending && sylIndex.get(prevS.s) != null && sylIndex.get(prevS.s) === sylIndex.get(s)) { prevS.t += show(s.u, s); prevS.s = s; continue; }
      if (sylls.length && pendU.length > 1) {
        // oclusiva + líquida va con la sílaba siguiente salvo que haya hecho posición
        const last2 = pendU.slice(-2).map((u) => (u.lo || u.c.toLowerCase())).join('');
        const pi = prevS && prevS.s ? sylIndex.get(prevS.s) : null;
        let keep = MCL.test(last2) && !(pi != null && r.fin[pi] === 'H' && r.syl[pi] && r.syl[pi].w !== 'H') ? 2 : 1;
        if (pendU[pendU.length - 1].glide && pendU.length > keep) keep++; // qu, gu, su ante vocal
        const cut = pendU.slice(0, -keep).reduce((a, u) => a + (u.d || u.c).length, 0);
        sylls[sylls.length - 1].t += pending.slice(0, cut); pending = pending.slice(cut);
      }
      sylls.push({ t: pending + show(s.u, s), s }); pending = ''; pendU = [];
    }
    if (sylls.length) sylls[sylls.length - 1].t += pending; else if (pending) sylls.push({ t: pending, s: null });
    for (const sy of sylls) {
      const i = sy.s ? sylIndex.get(sy.s) : null;
      const elid = sy.s && r.elided.has(sy.s);
      if (i != null && starts.has(i) && i > 0) vrow.append(el('span', 'scan-foot'));
      const node = el('span', 'scan-syl' + (elid ? ' el' : ''));
      const fw = i == null ? '' : r.fin[i];
      node.append(el('span', 'm', elid || i == null ? '' : fw === 'H' ? '—' : fw === 'L' ? '∪' : fw === 'X' ? '×' : '?'), el('span', null, sy.t));
      vrow.append(node);
      if (cz && i != null && cz.after === i + 1) vrow.append(el('span', 'scan-caes', '‖'));
    }
  });
  box.append(vrow);
}
function patternText(r) {
  if (!r.fit) return '';
  const sym = { D: '— ∪ ∪', S: '— —', X: '— ×', '|': '‖' };
  if (r.fit.meter === 'hexámetro') return r.fit.feet.map((f) => sym[f]).join('  |  ');
  const [a, b] = r.fit.feet;
  return [sym[a], sym[b], '—', '‖', sym.D, sym.D, '×'].join('  ');
}
const FEETNAME = { D: 'dáctilo', S: 'espondeo' };
const SCAN = (() => {
  const p = panel('panelScan', 'Escansión', 'wide center');
  const box = el('div');
  const nav = el('div', 'scan-nav');
  const bPrev = btn('← Verso anterior', null, () => go(-1)), bNext = btn('Verso siguiente →', null, () => go(1));
  nav.append(bPrev, bNext);
  p.append(box, nav, el('p', 'lib-note', (GR
    ? 'Escansión automática para hexámetros y dísticos elegíacos. α, ι, υ de cantidad dudosa se deciden por el metro; se tienen en cuenta la abreviación épica y los grupos de oclusiva + líquida. Si un verso solo encaja con sinicesis, se indica. No reconoce otros metros (trímetros, lírica).'
    : 'Escansión automática para hexámetros y dísticos elegíacos, con las cantidades del léxico de Collatinus y las reglas de posición y elisión. Las vocales de cantidad dudosa se deciden por el metro. No reconoce otros metros (yambos, lírica horaciana).')));
  let lines = [], idx = 0;
  async function show() {
    box.replaceChildren(el('p', 'x-muted', 'Escandiendo…'));
    bPrev.disabled = idx <= 0; bNext.disabled = idx >= lines.length - 1;
    const line = (lines[idx] || '').replace(/\s+/g, ' ').trim();
    const orig = el('div', 'x-muted', line); orig.lang = LG; orig.style.fontFamily = 'var(--f-text)';
    let r = null;
    try { r = GR ? await scanGreek(line) : await scanLatin(line); } catch (e) { console.error(e); }
    box.replaceChildren(orig);
    if (!r) { box.append(el('p', null, 'Este verso es demasiado corto para escandirlo.')); return; }
    if (!GR) renderLatinScan(r, box);
    renderSyllables(r, box);
    if (r.fit) {
      const info = el('p');
      const feetNames = r.fit.meter === 'hexámetro' ? r.fit.feet.slice(0, 5).map((f) => FEETNAME[f]) : null;
      info.append(el('b', null, r.fit.meter[0].toUpperCase() + r.fit.meter.slice(1)));
      if (feetNames) info.append(document.createTextNode(': ' + feetNames.join(', ') + ' y final ' + (r.fin[r.fin.length - 1] === 'L' ? 'troqueo' : 'espondeo') + '.'));
      const cz = caesura(r.fit, r.syl); if (cz && r.fit.meter === 'hexámetro') info.append(document.createTextNode(' Cesura ' + cz.name + ' (‖).'));
      if (r.syn != null) info.append(document.createTextNode(' Con sinicesis (dos vocales en una sílaba).'));
      box.append(el('div', 'scan-pattern', patternText(r)), info);
      if (r.fit.c >= 1.5) box.append(el('p', 'x-muted', 'Encaje dudoso: revisa las sílabas marcadas.'));
    } else {
      box.append(el('p', null, 'No encuentro un hexámetro ni un pentámetro en este verso. Puede ser otro metro, prosa o un verso con licencias (sinicesis, hiato…) que el programa no reconoce. Arriba ves las cantidades que ha podido determinar (? = dudosa).'));
    }
  }
  function go(d) { idx = Math.max(0, Math.min(lines.length - 1, idx + d)); show(); }
  return { open(ls, i) { lines = ls; idx = i; openPanel(p); show(); } };
})();

/* --- extraer los versos alrededor de la palabra tocada --- */
function linesForHit(hit) {
  const seg = (hit.segs || [])[0]; if (!seg) return null;
  const node = seg.node;
  // texto de la biblioteca: un verso por elemento .l
  const lEl = node.parentElement && node.parentElement.closest('.l');
  if (lEl) {
    const all = Array.from(L.docEl.querySelectorAll('.l'));
    return { lines: all.map((x) => x.textContent), index: all.indexOf(lEl) };
  }
  // PDF: agrupar los fragmentos de la capa de texto por renglones
  const tl = node.parentElement && node.parentElement.closest('.textLayer');
  if (tl) {
    const spans = Array.from(tl.querySelectorAll('span')).filter((s) => s.textContent.trim() && !s.querySelector('span'));
    const items = spans.map((s) => { const r = s.getBoundingClientRect(); return { s, x: r.left, r: r.right, y: (r.top + r.bottom) / 2, h: r.height }; });
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    for (const it of items) { const last = rows[rows.length - 1]; if (last && Math.abs(last.y - it.y) < Math.max(3, it.h * 0.45)) last.items.push(it); else rows.push({ y: it.y, items: [it] }); }
    let index = 0;
    const lines = rows.map((row, k) => {
      row.items.sort((a, b) => a.x - b.x); let t = ''; let prev = null;
      for (const it of row.items) { if (prev && it.x - prev.r > it.h * 0.15 && !/\s$/.test(t)) t += ' '; t += it.s.textContent; prev = it; if (it.s.contains(node)) index = k; }
      return t;
    });
    return { lines, index };
  }
  // HTML, ePub, Word: el bloque, dividido por saltos de línea
  const blk = node.parentElement && node.parentElement.closest(L.BLOCK);
  if (!blk) return null;
  let txt = '', pos = -1;
  const w = document.createTreeWalker(blk, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 1) { if (n.localName === 'br') txt += '\n'; continue; }
    if (n === node) pos = txt.length + seg.s;
    txt += n.data;
  }
  let ls = txt.split('\n'); let acc = 0, index = 0;
  for (let k = 0; k < ls.length; k++) { if (pos >= acc && pos <= acc + ls[k].length) { index = k; break; } acc += ls[k].length + 1; }
  // si el bloque es un único renglón, usar los bloques vecinos como versos
  if (ls.length === 1) {
    const parent = blk.parentElement; const sibs = Array.from(parent.children).filter((c) => c.matches(L.BLOCK));
    if (sibs.length > 1 && sibs.every((s) => s.textContent.length < 160)) return { lines: sibs.map((s) => s.textContent), index: sibs.indexOf(blk) };
  }
  return { lines: ls, index };
}

/* ================================================================== enganches con la interfaz */
// botón Biblioteca en la barra
(() => {
  const tools = document.querySelector('.tools'); const openLbl = tools && tools.querySelector('label.primary');
  if (!tools) return;
  const b = el('button', 'btn'); b.type = 'button'; b.id = 'btnLib'; b.title = 'Biblioteca de textos'; b.setAttribute('aria-label', 'Biblioteca');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 2.5 15.5-3.5 1z"/></svg><span class="lbl">Biblioteca</span>';
  b.addEventListener('click', () => { const p = $('#panelLib'); if (!p.hidden) { p.hidden = true; return; } LIB.open(); });
  tools.insertBefore(b, openLbl || null);
})();
// herramientas en el panel Mi vocabulario
(() => {
  const pv = $('#panelVocab'); if (!pv) return;
  const bar = el('div', 'vocab-tools');
  const bDoc = btn('Vocabulario de este documento…', null, () => DV.open());
  const bCards = btn('Repasar con tarjetas', 'primary', () => SRS.open());
  bar.append(bCards, bDoc);
  pv.insertBefore(bar, pv.querySelector('.vocab-bar'));
  const upd = () => { const n = SRS.pending(); bCards.textContent = 'Repasar con tarjetas' + (n ? ' (' + n + ')' : ''); };
  new MutationObserver(() => { if (!pv.hidden) upd(); }).observe(pv, { attributes: true, attributeFilter: ['hidden'] });
  upd();
})();
// botón «Escandir el verso» en la ficha
function decorateFoot(foot, form, res) {
  const hit = L.lastHit; if (!hit || !hit.segs || !hit.segs[0]) return;
  const nd = hit.segs[0].node.parentElement;
  const blk = nd && nd.closest(L.BLOCK);
  const versey = nd && (nd.closest('.l') || nd.closest('.textLayer') || (blk && (blk.querySelector('br') || blk.textContent.length < 120)));
  if (!versey) return;
  const b = el('button', 'x-scan', 'Escandir el verso'); b.type = 'button';
  b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const ls = linesForHit(hit);
    if (!ls || !ls.lines.length) { toast('No encuentro el verso de esta palabra.'); return; }
    SCAN.open(ls.lines, ls.index);
  });
  foot.append(b);
}

window.LectorExtras = { openTei, decorateFoot, scanLatin, scanGreek, fitMeter, documentText, DV, SRS, LIB };
})();
