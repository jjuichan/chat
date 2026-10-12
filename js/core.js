/* ずうっと 발췌기 — core: utilities, state, autosave, history */
(function () {
  'use strict';
  const App = (window.App = window.App || {});

  /* ---------- utilities ---------- */
  const U = (App.util = {});
  U.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  U.merge = function merge(base, over) {
    const out = U.clone(base);
    if (!U.isObj(over)) return out;
    Object.keys(over).forEach((k) => {
      if (U.isObj(over[k]) && U.isObj(out[k])) out[k] = merge(out[k], over[k]);
      else out[k] = U.clone(over[k]);
    });
    return out;
  };
  U.get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  U.set = (obj, path, val) => {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      if (!U.isObj(o[ks[i]])) o[ks[i]] = {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
  };
  U.esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  U.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  U.hexToRgb = (hex) => {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgba = (hex, a) => {
    const [r, g, b] = U.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  // relative luminance → pick readable text colour on top of a background
  U.onColor = (hex) => {
    const [r, g, b] = U.hexToRgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? '#221C1F' : '#FFFFFF';
  };
  U.today = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  };
  U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- toast ---------- */
  App.toast = function (msg, kind, ms) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + (kind || '');
    clearTimeout(App.toast._t);
    App.toast._t = setTimeout(() => (el.className = 'toast'), ms || 2600);
  };

  /* ---------- storage ---------- */
  const KEY = 'zutto-excerpt:doc:v1';
  const KEY_PRESETS = 'zutto-excerpt:presets:v1';
  const KEY_SNAP = 'zutto-excerpt:snapshots:v1';
  const KEY_UI = 'zutto-excerpt:ui:v1';

  const store = (App.store = {
    read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    write(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
        return true;
      } catch (e) {
        App.toast('브라우저 저장 공간이 부족해요. 큰 이미지(배경·아이콘)를 줄여 주세요.', 'error', 4200);
        return false;
      }
    },
    KEY,
    KEY_PRESETS,
    KEY_SNAP,
    KEY_UI,
  });

  App.ui = Object.assign({ tab: 'blocks', zoom: 'fit', open: { source: false, info: false } }, store.read(KEY_UI, {}));
  App.saveUI = U.debounce(() => store.write(KEY_UI, App.ui), 300);

  /* ---------- state ---------- */
  App.normalize = function (doc) {
    const base = App.defaultDoc();
    const d = U.merge(base, doc || {});
    d.style = U.merge(App.presets.baseStyle(), (doc && doc.style) || {});
    d.speakers = ((doc && doc.speakers) || base.speakers).map((s) => U.merge(App.defaultSpeaker(s.id), s));
    d.blocks = ((doc && doc.blocks) || base.blocks).map((b) =>
      Object.assign({ id: U.uid(), type: 'narration', speaker: null, text: '', emph: false, hidden: false, gap: 0 }, b)
    );
    return d;
  };

  App.load = function () {
    const saved = store.read(KEY, null);
    // the first release's untouched sample is replaced by the new default
    const oldSample = saved && (saved.version || 1) < 2 && saved.meta && saved.meta.title === '내일도, 그 다음 날도' && (saved.blocks || []).length === 8;
    App.state = saved && !oldSample ? App.normalize(saved) : App.defaultDoc();
  };

  App.speaker = (id) => App.state.speakers.find((s) => s.id === id) || null;

  /* ---------- history (undo / redo) ---------- */
  const hist = { stack: [], idx: -1, max: 80 };
  App.history = hist;
  function snapshot() {
    const s = JSON.stringify(App.state);
    if (hist.stack[hist.idx] === s) return;
    hist.stack = hist.stack.slice(0, hist.idx + 1);
    hist.stack.push(s);
    if (hist.stack.length > hist.max) hist.stack.shift();
    hist.idx = hist.stack.length - 1;
    App.emit('history');
  }
  const snapshotLater = U.debounce(snapshot, 450);
  App.canUndo = () => hist.idx > 0;
  App.canRedo = () => hist.idx < hist.stack.length - 1;
  function restore(i) {
    hist.idx = i;
    App.state = JSON.parse(hist.stack[i]);
    App.refreshAll();
    persist();
    App.emit('history');
  }
  App.undo = () => {
    snapshot();
    if (App.canUndo()) restore(hist.idx - 1);
  };
  App.redo = () => {
    if (App.canRedo()) restore(hist.idx + 1);
  };

  /* ---------- events ---------- */
  const listeners = {};
  App.on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  App.emit = (ev, data) => (listeners[ev] || []).forEach((fn) => fn(data));

  /* ---------- commit pipeline ---------- */
  function persist() {
    if (store.write(KEY, App.state)) App.emit('saved', new Date());
  }
  const persistLater = U.debounce(persist, 500);
  let rafPending = false;
  /**
   * Call after mutating App.state.
   * opts.list  → re-render block list
   * opts.panels→ re-sync form controls & dynamic panels
   * opts.immediate → push undo snapshot right away (structural change)
   */
  App.commit = function (opts) {
    opts = opts || {};
    if (opts.list) App.emit('list');
    if (opts.panels) App.emit('panels');
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        App.emit('render');
      });
    }
    App.emit('dirty');
    persistLater();
    if (opts.immediate) snapshot();
    else snapshotLater();
  };
  App.refreshAll = () => {
    App.emit('list');
    App.emit('panels');
    App.emit('render');
  };
  App.snapshotNow = snapshot;

  /* ---------- restore points (protection from destructive actions) ---------- */
  App.addRestorePoint = function (label) {
    const list = store.read(KEY_SNAP, []);
    list.unshift({ label, at: Date.now(), doc: App.state });
    while (list.length > 8) list.pop();
    // drop oldest until it fits
    while (list.length && !safeWrite(KEY_SNAP, list)) list.pop();
    App.emit('snapshots');
  };
  function safeWrite(key, v) {
    try {
      localStorage.setItem(key, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  }
})();
