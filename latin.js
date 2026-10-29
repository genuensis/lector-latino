/*
 * latin.js — Lematizador latino para el navegador.
 * Adaptación a JavaScript del núcleo de COLLATINUS 11
 * (© Yves Ouvrard y Philippe Verkerk, licencia GNU GPL v3).
 * Datos léxicos y modelos de flexión: proyecto Collatinus / Biblissima.
 */
(function (global) {
  'use strict';

  // ---------- Utilidades de grafía (port de Ch::) ----------
  const ATONE = {
    'ā': 'a', 'ă': 'a', 'ē': 'e', 'ĕ': 'e', 'ī': 'i', 'ĭ': 'i',
    'ō': 'o', 'ŏ': 'o', 'ū': 'u', 'ŭ': 'u', 'ȳ': 'y', 'ў': 'y',
    'Ā': 'A', 'Ă': 'A', 'Ē': 'E', 'Ĕ': 'E', 'Ī': 'I', 'Ĭ': 'I',
    'Ō': 'O', 'Ŏ': 'O', 'Ū': 'U', 'Ŭ': 'U', 'Ȳ': 'Y', 'Ў': 'Y',
    'ı': 'i', 'ụ': 'u', '̆': ''
  };
  const reAtone = /[āăēĕīĭōŏūŭȳўĀĂĒĔĪĬŌŎŪŬȲЎıụ̆]/g;
  function atone(a) { return a.replace(reAtone, c => ATONE[c]); }

  function deramise(r) {
    return r.replace(/J/g, 'I').replace(/j/g, 'i').replace(/v/g, 'u')
      .replace(/æ/g, 'ae').replace(/Æ/g, 'Ae').replace(/œ/g, 'oe').replace(/Œ/g, 'Oe')
      .replace(/ụ/g, 'u').replace(/V/g, 'U');
  }

  function isUpper(ch) { return ch !== ch.toLowerCase() && ch === ch.toUpperCase(); }
  function isLower(ch) { return ch !== ch.toUpperCase() && ch === ch.toLowerCase(); }
  function count(s, sub) {
    if (!sub) return 0;
    let n = 0, i = 0;
    while ((i = s.indexOf(sub, i)) !== -1) { n++; i += sub.length; }
    return n;
  }

  function communes(g) {
    const maj = g.length > 0 && isUpper(g[0]);
    g = g.toLowerCase();
    if (/[aeiouy]/.test(g)) {
      g = g.replace(/a/g, 'ā̆');
      g = g.replace(/([^āăō])e/g, '$1ē̆');
      g = g.replace(/^e/, 'ē̆');
      g = g.replace(/i/g, 'ī̆');
      g = g.replace(/o/g, 'ō̆');
      g = g.replace(/([^āēq])u/g, '$1ū̆');
      g = g.replace(/^u/, 'ū̆');
      g = g.replace(/^y/, 'ȳ̆');
      g = g.replace(/([^ā])y/g, '$1ȳ̆');
    }
    if (maj) g = g[0].toUpperCase() + g.slice(1);
    return g;
  }

  const CONS = 'bcdfgjklmnpqrstvxz';
  function allonge(f) {
    if (!f) return f;
    const t = f.length;
    if (CONS.includes(f[t - 1]) && !'āe āu ēu ōe'.includes(f.substr(t - 3, 2).toLowerCase())) {
      const pairs = [['[aă]', 'ā'], ['[eĕ]', 'ē'], ['[iĭ]', 'ī'], ['[oŏ]', 'ō'],
        ['[uŭ]', 'ū'], ['[yȳ]', 'ў'], ['[AĂ]', 'Ā'], ['[EĔ]', 'Ē'],
        ['[IĬ]', 'Ī'], ['[OŎ]', 'Ō'], ['[UŬ]', 'Ū'], ['[YȲ]', 'Ў']];
      for (const [cls, rep] of pairs) f = f.replace(new RegExp(cls + '([' + CONS + '])$'), rep + '$1');
    }
    return f;
  }

  function listeI(l) {
    const res = [];
    for (const v of l.split(',')) {
      if (v.includes('-')) {
        const [a, b] = v.split('-').map(x => parseInt(x, 10) || 0);
        for (let i = a; i <= b; i++) res.push(i);
      } else res.push(parseInt(v, 10) || 0);
    }
    return res;
  }

  function multiAdd(map, key, val) {
    const a = map.get(key);
    if (a) a.push(val); else map.set(key, [val]);
  }

  // ---------- Desinencia ----------
  class Desinence {
    constructor(d, morph, nr, modele) {
      let der = -1;
      if (d.length) { const c = d[d.length - 1]; if (c >= '0' && c <= '9') der = +c; }
      if (der > 0) { this.rarete = der; d = d.slice(0, -1); } else this.rarete = 10;
      if (d === '-') d = '';
      this.grq = d;
      this.gr = atone(d);
      this.morpho = morph;
      this.numRad = nr;
      this.modele = modele;
    }
  }

  // ---------- Modelo de flexión ----------
  const CLES = ['modele', 'pere', 'des', 'des+', 'R', 'abs', 'suf', 'sufd', 'abs+', 'pos'];
  class Modele {
    constructor(ll, core) {
      this.core = core;
      this.pere = null;
      this.pos = '';
      this.des = new Map();      // morpho -> [Desinence]
      this.gen = new Map();      // numRad -> chaîne de génération
      this.absents = [];
      this.suf = '';
      const msuff = new Map();   // suffixe -> [morphos]
      const re = /[:;]([\p{L}\p{N}\p{M}_]*)\+?(\$\w+)/u;
      for (let l of ll) {
        let m;
        while ((m = re.exec(l))) {
          const v = m[2];
          let val = core.variables.get(v) || '';
          const pre = m[1];
          if (pre) val = val.split(';').join(';' + pre);
          l = l.split(v).join(val);
        }
        const ec = l.trim().replace(/\s+/g, ' ').split(':');
        const p = CLES.indexOf(ec[0]);
        switch (p) {
          case 0: this.gr = ec[1]; break;
          case 1: this.pere = core.modeles.get(ec[1]) || null; break;
          case 2: case 3: {
            const li = listeI(ec[1]);
            const r = parseInt(ec[2], 10) || 0;
            const ld = (ec[3] || '').split(';');
            for (let i = 0; i < li.length; i++) {
              const ldd = (i < ld.length ? ld[i] : ld[ld.length - 1]).split(',');
              for (const g of ldd) this.addDes(new Desinence(g, li[i], r, this));
            }
            if (p === 3 && this.pere) {
              for (const i of li) for (const dp of this.pere.desinences(i)) this.addDes(this.clone(dp));
            }
            break;
          }
          case 4: this.gen.set(parseInt(ec[1], 10) || 0, ec[2]); break;
          case 8: this.absents.push(...listeI(ec[1])); break;
          case 5: this.absents = listeI(ec[1]); break;
          case 6: for (const mm of listeI(ec[1])) multiAdd(msuff, ec[2], mm); break;
          case 7:
            if (this.pere) {
              this.suf = ec[1];
              for (const d of this.pere.allDesinences()) {
                if (this.absents.includes(d.morpho)) continue;
                this.addDes(new Desinence(allonge(d.grq) + this.suf, d.morpho, d.numRad, this));
              }
            }
            break;
          case 9: this.pos = (ec[1] || '')[0] || ''; break;
          default: break;
        }
      }
      if (this.pere) {
        if (!this.pos) this.pos = this.pere.pos;
        for (const m of this.pere.morphos()) {
          if (this.des.has(m)) continue;
          for (const d of this.pere.desinences(m)) {
            if (this.absents.includes(d.morpho)) continue;
            this.addDes(this.clone(d));
          }
        }
        for (const d of this.allDesinences()) {
          if (!this.gen.has(d.numRad)) this.gen.set(d.numRad, this.pere.genRadical(d.numRad));
        }
        this.absents = this.pere.absents.slice();
      }
      const ldsuf = [];
      for (const [suff, morphs] of msuff) {
        for (const d of this.allDesinences()) {
          if (morphs.includes(d.morpho)) {
            let gq = d.grq; if (gq === '-') gq = '';
            ldsuf.push(new Desinence(gq + suff, d.morpho, d.numRad, this));
          }
        }
      }
      for (const d of ldsuf) this.addDes(d);
    }
    addDes(d) { multiAdd(this.des, d.morpho, d); this.core.ajDesinence(d); }
    clone(d) { return new Desinence(d.grq + this.suf, d.morpho, d.numRad, this); }
    desinences(m) { return this.des.get(m) || []; }
    allDesinences() { const r = []; for (const a of this.des.values()) r.push(...a); return r; }
    morphos() { return Array.from(this.des.keys()); }
    genRadical(r) { if (!this.gen.has(r)) this.gen.set(r, ''); return this.gen.get(r); }
    clesR() { return Array.from(this.gen.keys()).sort((a, b) => a - b); }
  }

  // ---------- Radical y lema ----------
  class Radical {
    constructor(g, n, lemme) {
      this.lemme = lemme;
      this.grq = communes(g);
      this.gr = atone(g);
      this.num = n;
    }
  }

  class Lemme {
    constructor(linea, origin, core) {
      const ec = linea.split('|');
      const lg = ec[0].split('=');
      this.cle = atone(deramise(lg[0]));
      let grd = lg[0];
      const last = grd[grd.length - 1];
      if (last >= '1' && last <= '9') grd = grd.slice(0, -1);
      this.grq = lg.length === 1 ? grd : lg[1];
      this.gr = atone(this.grq.split(',')[0]);
      this.modeleNom = ec[1];
      this.modele = core.modeles.get(ec[1]);
      this.origin = origin;
      this.radicaux = new Map();
      this.irrExcl = new Set();
      for (let i = 2; i < 4; i++) {
        if (ec[i]) for (const rad of ec[i].split(',')) multiAdd(this.radicaux, i - 1, new Radical(rad, i - 1, this));
      }
      this.indMorph = ec[4] || '';
      const c = /cf\.\s([\p{L}\p{N}_]+)$/u.exec(this.indMorph);
      this.renvoi = c ? c[1] : '';
      this.nbOcc = parseInt(ec[5], 10) || 1;
      this.lang = ec[6] || '';
      this.trad = ec[7] || '';
      this.pos = ec[8] || (this.modele ? this.modele.pos : '') || '';
      this.uid = ++Lemme.n;
    }
  }

  Lemme.n = 0;

  // ---------- Núcleo ----------
  const SUFFIXES = [['ne', 'nĕ'], ['que', 'quĕ'], ['st', 'st'], ['ue', 'vĕ'], ['ve', 'vĕ']];

  class LemCore {
    constructor() {
      this.variables = new Map();
      this.modeles = new Map();
      this.desinences = new Map();
      this.radicaux = new Map();
      this.lemmes = new Map();
      this.irregs = new Map();
      this.contractions = [];
      this.assims = [];
      this.assimsq = [];
      this.morphos = [];
      this.extLoaded = false;
    }

    ajDesinence(d) { multiAdd(this.desinences, deramise(d.gr), d); }

    load(modelesTxt, lexiqueTxt, extra, regimenTxt) {
      this.regimen = new Map();
      for (const l of (regimenTxt || '').split('\n')) { const i = l.indexOf('\t'); if (i > 0) this.regimen.set(l.slice(0, i), l.slice(i + 1)); }
      this.morphos = extra.morphos;
      this.morphosEn = extra.morphos_en || [];
      this.casEn = extra.cas_en || [];
      this.modesEn = extra.modes_en || [];
      this.tempsEn = extra.temps_en || [];
      this.nombresEn = extra.nombres_en || [];
      this.abrev = new Set(extra.abrev || []);
      this.contractions = extra.contractions.slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      const aq = extra.assims.slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      this.assimsq = aq;
      this.assims = aq.map(([a, b]) => [atone(a), atone(b)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      // modelos
      const lignes = modelesTxt.split('\n').filter(l => l && !l.startsWith('!'));
      let sl = [];
      const max = lignes.length - 1;
      for (let i = 0; i <= max; i++) {
        const l = lignes[i].replace(/\r$/, '');
        if (l.startsWith('$')) {
          const k = l.indexOf('=');
          this.variables.set(l.slice(0, k), l.slice(k + 1));
          continue;
        }
        const head = l.split(':')[0];
        if ((head === 'modele' || i === max) && sl.length) {
          if (i === max && head !== 'modele') { sl.push(l); }
          const m = new Modele(sl, this);
          this.modeles.set(m.gr, m);
          sl = [];
          if (i === max && head !== 'modele') continue;
        }
        sl.push(l);
      }
      // léxico
      let origin = 0;
      for (const l of lexiqueTxt.split('\n')) {
        if (!l) continue;
        if (l === '#EXT') { origin = 1; this.extLoaded = true; continue; }
        const lem = new Lemme(l, origin, this);
        if (!lem.modele) continue;
        if (!this.lemmes.has(lem.cle)) this.lemmes.set(lem.cle, lem);
        this.ajRadicaux(lem);
      }
      // irregulares
      for (const lin of extra.irregs) {
        const ecl = lin.split(':');
        let grq = ecl[0], excl = false;
        if (grq.endsWith('*')) { grq = grq.slice(0, -1); excl = true; }
        const lem = this.lemmes.get(ecl[1]);
        if (!lem) continue;
        const irr = { grq, gr: atone(grq), lemme: lem, morphos: listeI(ecl[2]), excl };
        multiAdd(this.irregs, deramise(irr.gr), irr);
        if (excl) irr.morphos.forEach(m => lem.irrExcl.add(m));
      }
    }

    ajRadicaux(l) {
      const m = l.modele;
      for (const [, lr] of l.radicaux) for (const r of lr) multiAdd(this.radicaux, deramise(r.gr), r);
      for (const i of m.clesR()) {
        if (l.radicaux.has(i)) continue;
        for (let g of l.grq.split(',')) {
          const gen = m.genRadical(i);
          if (gen === '-') continue;
          let r;
          if (gen === 'K') r = new Radical(g, i, l);
          else {
            const parts = gen.split(',');
            const oter = parseInt(parts[0], 10) || 0;
            const ajouter = parts[1] === undefined ? '' : parts[1];
            if (g.endsWith('̆')) g = g.slice(0, -1);
            g = oter > 0 ? g.slice(0, Math.max(0, g.length - oter)) : g;
            if (ajouter !== '0') g += ajouter;
            r = new Radical(g, i, l);
          }
          multiAdd(l.radicaux, i, r);
          multiAdd(this.radicaux, deramise(r.gr), r);
        }
      }
    }

    // Núcleo: radical + desinencia
    lemmatise(f) {
      const result = new Map(); // Lemme -> [{grq, morpho, sufq}]
      if (!f) return result;
      const push = (l, sl) => { const a = result.get(l); if (a) a.unshift(sl); else result.set(l, [sl]); };
      const fl = f.toLowerCase();
      const cntV = count(fl, 'v');
      const Vmaj = f[0] === 'V';
      // ligaduras: se comparan con los diptongos de la forma completa (tema + desinencia);
      // Collatinus solo los buscaba en el tema y por eso fallaban hæc, quædam, æs…
      const cntAe = count(fl, 'æ');
      const cntOe = count(fl, 'œ');
      f = deramise(f);
      for (const irr of this.irregs.get(f) || []) for (const m of irr.morphos) push(irr.lemme, { grq: irr.grq, morpho: m, sufq: '' });
      for (let i = 0; i <= f.length; i++) {
        const r = f.slice(0, i), d = f.slice(i);
        const ldes = this.desinences.get(d);
        if (!ldes) continue;
        let lrad = this.radicaux.get(r) || [];
        if (d.startsWith('i') && !d.startsWith('ii') && !r.endsWith('i')) lrad = lrad.concat(this.radicaux.get(r + 'i') || []);
        if (!lrad.length) continue;
        for (const rad of lrad) {
          const l = rad.lemme;
          for (const des of ldes) {
            if (des.modele === l.modele && des.numRad === rad.num && !l.irrExcl.has(des.morpho)) {
              const rq = rad.grq.toLowerCase();
              let c = cntV === 0 || cntV === count(rq, 'v') + count(des.grq, 'v');
              if (!c) c = Vmaj && rad.gr[0] === 'U' && cntV - 1 === count(rq, 'v');
              const fq0 = (rq + des.grq).toLowerCase();
              c = c && (cntOe === 0 || cntOe === count(fq0, 'ōe') + count(fq0, 'œ'));
              c = c && (cntAe === 0 || cntAe === count(fq0, 'āe') + count(fq0, 'prăe') + count(fq0, 'prăĕ') + count(fq0, 'æ'));
              if (c) {
                let fq = rad.grq + des.grq;
                if (!r.endsWith('i') && rad.gr.endsWith('i')) fq = rad.grq.slice(0, -1) + 'ī' + des.grq.slice(1);
                push(l, { grq: fq, morpho: des.morpho, sufq: '' });
              }
            }
          }
        }
      }
      if (this.extLoaded && result.size) {
        const res = new Map();
        for (const [l, v] of result) if (l.origin === 0) res.set(l, v);
        if (res.size) return this.romains(f, res);
        return this.romains(f, result);
      }
      return this.romains(f, result);
    }

    romains(f, result) {
      if (f && !/[^IUXLCDM]/.test(f) && !f.includes('IL') && !f.includes('IUI') && !this.lemmes.has(f)) {
        const fv = f.replace(/U/g, 'V');
        const conv = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
        let res = 0, s = conv[fv[0]];
        for (let i = 0; i < fv.length - 1; i++) { const c = s; s = conv[fv[i + 1]]; res += c < s ? -c : c; }
        res += s;
        const rom = { cle: f, grq: fv, gr: fv, indMorph: 'num. romano', nbOcc: 1, origin: 0, lang: 'es', trad: String(res), renvoi: '', roman: true };
        result.set(rom, [{ grq: fv, morpho: 416, sufq: '' }]);
      }
      return result;
    }

    assim(a) { for (const [d, v] of this.assims) if (a.startsWith(d)) return a.replace(d, v); return a; }
    assimq(a) { for (const [d, v] of this.assimsq) if (a.startsWith(d)) return a.replace(d, v); return a; }
    desassim(a) { for (const [k, d] of this.assims) if (a.startsWith(d)) return a.replace(d, k); return a; }
    desassimq(a) { for (const [k, d] of this.assimsq) if (a.startsWith(d)) return a.replace(d, k); return a; }

    lemmatiseM(f, debPhr = true, etape = 0) {
      let mm = new Map();
      if (!f) return mm;
      if (etape > 3 || etape < 0) {
        mm = this.lemmatise(f);
        if (debPhr && isUpper(f[0])) {
          const nmm = this.lemmatiseM(f.toLowerCase());
          for (const [k, v] of nmm) mm.set(k, v);
        }
        return mm;
      }
      mm = this.lemmatiseM(f, debPhr, etape + 1);
      let fd;
      switch (etape) {
        case 3: {
          fd = f;
          for (const [cle, val] of this.contractions) {
            if (fd.endsWith(cle)) {
              fd = fd.slice(0, fd.length - cle.length);
              fd += (fd.includes('v') || fd.includes('V')) ? val : deramise(val);
              const nmm = this.lemmatiseM(fd, debPhr, 4);
              for (const [nl, lst] of nmm) {
                const diff = val.length - cle.length;
                const nl2 = lst.map(s => {
                  let position = f.length - cle.length + 1;
                  if (fd.length !== s.grq.length) {
                    const debut = s.grq.slice(0, position + 2);
                    position += count(debut, '̆');
                  }
                  return { grq: s.grq.slice(0, position) + s.grq.slice(position + diff), morpho: s.morpho, sufq: s.sufq };
                });
                mm.set(nl, nl2);
              }
            }
          }
          break;
        }
        case 2: {
          fd = this.assim(f);
          if (fd !== f) {
            const nmm = this.lemmatiseM(fd, debPhr, 3);
            for (const [nl, lst] of nmm) mm.set(nl, lst.map(s => ({ ...s, grq: this.desassimq(s.grq) })));
            return mm;
          }
          fd = this.desassim(f);
          if (fd !== f) {
            const nmm = this.lemmatiseM(fd, debPhr, 3);
            for (const [nl, lst] of nmm) mm.set(nl, lst.map(s => ({ ...s, grq: this.assimq(s.grq) })));
            return mm;
          }
          break;
        }
        case 1: {
          if (mm.size === 0) {
            for (const [suf, sufq] of SUFFIXES) {
              if (mm.size === 0 && f.endsWith(suf)) {
                let sf = f.slice(0, f.length - suf.length);
                mm = this.lemmatiseM(sf, debPhr, 1);
                let sst = false;
                if (mm.size === 0 && suf === 'st') {
                  sf += 's';
                  mm = this.lemmatiseM(sf, debPhr, 1);
                  sst = true;
                }
                for (const [l, ls] of mm) mm.set(l, ls.map(s => ({ ...s, sufq: sst ? 't' : s.sufq + sufq })));
              }
            }
          }
          break;
        }
        case 0: {
          if (mm.size === 0 && isLower(f[0])) {
            return this.lemmatiseM(f[0].toUpperCase() + f.slice(1), false, 1);
          }
          break;
        }
        default: break;
      }
      return mm;
    }

    // ---------- API de alto nivel ----------
    static clean(w) {
      // quita acentos agudos, macrones, breves y diéresis; conserva æ œ
      let s = w.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
      s = s.replace(/[’'`´]/g, '');
      return s;
    }

    lemmeByCle(k) { return this.lemmes.get(k) || this.lemmes.get(atone(deramise(k))); }

    traduction(l) {
      if (l.renvoi) {
        const lr = this.lemmeByCle(l.renvoi);
        if (lr && lr.trad) return { lang: lr.lang, text: lr.trad, via: lr.grq };
      }
      // glosas que solo remiten a otro lema («part. de accuso», «= intercursus», «véase X»)
      const m = /^(?:part(?:\.|icipio)(?: (?:pres|pas|perf|fut)\.?)?(?: de)?|=|véase|cf\.)\s+([\p{L}]+\d?)\.?$/u.exec((l.trad || '').trim());
      if (m) {
        const lr = this.lemmeByCle(m[1]);
        if (lr && lr !== l && lr.trad) return { lang: l.lang, text: l.trad + ': ' + lr.trad, via: null };
      }
      return { lang: l.lang, text: l.trad, via: null };
    }

    lemmatiseTout(word) {
      const f = LemCore.clean(word);
      if (!f || !/[A-Za-zæœÆŒ]/.test(f)) return null;
      const mm = this.lemmatiseM(f, true);
      // Ediciones que escriben V por U (Vt, Vrbem, VRBS): probar también la grafía con u.
      const alt = f.replace(/V/g, 'U').replace(/v/g, 'u');
      if (alt !== f && (/^V/.test(f) || f === f.toUpperCase() || mm.size === 0)) {
        for (const [k, v] of this.lemmatiseM(alt, true)) if (!mm.has(k)) mm.set(k, v);
      }
      return mm;
    }

    // ---------- Etiquetador contextual (port de Tagueur/Mot de Collatinus) ----------
    loadTags(txt) {
      this.tagOcc = new Map(); this.tagTot = new Map(); this.trigram = new Map();
      let part = 0;
      for (const l of txt.split('\n')) {
        if (!l) continue;
        if (l.startsWith('! --- ')) { part = 1; continue; }
        const i = l.lastIndexOf(',');
        if (i < 0) continue;
        const k = l.slice(0, i), n = parseInt(l.slice(i + 1), 10) || 0;
        if (part === 0) { this.tagOcc.set(k, (this.tagOcc.get(k) || 0) + n); this.tagTot.set(k[0], (this.tagTot.get(k[0]) || 0) + n); }
        else this.trigram.set(k, n);
      }
      this.tagsLoaded = true;
    }

    tagOf(l, m) {
      let lp = l.pos || '';
      if (lp && !/[a-z]/i.test(lp[0])) lp = '';
      const morph = m === 416 ? 'inv.' : (this.morphosEn[m - 1] || '');
      let out = '';
      for (const p of lp) {
        if (p === 'n' && m === 413) { out += 'n71,'; continue; }
        if (p === 'v' && morph.includes(' -u')) { out += 'v3 ,'; continue; }
        let done = false;
        if (p === 'v') {
          for (let i = 0; i < 4; i++) if (morph.includes(this.modesEn[i])) {
            out += 'v' + (i + 1) + (morph.includes(this.tempsEn[0]) ? '1' : ' ') + ','; done = true; break;
          }
        }
        if (!done) {
          for (let i = 0; i < 6; i++) if (morph.includes(this.casEn[i])) {
            out += (p === 'v' ? 'w' : p) + (i + 1) + (morph.includes(this.nombresEn[1]) ? '2' : '1') + ','; done = true; break;
          }
        }
        if (!done) out += p + '  ,';
      }
      return out;
    }

    fraction(listTags) {
      let frFin = 0;
      while (listTags.length > 2) {
        const t = listTags.slice(0, 3);
        listTags = listTags.slice(4);
        let fr = 0;
        if (this.tagOcc.has(t)) {
          const occ = this.tagOcc.get(t), tot = this.tagTot.get(t[0]) || 1;
          if (t[0] === 'a' || t[0] === 'p' || t[0] === 'w') fr = Math.floor(occ * 341 / tot);
          else if (t[0] === 'v' && t[2] === '1') fr = Math.floor(occ * 512 / tot);
          else if (t[0] === 'v' && t[2] === ' ') fr = Math.floor(occ * 256 / tot);
          else if (t[0] === 'n') fr = Math.floor(occ * 1024 / tot);
          else fr = 1024;
          if (fr === 0) fr = 1;
        }
        if (frFin < fr) frFin = fr;
      }
      return frFin === 0 ? 1024 : frFin;
    }

    mot(forme) {
      const r = { forme, entries: [], probas: new Map(), tagEncl: '' };
      if (!forme) { r.probas.set('snt', 1); return r; }
      const mm = this.lemmatiseTout(forme) || new Map();
      let encl = '';
      for (const [l, lst] of mm) {
        const nb = l.nbOcc || 1;
        for (const s of lst) {
          let lt = this.tagOf(l, s.morpho);
          r.entries.push({ l, s, lt, fr: nb * this.fraction(lt) });
          if (s.sufq) encl = s.sufq;
          while (lt.length > 2) {
            const t = lt.slice(0, 3); lt = lt.slice(4);
            r.probas.set(t, (r.probas.get(t) || 0) + nb * this.fraction(t));
          }
        }
      }
      if (this.abrev.has(forme)) {
        r.probas = new Map();
        for (let i = 1; i < 7; i++) { const t = 'n' + i + '1'; r.probas.set(t, this.tagOcc.get(t) || 0); }
      }
      let total = 0; for (const v of r.probas.values()) total += v;
      if (!total) total = 1;
      for (const [t, v] of r.probas) { let pr = Math.floor(v * 1024 / total); if (pr === 0) pr = 1; r.probas.set(t, pr); }
      if (encl === 'quĕ' || encl === 'vĕ') r.tagEncl = 'ce ';
      else if (encl === 'nĕ') r.tagEncl = 'de ';
      else if (encl === 'st') r.tagEncl = 'v11';
      const fl = forme.toLowerCase();
      if (/^(me|te|se|nobis|vobis|uobis|quibus|qua|quo|qui)cum$/.test(fl)) {
        r.tagEncl = 're ';
        if (!r.probas.size) r.probas.set('p61', 1024);
        else if (r.probas.size === 1 && !r.probas.has('p61')) { r.probas = new Map([['p61', 1024]]); }
      }
      return r;
    }

    // Devuelve, para la palabra de índice `index` en la frase `words`, el análisis más probable en contexto.
    contexte(words, index) {
      if (!this.tagsLoaded || index < 0 || index >= words.length) return null;
      // ventana prudente para frases muy largas
      let a = 0, b = words.length;
      if (b > 60) { a = Math.max(0, index - 30); b = Math.min(words.length, index + 30); }
      const ws = words.slice(a, b); index -= a;
      const mots = ws.map((w) => this.mot(w));
      mots.push(this.mot(''));
      let sequences = ['snt'], probas = [1.0];
      for (let i = 0; i < mots.length; i++) {
        const mot = mots[i];
        const lTags = [...mot.probas.keys()].sort();
        const sTag = lTags.length;
        if (!sTag) continue;
        const nvlSeq = [], nvlP = [];
        for (let j = 0; j < sequences.length; j++) {
          const bigr = sequences[j].slice(-7);
          const pr = []; let tot = 0;
          for (const t of lTags) { const p = mot.probas.get(t) * (4 * (this.trigram.get(bigr + ' ' + t) || 0) + 1); pr.push(p); tot += p; }
          if (!tot) tot = 1;
          for (let k = 0; k < sTag; k++) { nvlSeq.push(sequences[j] + ' ' + lTags[k]); nvlP.push(probas[j] * pr[k] / tot); }
        }
        if (mot.tagEncl) for (let j = 0; j < nvlSeq.length; j++) nvlSeq[j] += ' ' + mot.tagEncl;
        sequences = []; probas = [];
        for (let j = 0; j < nvlSeq.length; j++) if (nvlP[j] > 0) {
          const bigr = nvlSeq[j].slice(-7);
          let seq = '', val = -1, seq2 = '', val2 = -1;
          for (let k = j; k < nvlSeq.length; k += sTag) if (bigr === nvlSeq[k].slice(-7)) {
            if (val2 < nvlP[k]) {
              if (val < nvlP[k]) { val2 = val; seq2 = seq; val = nvlP[k]; seq = nvlSeq[k]; }
              else { val2 = nvlP[k]; seq2 = nvlSeq[k]; }
            }
            nvlP[k] = -1;
          }
          sequences.push(seq); probas.push(val);
          if (val2 > 0) { sequences.push(seq2); probas.push(val2); }
        }
        if (!sequences.length) return null;
      }
      let best = '', bv = -1;
      for (let i = 0; i < sequences.length; i++) if (probas[i] > bv) { bv = probas[i]; best = sequences[i]; }
      let seq = best.slice(4), tag = null;
      for (let i = 0; i < mots.length - 1; i++) {
        const m = mots[i];
        if (!m.probas.size) continue;
        const t = seq.slice(0, 3);
        if (i === index) { tag = t; break; }
        seq = m.tagEncl ? seq.slice(5 + m.tagEncl.length) : seq.slice(4);
      }
      if (!tag) return null;
      // Mot::choisir: entre los análisis compatibles con la etiqueta, el más frecuente
      let choix = null, valeur = -1;
      for (const e of mots[index].entries) if (e.lt.includes(tag) && valeur < e.fr) { valeur = e.fr; choix = e; }
      if (!choix) return { tag };
      return { tag, lid: choix.l.uid, morpho: choix.s.morpho, grq: choix.s.grq, sufq: choix.s.sufq || '', forme: ws[index] };
    }

    analyse(word) {
      const mm = this.lemmatiseTout(word);
      if (!mm) return [];
      const out = [];
      for (const [l, lst] of mm) {
        const tr = this.traduction(l);
        const seen = new Set();
        const formes = [];
        for (const s of lst) {
          const key = s.grq + '|' + s.morpho + '|' + s.sufq;
          if (seen.has(key)) continue;
          seen.add(key);
          formes.push({ forme: s.grq + (s.sufq ? '·' + s.sufq : ''), morpho: s.morpho === 416 ? '' : (this.morphos[s.morpho - 1] || ''), enclitique: s.sufq || '', m: s.morpho, grq: s.grq, t: this.tagOf(l, s.morpho) });
        }
        out.push({
          lemme: l.grq.replace(/,/g, ', ').replace(/ {2}/g, ' '),
          cle: l.cle, gr: l.gr, lid: l.uid,
          indMorph: l.indMorph,
          trad: tr.text, lang: tr.lang, via: tr.via,
          freq: l.nbOcc, ext: l.origin === 1, roman: !!l.roman,
          regime: (!l.origin && this.regimen && this.regimen.get(l.cle)) || '',
          formes
        });
      }
      out.sort((a, b) => b.freq - a.freq);
      return out;
    }
  }

  global.LatinCore = LemCore;
  global.LatinUtil = { atone, deramise };
  if (typeof module !== 'undefined') module.exports = { LemCore, atone, deramise };
})(typeof window !== 'undefined' ? window : globalThis);
