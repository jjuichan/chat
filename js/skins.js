/* Templates ("skins"): each one brings its own header, footer, dividers and graphics.
 * Everything is plain HTML/CSS/inline SVG so the PNG export matches the preview.
 * Hooks (all optional): head, foot, panelTop, deco, over, divider, namePrefix, fonts
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const esc = U.esc;

  const C = {
    ruby: '#9B111E',
    black: '#29252B',
    coral: '#FF8F91',
    silver: '#C2C2CA',
    icy: '#F4C2C2',
    warm: '#FFF9F8',
  };

  /* ---------- small drawing helpers ---------- */
  function pixel(rows, px, pal, extra) {
    const h = rows.length;
    const w = rows[0].length;
    let r = '';
    rows.forEach((row, y) =>
      Array.from(row).forEach((c, x) => {
        if (pal[c]) r += `<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="${pal[c]}"/>`;
      })
    );
    return `<svg class="px" width="${w * px}" height="${h * px}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" ${extra || ''} aria-hidden="true">${r}</svg>`;
  }
  const PIX_HEART = ['.11.11.', '1221111', '1211111', '1111111', '.11111.', '..111..', '...1...'];
  const PIX_STAR = ['...1...', '..121..', '1111111', '.11111.', '..111..', '.11.11.', '11...11'];
  const heartPx = (px, col) => pixel(PIX_HEART, px, { 1: col, 2: '#FFFFFF' });
  const starPx = (px, col) => pixel(PIX_STAR, px, { 1: col, 2: '#FFFFFF' });

  const t = (ctx) => {
    const m = ctx.meta;
    return {
      title: m.showTitle && m.title ? App.formatInline(m.title) : '',
      sub: m.showSubtitle && m.subtitle ? esc(m.subtitle) : '',
      date: m.showDate && m.date ? esc(m.date) : '',
      foot: m.showFooter && m.footer ? esc(m.footer) : '',
    };
  };
  const pair = (ctx) => [ctx.speaker('ritsu') || ctx.state.speakers[0], ctx.speaker('enju') || ctx.state.speakers[1]].filter(Boolean);
  const avatarBox = (s, cls) => {
    if (!s) return `<span class="${cls}"></span>`;
    const col = s.color.name;
    if (s.avatar) return `<span class="${cls}" style="background-image:url(${s.avatar});background-color:${col}"></span>`;
    const ch = esc(Array.from(App.speakerLabel(s) || '?')[0]);
    return `<span class="${cls} is-init" style="background-color:${col};color:${U.onColor(col)}">${ch}</span>`;
  };
  // deterministic pseudo-random for barcode etc.
  const seeded = (seed) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const charCount = (ctx) => ctx.state.blocks.filter((b) => !b.hidden).reduce((n, b) => n + b.text.length, 0);

  /* ---------- graphics ---------- */
  function strawberry(size, rot) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="transform:rotate(${rot || 0}deg)" aria-hidden="true">
      <path d="M16 10.5c6.5 0 11 2.8 11 8.3 0 6.4-6.4 11.7-11 11.7S5 25.2 5 18.8c0-5.5 4.5-8.3 11-8.3z" fill="#E33445"/>
      <path d="M16 10.5c6.5 0 11 2.8 11 8.3 0 1.2-.2 2.3-.7 3.4-1.5-5.3-5.8-8.3-10.3-8.3S7.2 16.9 5.7 22.2C5.2 21.1 5 20 5 18.8c0-5.5 4.5-8.3 11-8.3z" fill="#F25565"/>
      <g fill="#FFE7A0"><ellipse cx="11" cy="17" rx=".9" ry="1.3"/><ellipse cx="16" cy="16" rx=".9" ry="1.3"/><ellipse cx="21" cy="17" rx=".9" ry="1.3"/><ellipse cx="13.5" cy="21.5" rx=".9" ry="1.3"/><ellipse cx="18.5" cy="21.5" rx=".9" ry="1.3"/><ellipse cx="16" cy="26" rx=".9" ry="1.3"/><ellipse cx="9.5" cy="22" rx=".8" ry="1.2"/><ellipse cx="22.5" cy="22" rx=".8" ry="1.2"/></g>
      <path d="M16 12c-2.5-3-6.5-3.2-8.5-1.5 2.6.3 4.3 1.6 5 3 .9-1.4 2-1.7 3.5-1.5zm0 0c2.5-3 6.5-3.2 8.5-1.5-2.6.3-4.3 1.6-5 3-.9-1.4-2-1.7-3.5-1.5zm0 0c-1-2.6-.6-5 1-7" fill="#4BAE5A" stroke="#3B8F49" stroke-width="1.1" stroke-linejoin="round"/>
    </svg>`;
  }
  function bow(size, col) {
    return `<svg width="${size}" height="${Math.round(size * 0.62)}" viewBox="0 0 40 25" aria-hidden="true">
      <path d="M20 10C14 2 4 1 3 6s5 9 17 4zM20 10c6-8 16-9 17-4s-5 9-17 4z" fill="${col}"/>
      <path d="M19 11c-3 4-6 9-9 13M21 11c3 4 6 9 9 13" stroke="${col}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <circle cx="20" cy="10.5" r="3.4" fill="${col}"/><circle cx="20" cy="10.5" r="3.4" fill="#000" fill-opacity=".15"/></svg>`;
  }
  function sunIcon(c) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="${c}"/><g stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g></svg>`;
  }
  function cloudIcon(c) {
    return `<svg width="17" height="16" viewBox="0 0 26 24" aria-hidden="true"><path d="M7 19h12.5a4.5 4.5 0 0 0 .4-9A6.5 6.5 0 0 0 7.6 9.3 5 5 0 0 0 7 19z" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
  }
  function rainIcon(c) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 18 0z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M12 12v7a2 2 0 0 1-4 0" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  function cassette(w, body, label, accent) {
    return `<svg width="${w}" height="${Math.round(w * 0.64)}" viewBox="0 0 64 41" aria-hidden="true">
      <rect x="1" y="1" width="62" height="39" rx="4" fill="${body}" stroke="${accent}" stroke-width="1.2"/>
      <rect x="6" y="5" width="52" height="20" rx="2" fill="${label}"/>
      <rect x="6" y="5" width="52" height="5" fill="${accent}"/>
      <rect x="17" y="13" width="30" height="9" rx="4.5" fill="${body}"/>
      <circle cx="22" cy="17.5" r="3.2" fill="none" stroke="${label}" stroke-width="1.6"/><circle cx="42" cy="17.5" r="3.2" fill="none" stroke="${label}" stroke-width="1.6"/>
      <path d="M14 40l4-9h28l4 9" fill="none" stroke="${accent}" stroke-width="1.2"/>
      <circle cx="24" cy="36" r="1.4" fill="${accent}"/><circle cx="40" cy="36" r="1.4" fill="${accent}"/></svg>`;
  }
  function eq(col1, col2) {
    const hs = [6, 12, 18, 9, 15, 20, 11, 7, 14, 18, 8, 12, 5];
    let r = '';
    hs.forEach((h, i) => (r += `<rect x="${i * 6}" y="${22 - h}" width="3.4" height="${h}" rx="1" fill="${i % 2 ? col2 : col1}"/>`));
    return `<svg width="${hs.length * 6}" height="22" viewBox="0 0 ${hs.length * 6} 22" aria-hidden="true">${r}</svg>`;
  }
  function playerControls(c, accent) {
    return `<svg width="150" height="26" viewBox="0 0 150 26" aria-hidden="true">
      <g fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h11l-2.5-2.5M17 16H6l2.5 2.5"/></g>
      <g transform="translate(36 0)" fill="${c}"><rect x="0" y="7" width="2.2" height="12"/><path d="M14 7v12L4 13z"/></g>
      <circle cx="75" cy="13" r="12" fill="${accent}"/><g fill="#1E1A20"><rect x="70.5" y="7.5" width="3.2" height="11" rx="1"/><rect x="76.3" y="7.5" width="3.2" height="11" rx="1"/></g>
      <g transform="translate(100 0)" fill="${c}"><path d="M0 7v12l10-6z"/><rect x="11.8" y="7" width="2.2" height="12"/></g>
      <path transform="translate(132 6) scale(.6)" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3 1.7-1.8 3.1-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="${accent}"/></svg>`;
  }
  function waxSeal(size, col) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" aria-hidden="true">
      <path d="M30 2c5 0 6 3 10 4s7-1 9 3 1 6 3 9 6 5 5 10-4 5-4 9 3 7 0 10-6 2-9 4-4 6-9 6-6-3-10-4-7 1-9-3-1-6-3-9-6-5-5-10 4-5 4-9-3-7 0-10 6-2 9-4 4-8 9-8z" fill="${col}"/>
      <circle cx="30" cy="30" r="18" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/>
      <path transform="translate(18.5 18.5) scale(.96)" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3 1.7-1.8 3.1-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#000" fill-opacity=".22"/>
      <path transform="translate(18 18) scale(.96)" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3 1.7-1.8 3.1-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#FFFFFF" fill-opacity=".28"/></svg>`;
  }
  function laceTile(fill, hole) {
    return App.kit.svgURL(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="14" viewBox="0 0 24 14"><path d="M0 14 A12 12 0 0 1 24 14 Z" fill="${fill}"/><circle cx="12" cy="8.5" r="2" fill="${hole}"/><circle cx="5" cy="11.5" r="1" fill="${hole}"/><circle cx="19" cy="11.5" r="1" fill="${hole}"/></svg>`
    );
  }
  function safetyPin(len, col, rot) {
    return `<svg width="${len}" height="${Math.round(len * 0.3)}" viewBox="0 0 80 24" style="transform:rotate(${rot}deg)" aria-hidden="true">
      <path d="M10 12h56a8 8 0 0 0 0-8H8" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M8 4a6 6 0 0 0 0 12h4" fill="none" stroke="${col}" stroke-width="2.6"/>
      <rect x="62" y="1" width="16" height="14" rx="4" fill="${col}"/><circle cx="8" cy="10" r="2.4" fill="none" stroke="${col}" stroke-width="1.6"/></svg>`;
  }
  function chainTile(col) {
    return App.kit.svgURL(
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="14" viewBox="0 0 28 14"><rect x="1.5" y="3" width="15" height="8" rx="4" fill="none" stroke="${col}" stroke-width="2.2"/><rect x="13" y="5.5" width="13.5" height="3" rx="1.5" fill="none" stroke="${col}" stroke-width="2.2"/></svg>`
    );
  }
  function barcode(w, h, col, seed) {
    const rnd = seeded(seed || 7);
    let x = 0;
    let r = '';
    while (x < w - 2) {
      const bw = rnd() < 0.55 ? 1 : rnd() < 0.6 ? 2 : 3;
      if (rnd() > 0.35) r += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="${col}"/>`;
      x += bw + 1;
    }
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }
  function stitchedHeart(size, col, stitch) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3 1.7-1.8 3.1-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="${col}"/><path d="M12 8l-1.5 3 2.5 2-2 3 1.5 3" fill="none" stroke="${stitch}" stroke-width="1.1" stroke-linecap="round"/><path d="M9.5 10.5l3 .8M10 14l3 .6M10.5 17.2l2.4.4" stroke="${stitch}" stroke-width=".9"/></svg>`;
  }

  const SKINS = {};

  /* ===================== Strawberry Diary ===================== */
  SKINS.diary = {
    name: 'Strawberry Diary',
    fonts: ['hachi-maru'],
    panelTop: () => `<div class="skd-holes"></div>`,
    head(ctx) {
      const x = t(ctx);
      const [a, b] = pair(ctx);
      const pol = (s, rot, cls) =>
        `<div class="skd-pol ${cls}" style="transform:rotate(${rot}deg)"><span class="skd-tape"></span>${avatarBox(s, 'skd-photo')}<span class="skd-cap">${s ? esc(App.speakerLabel(s)) : ''}</span></div>`;
      return `<header class="skd-head">
        <div class="skd-pols">${pol(a, -7, 'p1')}${pol(b, 6, 'p2')}</div>
        <div class="skd-label">${strawberry(20, -12)}<span>Strawberry Diary</span></div>
        <div class="skd-meta">
          <span class="k">DATE</span><span class="v">${x.date || '&nbsp;'}</span>
          <span class="k">WEATHER</span><span class="w"><i class="on">${sunIcon(C.ruby)}</i><i>${cloudIcon('#B9A3A8')}</i><i>${rainIcon('#B9A3A8')}</i></span>
        </div>
        ${x.title ? `<h1 class="xc-title">${x.title}</h1>` : ''}
        ${x.sub ? `<div class="skd-sub">${heartPx(2, C.coral)}<span>${x.sub}</span>${heartPx(2, C.ruby)}</div>` : ''}
      </header>`;
    },
    divider: () => `<span class="skd-div">${heartPx(2, C.coral)}${strawberry(22, 0)}${heartPx(2, C.ruby)}</span>`,
    foot(ctx) {
      const x = t(ctx);
      return `<footer class="skd-foot"><span class="skd-end">— end of today's page ♡</span>${x.foot ? `<span class="skd-sign">${x.foot}</span>` : ''}</footer>`;
    },
    over(ctx) {
      const m = ctx.st.panel.margin;
      return `<span class="skd-st s1" style="left:${Math.max(4, m - 26)}px;bottom:${Math.max(6, m - 22)}px">${strawberry(54, -14)}</span>
        <span class="skd-st s2" style="right:${Math.max(6, m - 18)}px;bottom:${Math.round(m + 60)}px">${heartPx(4, C.ruby)}</span>
        <span class="skd-st s3" style="right:${Math.max(4, m - 14)}px;top:${Math.round(m + 190)}px">${bow(38, C.coral)}</span>`;
    },
  };

  /* ===================== Midnight Playlist ===================== */
  SKINS.playlist = {
    name: 'Midnight Playlist',
    fonts: ['space-mono'],
    head(ctx) {
      const x = t(ctx);
      const [a, b] = pair(ctx);
      const total = Math.max(95, Math.round(charCount(ctx) / 6));
      const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      const art =
        (a && a.avatar) || (b && b.avatar)
          ? `<span class="skp-art has-av">${avatarBox(a, 'skp-half l')}${avatarBox(b, 'skp-half r')}</span>`
          : `<span class="skp-art"><b>R</b><i>×</i><b>E</b></span>`;
      return `<header class="skp-head">
        <div class="skp-top"><span>● REC</span><span>PLAYLIST — ${x.sub || 'ずうっといっしょ！'}</span><span>${x.date}</span></div>
        <div class="skp-player">
          <div class="skp-disc"><span class="skp-vinyl"></span>${art}</div>
          <div class="skp-info">
            <div class="skp-now">▶ NOW PLAYING</div>
            ${x.title ? `<h1 class="xc-title">${x.title}</h1>` : ''}
            <div class="skp-artist">${pair(ctx).map((s) => esc(App.speakerLabel(s))).join(' &amp; ')}</div>
            <div class="skp-bar"><span>${mmss(Math.round(total * 0.38))}</span><span class="trk"><i></i><b></b></span><span>${mmss(total)}</span></div>
            <div class="skp-ctrl">${playerControls('#C2C2CA', C.coral)}</div>
          </div>
        </div>
        <div class="skp-lyr"><span>LYRICS</span><span>歌詞</span></div>
      </header>`;
    },
    divider: () => `<span class="skp-div">${eq(C.coral, '#6E6774')}</span>`,
    foot(ctx) {
      const x = t(ctx);
      return `<footer class="skp-foot">${cassette(58, '#1A171C', '#C2C2CA', C.coral)}<div><b>SIDE A · TRACK 01</b><span>${x.foot || 'Ritsu × Enju'}</span></div><span class="skp-vol">VOL ▮▮▮▮▮▯▯</span></footer>`;
    },
  };

  /* ===================== Love Letter ===================== */
  SKINS.letter = {
    name: 'Love Letter',
    fonts: ['pinyon', 'nanum-pen'],
    panelTop: (ctx) => {
      const fill = U.rgba(ctx.st.panel.color, ctx.st.panel.opacity);
      return `<div class="skl-lace top" style="background-image:${laceTile(fill, ctx.st.bg.color)}"></div><div class="skl-lace bot" style="background-image:${laceTile(fill, ctx.st.bg.color)}"></div>`;
    },
    head(ctx) {
      const x = t(ctx);
      const [, b] = pair(ctx);
      return `<header class="skl-head">
        <div class="skl-seal">${waxSeal(64, C.ruby)}</div>
        <div class="skl-dear">Dear my dearest${b ? ',' : ''}</div>
        ${x.title ? `<h1 class="xc-title">${x.title}</h1>` : ''}
        <div class="skl-line"><span>${x.sub}</span><span>${x.date}</span></div>
      </header>`;
    },
    divider: () => `<span class="skl-div">${bow(34, C.ruby)}</span>`,
    foot(ctx) {
      const x = t(ctx);
      let pearls = '';
      for (let i = 0; i < 11; i++) pearls += `<i class="${i === 5 ? 'big' : ''}"></i>`;
      return `<footer class="skl-foot"><div class="skl-with">with love,</div>${x.foot ? `<div class="skl-sign">${x.foot}</div>` : ''}<div class="skl-pearls">${pearls}</div></footer>`;
    },
    deco(ctx) {
      // a single red string of fate running down the left margin
      const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="120" viewBox="0 0 16 120"><path d="M8 0 C 15 30, 1 60, 8 60 S 15 90, 8 120" fill="none" stroke="${C.ruby}" stroke-width="1.5"/></svg>`;
      const m = ctx.st.panel.margin;
      return `<div class="xd-thread" style="left:${Math.max(4, Math.round(m / 2 - 8))}px;top:${Math.round(m + 40)}px;bottom:${Math.round(m * 0.5)}px;background-image:${App.kit.svgURL(tile)};background-size:16px 120px"></div>`;
    },
  };

  /* ===================== Retro Personal Web ===================== */
  SKINS.retroweb = {
    name: 'Retro Personal Web',
    fonts: ['dotgothic', 'vt323'],
    namePrefix: (s) => `<span class="skr-ni">${heartPx(2, s.color.name)}</span>`,
    head(ctx) {
      const x = t(ctx);
      const [a, b] = pair(ctx);
      const n = String(10000 + (charCount(ctx) % 90000)).padStart(6, '0');
      const counter = Array.from(n).map((d) => `<i>${d}</i>`).join('');
      const prof = (s) => (s ? `<div class="skr-pf">${avatarBox(s, 'skr-av')}<span>${esc(App.speakerLabel(s))}</span></div>` : '');
      return `<header class="skr-head">
        <div class="skr-bar">${heartPx(2, '#FFFFFF')}<span>ritsu×enju no heya</span><span class="btns"><i>_</i><i>□</i><i>×</i></span></div>
        <div class="skr-marq">${starPx(2, C.coral)}<span>Welcome to our homepage ★ ${x.sub || 'ずうっといっしょ！'}</span>${starPx(2, C.coral)}</div>
        <div class="skr-top">
          <div class="skr-profs">${prof(a)}<span class="skr-and">${heartPx(3, C.coral)}</span>${prof(b)}</div>
          <div class="skr-ttl">
            ${x.title ? `<h1 class="xc-title">${x.title}</h1>` : ''}
            <div class="skr-upd">last update : ${x.date || '----.--.--'}</div>
            <div class="skr-count">あなたは <span>${counter}</span> 人目のお客様♡</div>
          </div>
        </div>
        <div class="skr-banners"><span class="b1">R×E</span><span class="b2">LOVE ♡</span><span class="b3">since 2026</span><span class="b4">link free</span></div>
        <div class="skr-sec"><i></i>diary log<i></i></div>
      </header>`;
    },
    divider: () => `<span class="skr-div">${heartPx(2, C.coral)}${heartPx(2, '#C2C2CA')}${heartPx(2, C.coral)}${heartPx(2, '#C2C2CA')}${heartPx(2, C.coral)}</span>`,
    foot(ctx) {
      const x = t(ctx);
      return `<footer class="skr-foot"><div class="skr-nav"><span>[ TOP ]</span><span>[ BACK ]</span><span>[ BBS ]</span></div><div class="skr-copy">${starPx(2, C.coral)} (c) 2026 ${x.foot || 'ritsu x enju'} - all rights reserved ${starPx(2, C.coral)}</div></footer>`;
    },
  };

  /* ===================== Sweet Poison ===================== */
  SKINS.poison = {
    name: 'Sweet Poison',
    fonts: ['rocknroll', 'space-mono'],
    panelTop: () => `<div class="skx-chain" style="background-image:${chainTile('#C2C2CA')}"></div>`,
    head(ctx) {
      const x = t(ctx);
      const no = (ctx.meta.date || '').replace(/[^\d]/g, '').slice(-4) || '0000';
      return `<header class="skx-head">
        <div class="skx-sub">${x.sub}</div>
        ${x.title ? `<h1 class="xc-title">${x.title}</h1>` : ''}
        <div class="skx-meta"><span>NO.${no}</span><span>//</span><span>${x.date}</span><span class="skx-x">${stitchedHeart(16, C.ruby, '#FFFFFF')}</span></div>
      </header>`;
    },
    divider: () => `<span class="skx-div"><i></i>${stitchedHeart(18, C.ruby, '#FFFFFF')}<b>✕</b>${stitchedHeart(18, C.ruby, '#FFFFFF')}<i></i></span>`,
    foot(ctx) {
      const x = t(ctx);
      return `<footer class="skx-foot">${barcode(120, 30, '#C2C2CA', charCount(ctx) + 3)}<div><b>${x.foot || 'Ritsu × Enju'}</b><span>XOXO — handle with care</span></div></footer>`;
    },
    over(ctx) {
      const m = ctx.st.panel.margin;
      return `<span class="skx-pin p1" style="left:${Math.round(m - 18)}px;top:${Math.round(m - 10)}px">${safetyPin(78, '#C9C9D1', -32)}</span>
        <span class="skx-pin p2" style="right:${Math.round(m - 22)}px;top:${Math.round(m + 26)}px">${safetyPin(64, '#C9C9D1', 58)}</span>
        <span class="skx-tag" style="right:${Math.round(m + 26)}px;top:${Math.round(m - 14)}px">SWEET POISON</span>
        <span class="skx-st" style="left:${Math.round(m - 16)}px;bottom:${Math.round(m + 40)}px">${stitchedHeart(40, C.ruby, '#FFFFFF')}</span>
        <span class="skx-sp" style="right:${Math.round(m - 14)}px;bottom:${Math.round(m - 12)}px">${App.kit.icon(App.kit.SPARK, 22, '#C2C2CA', 0, 0.9)}</span>`;
    },
  };

  App.skins = SKINS;
})();
