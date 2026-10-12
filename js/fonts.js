/* Fonts: registry, preview loading, and subset embedding for export */
(function () {
  'use strict';
  const App = window.App;

  // Every font is served by Google Fonts. Japanese faces fall back to a Korean face for Hangul
  // (and Korean faces to Noto Sans KR for kana), so mixed KR/JP text always renders.
  const FONTS = {
    'gowun-batang': { label: '고운바탕 · 바탕', family: 'Gowun Batang', weights: [400, 700], kind: 'serif', group: '한글 명조' },
    'noto-serif': { label: 'Noto Serif KR · 명조', family: 'Noto Serif KR', weights: [400, 600, 700], kind: 'serif', group: '한글 명조' },
    'nanum-myeongjo': { label: '나눔명조', family: 'Nanum Myeongjo', weights: [400, 700, 800], kind: 'serif', group: '한글 명조' },
    hahmlet: { label: '함렛', family: 'Hahmlet', weights: [400, 600, 700], kind: 'serif', group: '한글 명조' },
    'song-myung': { label: '송명', family: 'Song Myung', weights: [400], kind: 'serif', group: '한글 명조' },
    'noto-sans': { label: 'Noto Sans KR · 고딕', family: 'Noto Sans KR', weights: [400, 500, 700], kind: 'sans', group: '한글 고딕' },
    'ibm-plex': { label: 'IBM Plex Sans KR', family: 'IBM Plex Sans KR', weights: [400, 500, 600], kind: 'sans', group: '한글 고딕' },
    'gowun-dodum': { label: '고운돋움', family: 'Gowun Dodum', weights: [400], kind: 'sans', group: '한글 고딕' },
    'nanum-gothic': { label: '나눔고딕', family: 'Nanum Gothic', weights: [400, 700], kind: 'sans', group: '한글 고딕' },
    sunflower: { label: '해바라기', family: 'Sunflower', weights: [300, 500, 700], kind: 'sans', group: '한글 고딕' },
    orbit: { label: '오르빗', family: 'Orbit', weights: [400], kind: 'sans', group: '한글 고딕' },
    'nanum-pen': { label: '나눔손글씨 펜', family: 'Nanum Pen Script', weights: [400], kind: 'hand', group: '손글씨 · 장식' },
    gaegu: { label: '개구', family: 'Gaegu', weights: [400, 700], kind: 'hand', group: '손글씨 · 장식' },
    'hi-melody': { label: '하이멜로디', family: 'Hi Melody', weights: [400], kind: 'hand', group: '손글씨 · 장식' },
    'poor-story': { label: '푸어스토리', family: 'Poor Story', weights: [400], kind: 'hand', group: '손글씨 · 장식' },
    diphylleia: { label: '산하엽', family: 'Diphylleia', weights: [400], kind: 'serif', group: '손글씨 · 장식' },
    'do-hyeon': { label: '도현', family: 'Do Hyeon', weights: [400], kind: 'sans', group: '손글씨 · 장식' },
    jua: { label: '주아 · 동글', family: 'Jua', weights: [400], kind: 'sans', group: '손글씨 · 장식' },
    gamja: { label: '감자꽃 · 손글씨', family: 'Gamja Flower', weights: [400], kind: 'hand', group: '손글씨 · 장식' },
    'single-day': { label: '싱글데이 · 귀여운', family: 'Single Day', weights: [400], kind: 'hand', group: '손글씨 · 장식' },
    'cute-font': { label: '큐트폰트', family: 'Cute Font', weights: [400], kind: 'hand', group: '손글씨 · 장식' },
    'yeon-sung': { label: '연성', family: 'Yeon Sung', weights: [400], kind: 'hand', group: '손글씨 · 장식' },
    'black-han-sans': { label: '검은고딕 · 굵은', family: 'Black Han Sans', weights: [400], kind: 'sans', group: '손글씨 · 장식' },
    dotgothic: { label: 'DotGothic16 · 픽셀', family: 'DotGothic16', weights: [400], kind: 'sans', group: '픽셀 · 타자기 · 모노', jp: true },
    vt323: { label: 'VT323 · 픽셀', family: 'VT323', weights: [400], kind: 'mono', group: '픽셀 · 타자기 · 모노', latin: true },
    silkscreen: { label: 'Silkscreen · 픽셀', family: 'Silkscreen', weights: [400], kind: 'mono', group: '픽셀 · 타자기 · 모노', latin: true },
    'space-mono': { label: 'Space Mono · 모노', family: 'Space Mono', weights: [400, 700], kind: 'mono', group: '픽셀 · 타자기 · 모노', latin: true },
    'ibm-mono': { label: 'IBM Plex Mono', family: 'IBM Plex Mono', weights: [400, 500], kind: 'mono', group: '픽셀 · 타자기 · 모노', latin: true },
    'courier-prime': { label: 'Courier Prime · 타자기', family: 'Courier Prime', weights: [400, 700], kind: 'mono', group: '픽셀 · 타자기 · 모노', latin: true },
    'special-elite': { label: 'Special Elite · 타자기', family: 'Special Elite', weights: [400], kind: 'mono', group: '픽셀 · 타자기 · 모노', latin: true },
    'zen-maru': { label: 'Zen Maru Gothic · 丸ゴ', family: 'Zen Maru Gothic', weights: [400, 500, 700], kind: 'sans', group: '일본어 · 영문', jp: true },
    'zen-kaku': { label: 'Zen Kaku Gothic · 角ゴ', family: 'Zen Kaku Gothic New', weights: [400, 500, 700], kind: 'sans', group: '일본어 · 영문', jp: true },
    shippori: { label: 'Shippori Mincho · 明朝', family: 'Shippori Mincho', weights: [400, 600, 700], kind: 'serif', group: '일본어 · 영문', jp: true },
    klee: { label: 'Klee One · 手書き風', family: 'Klee One', weights: [400, 600], kind: 'hand', group: '일본어 · 영문', jp: true },
    'kiwi-maru': { label: 'Kiwi Maru', family: 'Kiwi Maru', weights: [400, 500], kind: 'serif', group: '일본어 · 영문', jp: true },
    yomogi: { label: 'Yomogi · 手書き', family: 'Yomogi', weights: [400], kind: 'hand', group: '일본어 · 영문', jp: true },
    'hachi-maru': { label: 'Hachi Maru Pop · まるもじ', family: 'Hachi Maru Pop', weights: [400], kind: 'hand', group: '일본어 · 영문', jp: true },
    rocknroll: { label: 'RocknRoll One · ロック', family: 'RocknRoll One', weights: [400], kind: 'sans', group: '일본어 · 영문', jp: true },
    'mochiy': { label: 'Mochiy Pop One · ポップ', family: 'Mochiy Pop One', weights: [400], kind: 'sans', group: '일본어 · 영문', jp: true },
    'dela-gothic': { label: 'Dela Gothic One · 極太', family: 'Dela Gothic One', weights: [400], kind: 'sans', group: '일본어 · 영문', jp: true },
    'dm-serif': { label: 'DM Serif Display', family: 'DM Serif Display', weights: [400], kind: 'serif', group: '일본어 · 영문', latin: true },
    pinyon: { label: 'Pinyon Script · 필기체', family: 'Pinyon Script', weights: [400], kind: 'serif', group: '일본어 · 영문', latin: true },
    cormorant: { label: 'Cormorant Garamond', family: 'Cormorant Garamond', weights: [500, 600], kind: 'serif', group: '일본어 · 영문', latin: true },
    playfair: { label: 'Playfair Display', family: 'Playfair Display', weights: [500, 700], kind: 'serif', group: '일본어 · 영문', latin: true },
  };
  const F = (App.fonts = { FONTS });

  // CSS font stack for a key (includes CJK fallbacks)
  F.stack = function (key) {
    const f = FONTS[key] || FONTS['noto-sans'];
    const fam = [`'${f.family}'`];
    if (f.jp || f.latin) fam.push(f.kind === 'serif' ? "'Noto Serif KR'" : "'Noto Sans KR'");
    else if (f.family !== 'Noto Sans KR') fam.push("'Noto Sans KR'");
    fam.push(f.kind === 'serif' ? 'serif' : f.kind === 'mono' ? 'monospace' : 'sans-serif');
    return fam.join(', ');
  };
  // family names (incl. fallbacks) that need loading/embedding for a key
  F.families = function (key) {
    const f = FONTS[key] || FONTS['noto-sans'];
    const out = [f.family];
    if ((f.jp || f.latin) && f.kind === 'serif') out.push('Noto Serif KR');
    else if (f.family !== 'Noto Sans KR') out.push('Noto Sans KR');
    return out;
  };
  const byFamily = {};
  Object.values(FONTS).forEach((f) => (byFamily[f.family] = f));
  F.spec = (family) => {
    const f = byFamily[family];
    const fam = family.replace(/ /g, '+');
    return f && f.weights.length > 1 ? `${fam}:wght@${f.weights.join(';')}` : fam;
  };

  /* ---------- preview loading ---------- */
  const loaded = new Set();
  F.ensure = function (families) {
    const need = families.filter((f) => !loaded.has(f));
    if (!need.length) return Promise.resolve();
    need.forEach((f) => loaded.add(f));
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?' + need.map((f) => 'family=' + F.spec(f)).join('&') + '&display=swap';
    document.head.appendChild(link);
    return new Promise((res) => {
      link.onload = () => res();
      link.onerror = () => res();
    }).then(() => document.fonts && document.fonts.ready);
  };

  F.usedFamilies = function (style) {
    const keys = [style.font.body, style.font.narr || style.font.body, style.font.name, style.font.title];
    const set = new Set();
    keys.forEach((k) => F.families(k).forEach((f) => set.add(f)));
    // fixed decorative faces a template uses for its own labels
    const skin = App.skins && App.skins[style.skin];
    if (skin && skin.fonts) skin.fonts.forEach((k) => F.families(k).forEach((f) => set.add(f)));
    return Array.from(set);
  };

  /* ---------- export embedding ----------
   * We ask Google Fonts for a subset that contains exactly the characters on the card
   * (`&text=`), inline the font files as data URLs and pin each subset with a unicode-range.
   * The result is tiny, and glyph-for-glyph identical to the preview.
   */
  const EXTRA = '“”‘’「」『』【】［］[]()（）…·・—–~!?！？.,、。♥♡★☆✦✧×';
  const cache = new Map();

  function toDataURL(url) {
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('font ' + r.status);
        return r.blob();
      })
      .then(
        (blob) =>
          new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = rej;
            fr.readAsDataURL(blob);
          })
      );
  }
  function unicodeRange(chars) {
    return chars.map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(', ');
  }
  async function subsetCSS(family, chars) {
    const k = family + '|' + chars.join('');
    if (cache.has(k)) return cache.get(k);
    const url = `https://fonts.googleapis.com/css2?family=${F.spec(family)}&text=${encodeURIComponent(chars.join(''))}`;
    const p = (async () => {
      const css = await fetch(url).then((r) => {
        if (!r.ok) throw new Error('css ' + r.status);
        return r.text();
      });
      const urls = Array.from(new Set((css.match(/url\(([^)]+)\)/g) || []).map((u) => u.slice(4, -1).replace(/['"]/g, ''))));
      let out = css;
      for (const u of urls) {
        try {
          const data = await toDataURL(u);
          out = out.split(u).join(data);
        } catch (e) {
          // remove the @font-face that points at the unavailable file
          out = out.replace(new RegExp('@font-face\\s*{[^}]*' + u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^}]*}', 'g'), '');
        }
      }
      const range = unicodeRange(chars);
      return out.replace(/}/g, `  unicode-range: ${range};\n}`);
    })();
    cache.set(k, p);
    p.catch(() => cache.delete(k));
    return p;
  }

  F.embedCSS = async function (cardEl, families) {
    const text = (cardEl.textContent || '') + EXTRA;
    const chars = Array.from(new Set(Array.from(text.replace(/\s+/g, '')))).sort();
    const chunks = [];
    for (let i = 0; i < chars.length; i += 240) chunks.push(chars.slice(i, i + 240));
    const jobs = [];
    families.forEach((fam) => chunks.forEach((ch) => jobs.push(subsetCSS(fam, ch))));
    // A font that has none of the requested characters (e.g. a Latin script face asked for
    // Hangul) answers with an error; skip those subsets instead of failing the whole export.
    const parts = await Promise.allSettled(jobs);
    const ok = parts.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    if (!ok.length && parts.length) throw new Error('no fonts could be embedded');
    return ok.join('\n');
  };
})();
