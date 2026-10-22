/* Hilo de trabajo del lematizador: carga el léxico de Collatinus y responde consultas. */
importScripts('latin.js');
let core = null;
const ready = (async () => {
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); });
  const [mod, lex, extra, reg] = await Promise.all([get('data/modeles.txt'), get('data/lexique.txt'), get('data/extra.json'), get('data/regimen.txt').catch(() => '')]);
  const c = new self.LatinCore();
  c.load(mod, lex, JSON.parse(extra), reg);
  core = c;
  self.postMessage({ type: 'ready', lemmes: c.lemmes.size });
})().catch((e) => self.postMessage({ type: 'error', message: String(e && e.message || e) }));

let tagsReady = null;
function ensureTags() {
  if (!tagsReady) tagsReady = fetch('data/tags.txt').then((r) => { if (!r.ok) throw new Error('tags'); return r.text(); }).then((t) => core.loadTags(t));
  return tagsReady;
}

self.onmessage = async (e) => {
  const { id, word, ctx } = e.data;
  try {
    await ready;
    if (ctx) {
      await ensureTags();
      self.postMessage({ type: 'result', id, result: core.contexte(ctx.words, ctx.index) });
      return;
    }
    self.postMessage({ type: 'result', id, result: core ? core.analyse(word) : [] });
  } catch (err) {
    self.postMessage({ type: 'result', id, result: [], error: String(err) });
  }
};
