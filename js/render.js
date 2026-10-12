/* Render the excerpt card (the exact DOM that is exported as PNG) */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const esc = U.esc;

  const QUOTES = { '“”': ['“', '”'], '「」': ['「', '」'], '『』': ['『', '』'], '"': ['"', '"'], '‘’': ['‘', '’'], none: ['', ''] };

  /* ---------- inline markup ---------- */
  App.formatInline = function (text) {
    let h = esc(text);
    h = h.replace(/==([\s\S]+?)==/g, '<mark class="hl">$1</mark>');
    h = h.replace(/\*\*([\s\S]+?)\*\*/g, '<strong class="bd">$1</strong>');
    h = h.replace(/__([\s\S]+?)__/g, '<span class="ul">$1</span>');
    h = h.replace(/~~([\s\S]+?)~~/g, '<span class="sm">$1</span>');
    return h.replace(/\n/g, '<br>');
  };

  App.speakerLabel = function (s) {
    if (!s) return '';
    switch (s.display) {
      case 'ko':
        return s.nameKo || s.short;
      case 'ja':
        return s.nameJa || s.short;
      case 'both':
        return [s.nameKo || s.short, s.nameJa].filter(Boolean).join(' · ');
      case 'custom':
        return s.custom || s.short;
      default:
        return s.short || s.nameKo || s.nameJa;
    }
  };

  /* ---------- svg helpers ---------- */
  function twistPath(w, h, period, phase) {
    const mid = h / 2;
    const amp = h / 2 - 1.5;
    let d = '';
    for (let x = 0; x <= w; x += 2) {
      const y = mid + Math.sin((x / period) * Math.PI * 2 + phase) * amp;
      d += (x === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(2) + ' ';
    }
    return d;
  }
  function twistSVG(w, h, c1, c2, sw) {
    return `<svg class="tw" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="${twistPath(w, h, 46, 0)}" fill="none" stroke="${c1}" stroke-width="${sw}" stroke-linecap="round"/>
      <path d="${twistPath(w, h, 46, Math.PI)}" fill="none" stroke="${c2}" stroke-width="${sw}" stroke-linecap="round"/>
      <circle cx="2" cy="${h / 2}" r="2.2" fill="${c1}"/><circle cx="${w - 2}" cy="${h / 2}" r="2.2" fill="${c2}"/></svg>`;
  }
  const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3 1.7-1.8 3.1-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z';
  const SPARK = 'M12 1.5c.6 5.2 4.8 9.4 10.5 10.5-5.7 1.1-9.9 5.3-10.5 10.5C11.4 17.3 7.2 13.1 1.5 12 7.2 10.9 11.4 6.7 12 1.5z';
  const PETAL = 'M12 2c3.5 3 5 6.6 4.2 10.4-.6 3-2.5 5.6-4.2 9.6-1.7-4-3.6-6.6-4.2-9.6C7 8.6 8.5 5 12 2z';
  function icon(path, size, color, rot, op) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform:rotate(${rot || 0}deg);opacity:${op == null ? 1 : op}" aria-hidden="true"><path d="${path}" fill="${color}"/></svg>`;
  }
  function svgURL(svg) {
    return `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, "%27")}')`;
  }

  /* ---------- background ---------- */
  function patternLayer(bg) {
    const c = U.rgba(bg.patternColor, bg.patternOpacity);
    const k = bg.patternScale || 1;
    const px = (n) => Math.round(n * k) + 'px';
    switch (bg.pattern) {
      case 'dots':
        return { image: `radial-gradient(${c} ${1.3 * k}px, transparent ${1.7 * k}px)`, size: `${px(18)} ${px(18)}` };
      case 'grid':
        return { image: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, size: `${px(24)} ${px(24)}` };
      case 'lines':
        return { image: `linear-gradient(transparent ${Math.round(31 * k)}px, ${c} ${Math.round(31 * k)}px)`, size: `100% ${px(32)}` };
      case 'stripe':
        return { image: `repeating-linear-gradient(135deg, ${c} 0 ${px(2)}, transparent ${px(2)} ${px(14)})`, size: 'auto' };
      case 'gingham': {
        const c2 = U.rgba(bg.patternColor, bg.patternOpacity * 0.6);
        return {
          image: `linear-gradient(90deg, ${c2} 50%, transparent 50%), linear-gradient(${c2} 50%, transparent 50%)`,
          size: `${px(28)} ${px(28)}`,
        };
      }
      case 'hearts': {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="${bg.patternColor}" fill-opacity="${bg.patternOpacity}"><path transform="translate(6 6) scale(.55)" d="${HEART}"/><path transform="translate(38 36) scale(.4) rotate(-12 12 12)" d="${HEART}"/></g></svg>`;
        return { image: svgURL(svg), size: `${px(64)} ${px(64)}` };
      }
      case 'stars': {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><g fill="${bg.patternColor}" fill-opacity="${bg.patternOpacity}"><path transform="translate(8 8) scale(.5)" d="${SPARK}"/><path transform="translate(44 40) scale(.33)" d="${SPARK}"/></g></svg>`;
        return { image: svgURL(svg), size: `${px(72)} ${px(72)}` };
      }
      default:
        return null;
    }
  }
  const NOISE = svgURL(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`
  );

  /* ---------- decorations ---------- */
  function decoLayer(st) {
    const d = st.deco;
    const m = st.panel.margin;
    let h = '';
    if (d.side === 'thread') {
      const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="96" viewBox="0 0 16 96"><path d="M8 0 C 14 16, 14 32, 8 48 S 2 80, 8 96" fill="none" stroke="${d.color1}" stroke-width="1.4"/><path d="M8 0 C 2 16, 2 32, 8 48 S 14 80, 8 96" fill="none" stroke="${d.color2}" stroke-width="1.4"/></svg>`;
      const left = Math.max(4, Math.round(m / 2 - 8));
      h += `<div class="xd-thread" style="left:${left}px;top:${Math.round(m * 0.6)}px;bottom:${Math.round(m * 0.6) + 22}px;background-image:${svgURL(tile)}"></div>`;
      h += `<div class="xd-knot" style="left:${left - 8}px;bottom:${Math.round(m * 0.6)}px">${knotSVG(d.color1, d.color2)}</div>`;
    }
    if (d.scatter !== 'none') {
      const path = d.scatter === 'heart' ? HEART : d.scatter === 'petal' ? PETAL : SPARK;
      const spots = [
        [3, 4, 16, 1, -10],
        [93, 3, 12, 2, 18],
        [96, 22, 9, 1, 30],
        [2, 38, 10, 2, -24],
        [95, 56, 14, 1, 8],
        [3, 74, 13, 1, 20],
        [92, 88, 11, 2, -16],
        [6, 95, 9, 2, 40],
        [50, 1.2, 9, 1, 12],
        [48, 98.6, 10, 2, -8],
      ];
      spots.forEach(([x, y, s, c, r], i) => {
        const col = c === 1 ? d.color1 : d.color2;
        h += `<span class="xd-sc" style="left:${x}%;top:${y}%;margin:-${s / 2}px 0 0 -${s / 2}px">${icon(path, s, col, r, i % 3 === 0 ? 0.55 : 0.85)}</span>`;
      });
    }
    if (d.corners === 'bracket') {
      const off = Math.max(10, Math.round(m / 2 - 2));
      const L = 26;
      const mk = (pos, path) =>
        `<svg class="xd-corner" style="${pos}" width="${L}" height="${L}" viewBox="0 0 ${L} ${L}" aria-hidden="true"><path d="${path}" fill="none" stroke="${d.color2}" stroke-width="1.5"/></svg>`;
      h += mk(`left:${off}px;top:${off}px`, `M1 ${L}V1H${L}`);
      h += mk(`right:${off}px;top:${off}px`, `M0 1H${L - 1}V${L}`);
      h += mk(`left:${off}px;bottom:${off}px`, `M1 0V${L - 1}H${L}`);
      h += mk(`right:${off}px;bottom:${off}px`, `M0 ${L - 1}H${L - 1}V0`);
    }
    if (d.corners === 'flourish') {
      const off = Math.max(6, Math.round(m / 2 - 14));
      const fl = (pos, rot) =>
        `<svg class="xd-corner" style="${pos};transform:rotate(${rot}deg)" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
          <path d="M4 40 C 4 20, 12 6, 40 4" fill="none" stroke="${d.color1}" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M10 40 C 12 26, 18 14, 34 10" fill="none" stroke="${d.color2}" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="1 4"/>
          <path transform="translate(1 1) scale(.38)" d="${HEART}" fill="${d.color2}"/></svg>`;
      h += fl(`left:${off}px;top:${off}px`, 0);
      h += fl(`right:${off}px;top:${off}px`, 90);
      h += fl(`right:${off}px;bottom:${off}px`, 180);
      h += fl(`left:${off}px;bottom:${off}px`, 270);
    }
    return h;
  }
  function knotSVG(c1, c2) {
    return `<svg width="32" height="24" viewBox="0 0 32 24" aria-hidden="true">
      <path d="M16 6 C 8 -2, 1 4, 6 10 C 9 13, 14 9, 16 6Z" fill="none" stroke="${c1}" stroke-width="1.6"/>
      <path d="M16 6 C 24 -2, 31 4, 26 10 C 23 13, 18 9, 16 6Z" fill="none" stroke="${c2}" stroke-width="1.6"/>
      <path d="M16 6 C 14 12, 10 16, 7 23" fill="none" stroke="${c1}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M16 6 C 18 12, 22 16, 25 23" fill="none" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="16" cy="6" r="2.4" fill="${c2}"/></svg>`;
  }

  function ornament(kind, st, w) {
    const d = st.deco;
    switch (kind) {
      case 'twist':
        return twistSVG(w || 150, 12, d.color1, d.color2, 1.5);
      case 'dots':
        return `<span class="orn-dots"><i style="background:${d.color1}"></i><i style="background:${d.color2}"></i><i style="background:${d.color1}"></i></span>`;
      case 'line':
        return `<span class="orn-line" style="background:linear-gradient(90deg, transparent, ${d.color1}, ${d.color2}, transparent)"></span>`;
      case 'hearts':
        return `<span class="orn-hearts">${icon(HEART, 11, d.color1, -12)}${icon(HEART, 14, d.color2, 0)}${icon(HEART, 11, d.color1, 12)}</span>`;
      case 'star':
        return `<span class="orn-star">${icon(SPARK, 10, d.color1)}${icon(SPARK, 13, d.color2)}${icon(SPARK, 10, d.color1)}</span>`;
      default:
        return '';
    }
  }

  /* ---------- blocks ---------- */
  function speakerVars(s, st) {
    const c = (s && s.color) || {};
    const name = c.name || st.color.accent;
    const bubble = c.bubble || '#EEE';
    return `--sp-name:${name};--sp-on:${U.onColor(name)};--sp-text:${c.text || 'var(--text)'};--sp-bubble:${bubble};--sp-btext:${c.bubbleText || U.onColor(bubble)};--sp-soft:${U.rgba(name, 0.12)}`;
  }
  function nameHTML(s, st) {
    if (!s) return '';
    const label = esc(App.speakerLabel(s));
    if (st.names.style === 'bracket') return `<span class="xb-name">[${label}]</span>`;
    if (st.names.style === 'dot') return `<span class="xb-name"><i class="nd"></i>${label}</span>`;
    return `<span class="xb-name">${label}</span>`;
  }
  function avatarHTML(s) {
    if (!s) return '<span class="xb-av"></span>';
    if (s.avatar) return `<span class="xb-av" style="background-image:url(${s.avatar})"></span>`;
    const ch = Array.from(App.speakerLabel(s) || '?')[0];
    return `<span class="xb-av xb-av-init">${esc(ch)}</span>`;
  }

  function blockHTML(b, i, ctx) {
    const st = ctx.st;
    const gapStyle = b.gap ? `margin-bottom:${Math.round(st.font.gap * (1 + b.gap * 0.75))}px;` : '';
    const cls = ['xb'];
    // a little extra air where narration and dialogue take turns
    if (ctx.prev && ctx.prev.type !== b.type && b.type !== 'divider' && ctx.prev.type !== 'divider') cls.push('turn');
    if (b.emph) cls.push('is-emph');
    if (b.type === 'divider') {
      return `<div class="xb xb-div" data-id="${b.id}" style="${gapStyle}">${ornament(st.divider === 'twist' ? 'twist' : st.divider, st, 110)}</div>`;
    }
    const body = App.formatInline(b.text);
    if (b.type === 'narration') {
      cls.push('xb-narr');
      return `<p class="${cls.join(' ')}" data-id="${b.id}" style="${gapStyle}">${body}</p>`;
    }
    // dialogue
    const s = App.speaker(b.speaker);
    const [qo, qc] = QUOTES[st.quotes] || QUOTES['“”'];
    const text = `${esc(qo)}${body}${esc(qc)}`;
    const sv = speakerVars(s, st);
    cls.push('xb-dlg');
    if (!s) cls.push('no-sp');
    if (st.layout === 'bubble') {
      const side = s && s.side === 'right' ? 'right' : 'left';
      const cont = ctx.prev && ctx.prev.type === 'dialogue' && ctx.prev.speaker === b.speaker && !ctx.prev.gap;
      cls.push('side-' + side);
      if (cont) cls.push('cont');
      const av = st.bubble.avatar ? (cont ? '<span class="xb-av xb-av-ghost"></span>' : avatarHTML(s)) : '';
      return `<div class="${cls.join(' ')}" data-id="${b.id}" style="${sv};${gapStyle}">${av}<div class="xb-col">${
        cont || !s ? '' : nameHTML(s, st)
      }<div class="xb-bubble">${text}</div></div></div>`;
    }
    if (st.layout === 'script') {
      return `<div class="${cls.join(' ')}" data-id="${b.id}" style="${sv};${gapStyle}"><div class="xb-ncol">${nameHTML(s, st)}</div><p class="xb-text">${text}</p></div>`;
    }
    // novel
    const pos = st.names.position;
    if (pos === 'inline') {
      return `<p class="${cls.join(' ')}" data-id="${b.id}" style="${sv};${gapStyle}">${nameHTML(s, st)}<span class="xb-text">${text}</span></p>`;
    }
    const av = st.names.avatar && s && pos === 'above' ? avatarHTML(s) : '';
    const head = pos === 'above' && s ? `<div class="xb-head">${av}${nameHTML(s, st)}</div>` : '';
    return `<div class="${cls.join(' ')}" data-id="${b.id}" style="${sv};${gapStyle}">${head}<p class="xb-text">${text}</p></div>`;
  }

  /* ---------- the card ---------- */
  const RATIOS = { '1:1': 1, '4:5': 1.25, '3:4': 4 / 3, '9:16': 16 / 9, '16:9': 9 / 16, '2:3': 1.5 };

  App.cardVars = function (st) {
    const F = App.fonts;
    const fs = Math.round(st.font.size);
    const r = (x) => Math.max(9, Math.round(x)) + 'px';
    const panel = st.panel;
    const panelBg = panel.on ? U.rgba(panel.color, panel.opacity) : 'transparent';
    const shadow = panel.on && panel.shadow > 0 ? `0 ${Math.round(18 * panel.shadow + 4)}px ${Math.round(60 * panel.shadow + 10)}px ${U.rgba('#3a1a24', panel.shadow * 0.55)}, 0 1px 2px ${U.rgba('#3a1a24', panel.shadow * 0.4)}` : 'none';
    const bgBase = st.bg.type === 'gradient' ? `linear-gradient(${st.bg.angle}deg, ${st.bg.color}, ${st.bg.color2})` : 'none';
    const w = Math.round(st.width);
    const minH = st.ratio !== 'auto' && RATIOS[st.ratio] ? Math.round(w * RATIOS[st.ratio]) : 0;
    const vars = {
      '--w': w + 'px',
      '--minh': minH + 'px',
      '--bg': st.bg.color,
      '--bg-grad': bgBase,
      '--margin': Math.round(panel.margin) + 'px',
      '--pad': (panel.on ? Math.round(panel.padding) : 0) + 'px',
      '--panel-bg': panelBg,
      '--panel-r': Math.round(panel.radius) + 'px',
      '--panel-border': panel.on && panel.borderWidth > 0 ? `${panel.borderWidth}px ${panel.borderStyle} ${panel.borderColor}` : '0 none transparent',
      '--panel-shadow': shadow,
      '--f-body': F.stack(st.font.body),
      '--f-narr': F.stack(st.font.narr || st.font.body),
      '--f-name': F.stack(st.font.name),
      '--f-title': F.stack(st.font.title),
      '--fs': fs + 'px',
      '--fs-narr': r(fs * st.narr.scale),
      '--fs-name': r(fs * st.names.scale),
      '--fs-small': r(fs * 0.78),
      '--fs-sub': r(fs * 0.8),
      '--fs-emph': r(fs * 1.2),
      '--fs-title': r(st.head.titleSize),
      '--fs-stamp': r(12),
      '--lh': st.font.lineHeight,
      '--ls': st.font.letterSpacing + 'em',
      '--gap': Math.round(st.font.gap) + 'px',
      '--text': st.color.text,
      '--narr': st.color.narr,
      '--accent': st.color.accent,
      '--accent-soft': U.rgba(st.color.accent, 0.08),
      '--muted': st.color.muted,
      '--title-c': st.color.title,
      '--mark': st.emph.markColor,
      '--head-align': st.head.align,
      '--foot-align': st.foot.align,
      '--narr-align': st.narr.align,
      '--narr-style': st.narr.italic ? 'italic' : 'normal',
      '--narr-indent': st.narr.indent ? '1em' : '0',
      '--bub-r': Math.round(st.bubble.radius) + 'px',
      '--bub-max': st.bubble.maxWidth + '%',
      '--c1': st.deco.color1,
      '--c2': st.deco.color2,
    };
    return Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(';');
  };

  App.renderCard = function (cardEl) {
    const state = App.state;
    const st = state.style;
    const meta = state.meta;
    const cls = [
      'xc',
      'ly-' + st.layout,
      'np-' + st.names.position,
      'ns-' + st.names.style,
      'mk-' + st.emph.mark,
      'eb-' + st.emph.block,
      st.panel.on ? 'panel-on' : 'panel-off',
      st.ratio !== 'auto' ? 'has-ratio' : '',
      st.bubble.avatar ? 'with-av' : 'no-av',
    ].filter(Boolean);
    cardEl.className = cls.join(' ');
    cardEl.setAttribute('style', App.cardVars(st));

    // background layers
    const pat = patternLayer(st.bg);
    let layers = '';
    if (st.bg.image) layers += `<div class="xl xl-img" style="background-image:url(${st.bg.image});opacity:${st.bg.imageOpacity}"></div>`;
    if (pat) layers += `<div class="xl" style="background-image:${pat.image};background-size:${pat.size}"></div>`;
    if (st.bg.noise) layers += `<div class="xl xl-noise" style="background-image:${NOISE}"></div>`;

    // header
    let head = '';
    const hasTitle = meta.showTitle && meta.title;
    const hasSub = meta.showSubtitle && meta.subtitle;
    const hasDate = meta.showDate && meta.date;
    if (hasTitle || hasSub || hasDate) {
      head += '<header class="xc-head">';
      if (hasSub) head += `<div class="xc-sub">${esc(meta.subtitle)}</div>`;
      if (hasTitle) head += `<h1 class="xc-title">${App.formatInline(meta.title)}</h1>`;
      if (hasDate) head += `<div class="xc-date">${esc(meta.date)}</div>`;
      if (st.deco.ornament !== 'none') head += `<div class="xc-orn">${ornament(st.deco.ornament, st, 150)}</div>`;
      head += '</header>';
    }

    // body
    const visible = state.blocks.filter((b) => !b.hidden);
    let body = '';
    let prev = null;
    visible.forEach((b, i) => {
      body += blockHTML(b, i, { st, prev });
      prev = b;
    });
    if (!visible.length) body = '<p class="xb xb-narr xb-empty">왼쪽에서 원문을 붙여넣거나 블록을 추가해 주세요.</p>';

    let tail = '';
    if (meta.showComment && meta.comment) {
      tail += `<aside class="xc-comment"><span class="xc-cmark">${icon(HEART, 12, st.deco.color2)}</span><div>${App.formatInline(meta.comment)}</div></aside>`;
    }
    if (meta.showFooter && meta.footer) {
      tail += `<footer class="xc-foot"><i style="background:${st.deco.color1}"></i><span>${esc(meta.footer)}</span><i style="background:${st.deco.color2}"></i></footer>`;
    }

    let over = '';
    if (st.deco.corners === 'tape') {
      over += `<div class="xd-tape" style="top:${Math.max(4, Math.round(st.panel.margin - 14))}px;background-color:${U.rgba(st.deco.color1, 0.45)}"></div>`;
    }
    if (st.deco.stamp) {
      over += `<div class="xd-stamp" style="right:${Math.max(10, Math.round(st.panel.margin * 0.55))}px;bottom:${Math.max(10, Math.round(st.panel.margin * 0.5))}px;color:${st.deco.color2};border-color:${st.deco.color2}"><span>${esc(meta.stampTop || '')}</span>${icon(HEART, 11, st.deco.color2)}<span>${esc(meta.stampBottom || '')}</span></div>`;
    }

    cardEl.innerHTML = `${layers}<div class="xc-deco">${decoLayer(st)}</div><div class="xc-panel">${head}<div class="xc-body">${body}</div>${tail}</div>${over}`;
  };

  // mini preview tile for preset gallery
  App.presetSwatch = function (p) {
    const st = U.merge(App.presets.baseStyle(), p.style);
    const sp = p.speakers || {};
    const c1 = (sp.ritsu && sp.ritsu.color && sp.ritsu.color.name) || '#D9708F';
    const c2 = (sp.enju && sp.enju.color && sp.enju.color.name) || '#C8102E';
    const bg = st.bg.type === 'gradient' ? `linear-gradient(${st.bg.angle}deg, ${st.bg.color}, ${st.bg.color2})` : st.bg.color;
    const pat = patternLayer(Object.assign({}, st.bg, { patternScale: 0.6 }));
    const panel = st.panel.on ? `background:${U.rgba(st.panel.color, st.panel.opacity)};border-radius:${Math.min(10, st.panel.radius / 2)}px;` : '';
    const lines =
      st.layout === 'bubble'
        ? `<i class="sw-b" style="background:${(sp.ritsu && sp.ritsu.color.bubble) || '#fff'}"></i><i class="sw-b r" style="background:${(sp.enju && sp.enju.color.bubble) || '#222'}"></i><i class="sw-b" style="background:${(sp.ritsu && sp.ritsu.color.bubble) || '#fff'};width:40%"></i>`
        : `<i class="sw-n" style="background:${c1}"></i><i class="sw-l" style="background:${st.color.text}"></i><i class="sw-n" style="background:${c2}"></i><i class="sw-l" style="background:${st.color.text};width:62%"></i><i class="sw-l" style="background:${st.color.narr};opacity:.5"></i>`;
    return `<span class="sw" style="background:${bg}">${pat ? `<span class="sw-pat" style="background-image:${pat.image};background-size:${pat.size}"></span>` : ''}<span class="sw-panel" style="${panel}"><span class="sw-title" style="background:${st.color.title}"></span>${lines}</span></span>`;
  };
})();
