/* 리츠 노트 — data, persistence and merging
   Everything lives in one plain object. It is saved to IndexedDB (falls back to
   localStorage), exported as a .json file, and synced to Google Drive. Facts and
   logs are keyed by id and carry updatedAt, and deletions leave a tombstone, so
   two copies (this device / Drive / an imported file) can always be merged item
   by item without asking which side wins. */
(function () {
  'use strict';
  const N = (window.Notes = window.Notes || {});

  /* ---------- tiny helpers ---------- */
  const U = (N.util = {
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    esc: (s) =>
      String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    debounce(fn, ms) {
      let t;
      return function () {
        clearTimeout(t);
        const args = arguments;
        t = setTimeout(() => fn.apply(null, args), ms);
      };
    },
    // whitespace/quote-insensitive form used to check that a quote really is in a log
    norm: (s) =>
      String(s || '')
        .replace(/[“”「」『』"*]/g, '')
        .replace(/[‘’']/g, '')
        .replace(/\s+/g, '')
        .toLowerCase(),
    // Find `quote` in `text` ignoring spaces, quote marks and asterisks, and return the
    // exact original substring (so highlighting works), or null when it isn't there.
    locate(text, quote) {
      if (!text || !quote) return null;
      if (text.includes(quote)) return quote;
      const skip = /[\s“”「」『』"*‘’']/;
      const map = [];
      let norm = '';
      for (let i = 0; i < text.length; i++) {
        if (skip.test(text[i])) continue;
        norm += text[i].toLowerCase();
        map.push(i);
      }
      const q = U.norm(quote);
      const at = q ? norm.indexOf(q) : -1;
      if (at < 0) return null;
      return text.slice(map[at], map[at + q.length - 1] + 1);
    },
    date(ts) {
      if (!ts) return '—';
      const d = new Date(ts);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    },
    ago(ts) {
      if (!ts) return '아직 없음';
      const s = (Date.now() - ts) / 1000;
      if (s < 60) return '방금';
      if (s < 3600) return `${Math.floor(s / 60)}분 전`;
      if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
      if (s < 86400 * 30) return `${Math.floor(s / 86400)}일 전`;
      return U.date(ts);
    },
  });

  /* ---------- fixed vocabulary ---------- */
  N.CHARS = {
    ritsu: { id: 'ritsu', name: '리츠', full: '사카이 리츠', ja: '酒井律', other: 'enju', aliases: '리츠, 사카이 리츠, 律, 酒井律, Ritsu' },
    enju: { id: 'enju', name: '엔쥬', full: '카나이 엔쥬', ja: '金井媛珠', other: 'ritsu', aliases: '엔쥬, 카나이 엔쥬, 媛珠, 金井媛珠, Enju' },
  };
  N.CATS = [
    { id: 'basic', label: '기본 정보', hint: '나이 · 생일 · 키 · 직업 · 가족 · 사는 곳' },
    { id: 'look', label: '외모', hint: '머리 · 눈 · 체격 · 옷차림 · 습관적인 몸짓' },
    { id: 'personality', label: '성격', hint: '기질 · 가치관 · 감정 표현 방식' },
    { id: 'likes', label: '취향', hint: '좋아하는 것 · 싫어하는 것 · 취미' },
    { id: 'past', label: '과거사', hint: '어린 시절 · 학창 시절 · 예전 일' },
    { id: 'speech', label: '말버릇·호칭', hint: '말투 · 입버릇 · 부르는 이름' },
    { id: 'rel', label: '둘의 관계', hint: '서로에 대한 감정 · 둘만의 약속 · 함께한 일' },
    { id: 'people', label: '인간관계', hint: '가족 · 친구 · 동료' },
    { id: 'adult', label: '🔞 은밀한 설정', hint: '성향 · 취향 · 둘만 아는 것 — 기본으로 가려져 있어요' },
    { id: 'etc', label: '기타', hint: '' },
  ];
  N.catLabel = (id, charId) => {
    if (id === 'rel' && charId) return `${N.CHARS[N.CHARS[charId].other].name}와의 관계`;
    const c = N.CATS.find((x) => x.id === id);
    return c ? c.label : '기타';
  };
  N.STATUS = { canon: '확정', open: '미정', hold: '보류' };

  /* ---------- state ---------- */
  function blank() {
    return {
      v: 1,
      facts: {},
      logs: {},
      tomb: {},
      chars: { ritsu: { aliases: N.CHARS.ritsu.aliases }, enju: { aliases: N.CHARS.enju.aliases }, updatedAt: 0 },
      updatedAt: 0,
    };
  }
  function normalize(s) {
    const b = blank();
    if (!s || typeof s !== 'object') return b;
    const out = Object.assign(b, s);
    out.facts = s.facts && typeof s.facts === 'object' ? s.facts : {};
    out.logs = s.logs && typeof s.logs === 'object' ? s.logs : {};
    out.tomb = s.tomb && typeof s.tomb === 'object' ? s.tomb : {};
    out.chars = Object.assign(blank().chars, s.chars || {});
    Object.values(out.facts).forEach((f) => {
      f.evidence = Array.isArray(f.evidence) ? f.evidence : [];
      f.conflicts = Array.isArray(f.conflicts) ? f.conflicts : [];
      f.status = N.STATUS[f.status] ? f.status : 'open';
      if (!N.CHARS[f.char]) f.char = 'ritsu';
      if (!N.CATS.some((c) => c.id === f.cat)) f.cat = 'etc';
      f.seen = f.seen || 0;
    });
    return out;
  }
  N.isValidData = (s) => s && typeof s === 'object' && s.facts && typeof s.facts === 'object';

  // Merge two copies item by item: newer updatedAt wins, tombstones delete.
  N.merge = function (a, b) {
    a = normalize(a);
    b = normalize(b);
    const out = blank();
    Object.keys(Object.assign({}, a.tomb, b.tomb)).forEach((id) => {
      out.tomb[id] = Math.max(a.tomb[id] || 0, b.tomb[id] || 0);
    });
    ['facts', 'logs'].forEach((k) => {
      const ids = new Set(Object.keys(a[k]).concat(Object.keys(b[k])));
      ids.forEach((id) => {
        const x = a[k][id];
        const y = b[k][id];
        const win = !x ? y : !y ? x : (y.updatedAt || 0) > (x.updatedAt || 0) ? y : x;
        if (out.tomb[id] && out.tomb[id] >= (win.updatedAt || 0)) return;
        out[k][id] = win;
      });
    });
    out.chars = (b.chars.updatedAt || 0) > (a.chars.updatedAt || 0) ? b.chars : a.chars;
    // drop conflict links that point at facts that no longer exist
    Object.values(out.facts).forEach((f) => {
      f.conflicts = f.conflicts.filter((c) => out.facts[c.id]);
    });
    // forget tombstones older than 90 days so the file doesn't grow forever
    const cutoff = Date.now() - 90 * 86400000;
    Object.keys(out.tomb).forEach((id) => {
      if (out.tomb[id] < cutoff) delete out.tomb[id];
    });
    out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return out;
  };

  /* ---------- device-only settings (never exported or synced) ---------- */
  const SKEY = 'ritsu-notes:settings:v1';
  N.settings = Object.assign(
    {
      geminiKey: '',
      geminiPaidKey: '',
      model: 'gemini-2.5-flash',
      clientId: '',
      driveOn: false,
      lastFileBackup: 0,
      lastDriveSync: 0,
      changesSinceBackup: 0,
      backupSnooze: 0,
      tab: 'ritsu',
      showAdult: false,
    },
    (() => {
      try {
        return JSON.parse(localStorage.getItem(SKEY)) || {};
      } catch (e) {
        return {};
      }
    })()
  );
  N.saveSettings = function (patch) {
    Object.assign(N.settings, patch || {});
    try {
      localStorage.setItem(SKEY, JSON.stringify(N.settings));
    } catch (e) {}
  };

  /* ---------- events ---------- */
  const handlers = {};
  N.on = (ev, fn) => (handlers[ev] = handlers[ev] || []).push(fn);
  N.emit = (ev, data) => (handlers[ev] || []).forEach((fn) => fn(data));

  /* ---------- persistence: IndexedDB, localStorage as fallback ---------- */
  const DB = 'ritsu-notes';
  const LKEY = 'ritsu-notes:data:v1';
  let dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        if (!window.indexedDB) return rej(new Error('no idb'));
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  async function idbGet(key) {
    const d = await db();
    return new Promise((res, rej) => {
      const r = d.transaction('kv').objectStore('kv').get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbSet(key, val) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('kv', 'readwrite');
      t.objectStore('kv').put(val, key);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  }

  N.state = blank();

  N.load = async function () {
    let data = null;
    try {
      data = await idbGet('state');
    } catch (e) {}
    if (!data) {
      try {
        data = JSON.parse(localStorage.getItem(LKEY));
      } catch (e) {}
    }
    N.state = normalize(data);
    // Ask the browser not to evict our data under storage pressure (Safari's 7-day rule etc.)
    try {
      if (navigator.storage && navigator.storage.persist) N.persisted = await navigator.storage.persist();
    } catch (e) {}
  };

  const persist = U.debounce(async () => {
    const snapshot = JSON.parse(JSON.stringify(N.state));
    try {
      await idbSet('state', snapshot);
      N.emit('saved');
    } catch (e) {
      try {
        localStorage.setItem(LKEY, JSON.stringify(snapshot));
        N.emit('saved');
      } catch (e2) {
        N.emit('save-failed', e2);
      }
    }
  }, 300);
  N.persistNow = persist;

  // Every edit goes through here.
  N.commit = function (fn, opts) {
    fn(N.state);
    N.state.updatedAt = Date.now();
    if (!(opts && opts.quiet)) N.saveSettings({ changesSinceBackup: (N.settings.changesSinceBackup || 0) + 1 });
    persist();
    N.emit('change', opts || {});
  };

  // Replace the whole state (after a merge from Drive / import) without counting it as an edit.
  N.replace = function (next) {
    N.state = normalize(next);
    persist();
    N.emit('change', { external: true });
  };

  /* ---------- fact helpers ---------- */
  N.facts = (charId) => Object.values(N.state.facts).filter((f) => !charId || f.char === charId);

  N.addFact = function (s, data) {
    const now = Date.now();
    const f = Object.assign(
      { id: U.uid(), char: 'ritsu', cat: 'etc', text: '', status: 'open', fresh: true, seen: 0, evidence: [], conflicts: [], src: 'manual', createdAt: now },
      data,
      { updatedAt: now }
    );
    s.facts[f.id] = f;
    return f;
  };
  N.patchFact = function (s, id, patch) {
    const f = s.facts[id];
    if (!f) return null;
    Object.assign(f, patch, { updatedAt: Date.now() });
    return f;
  };
  N.removeFact = function (s, id) {
    if (!s.facts[id]) return;
    delete s.facts[id];
    s.tomb[id] = Date.now();
    Object.values(s.facts).forEach((f) => {
      if (f.conflicts.some((c) => c.id === id)) N.patchFact(s, f.id, { conflicts: f.conflicts.filter((c) => c.id !== id) });
    });
  };
  N.linkConflict = function (s, aId, bId, reason) {
    const a = s.facts[aId];
    const b = s.facts[bId];
    if (!a || !b || aId === bId) return;
    if (!a.conflicts.some((c) => c.id === bId)) N.patchFact(s, aId, { conflicts: a.conflicts.concat({ id: bId, reason }) });
    if (!b.conflicts.some((c) => c.id === aId)) N.patchFact(s, bId, { conflicts: b.conflicts.concat({ id: aId, reason }) });
  };
  N.unlinkConflict = function (s, aId, bId) {
    const a = s.facts[aId];
    const b = s.facts[bId];
    if (a) N.patchFact(s, aId, { conflicts: a.conflicts.filter((c) => c.id !== bId) });
    if (b) N.patchFact(s, bId, { conflicts: b.conflicts.filter((c) => c.id !== aId) });
  };

  N.aliases = (charId) =>
    String((N.state.chars[charId] && N.state.chars[charId].aliases) || N.CHARS[charId].aliases)
      .split(/[,，、\n]/)
      .map((x) => x.trim())
      .filter(Boolean);

  /* ---------- file backup ---------- */
  N.exportFile = function () {
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const body = JSON.stringify(Object.assign({ app: 'ritsu-notes', exportedAt: Date.now() }, N.state), null, 1);
    const blob = new Blob([body], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ritsu-notes_${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    N.saveSettings({ lastFileBackup: Date.now(), changesSinceBackup: 0 });
    N.emit('backup');
  };

  N.readFile = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (!N.isValidData(data)) throw new Error('리츠 노트 백업 파일이 아니에요.');
          res(data);
        } catch (e) {
          rej(e instanceof SyntaxError ? new Error('파일을 읽을 수 없어요. JSON 백업 파일인지 확인해 주세요.') : e);
        }
      };
      r.onerror = () => rej(r.error);
      r.readAsText(file);
    });
})();
