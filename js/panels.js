/* Settings panels: data binding, tabs, speakers, presets, info, project files */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const { $, $$, esc } = U;

  /* ---------- generic binding: data-bind="path.to.value" ---------- */
  function readInput(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'range' || el.type === 'number') return parseFloat(el.value);
    return el.value;
  }
  function fmtOut(el) {
    const v = parseFloat(el.value);
    const unit = el.dataset.unit || '';
    if (unit === '%') return Math.round(v * 100) + '%';
    if (unit === 'x') return v.toFixed(2).replace(/0$/, '') + '×';
    if (unit === 'em') return v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + 'em';
    const dec = (el.step || '1').split('.')[1];
    return (dec ? v.toFixed(dec.length) : v) + unit;
  }
  function paintRange(el) {
    const min = parseFloat(el.min || 0);
    const max = parseFloat(el.max || 100);
    el.style.setProperty('--p', ((parseFloat(el.value) - min) / (max - min)) * 100 + '%');
    const out = el.closest('.field') && el.closest('.field').querySelector('output');
    if (out) out.textContent = fmtOut(el);
  }

  App.syncControls = function () {
    const st = App.state;
    $$('[data-bind]').forEach((el) => {
      const v = U.get(st, el.dataset.bind);
      if (el.classList.contains('seg')) {
        $$('button', el).forEach((b) => b.classList.toggle('on', String(b.dataset.value) === String(v)));
      } else if (el.type === 'checkbox') el.checked = !!v;
      else if (document.activeElement !== el) {
        el.value = v == null ? '' : v;
        if (el.type === 'range') paintRange(el);
      }
    });
    applyVisibility();
  };

  function applyVisibility() {
    const test = (expr) => {
      const [path, val] = expr.split('=');
      return String(U.get(App.state, path)) === val;
    };
    $$('[data-show]').forEach((el) => (el.style.display = test(el.dataset.show) ? '' : 'none'));
    $$('[data-hide]').forEach((el) => (el.style.display = test(el.dataset.hide) ? 'none' : ''));
  }

  function onBound(path, value) {
    U.set(App.state, path, value);
    const structural = /^style\.(layout|names|quotes)|^style\.bg\.pattern/.test(path);
    if (path.startsWith('style.font')) App.ensureFonts();
    applyVisibility();
    markPresetCustom();
    App.commit({ immediate: structural });
    if (path === 'export.scale' || path === 'style.width' || path === 'style.ratio') App.emit('dims');
  }
  function markPresetCustom() {
    $$('.preset.on').forEach((p) => p.classList.remove('on'));
  }

  function initBinding() {
    // font selects
    const groups = {};
    Object.entries(App.fonts.FONTS).forEach(([k, f]) => (groups[f.group] = groups[f.group] || []).push([k, f]));
    $$('select[data-fonts]').forEach((sel) => {
      let h = sel.dataset.same ? `<option value="">${esc(sel.dataset.same)}</option>` : '';
      Object.entries(groups).forEach(([g, list]) => {
        h += `<optgroup label="${esc(g)}">` + list.map(([k, f]) => `<option value="${k}">${esc(f.label)}</option>`).join('') + '</optgroup>';
      });
      sel.innerHTML = h;
    });

    $$('[data-bind]').forEach((el) => {
      const path = el.dataset.bind;
      if (el.classList.contains('seg')) {
        el.addEventListener('click', (e) => {
          const b = e.target.closest('button[data-value]');
          if (!b) return;
          e.preventDefault();
          const v = el.hasAttribute('data-num') ? parseFloat(b.dataset.value) : b.dataset.value;
          $$('button', el).forEach((x) => x.classList.toggle('on', x === b));
          onBound(path, v);
          if (el.hasAttribute('data-num')) App.syncControls();
        });
        return;
      }
      const ev = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        if (el.type === 'range') paintRange(el);
        onBound(path, readInput(el));
        if (path === 'style.width') App.syncControls();
      });
      // live colour preview while dragging the picker
      if (el.type === 'color') el.addEventListener('input', () => onBound(path, el.value));
    });

    // local (non-state) segmented controls on the source page
    $$('.seg[data-local]').forEach((el) =>
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-value]');
        if (!b) return;
        e.preventDefault();
        $$('button', el).forEach((x) => x.classList.toggle('on', x === b));
      })
    );
  }
  const localVal = (name) => {
    const on = $(`.seg[data-local="${name}"] button.on`);
    return on ? on.dataset.value : null;
  };

  /* ---------- tabs ---------- */
  App.setTab = function (tab) {
    if (App.ui.tab !== tab) $('#panel').scrollTop = 0;
    App.ui.tab = tab;
    $$('#rail button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $$('.page').forEach((p) => p.classList.toggle('on', p.dataset.page === tab));
    App.saveUI();
    if (App.ui.mobileView === 'preview' && window.matchMedia('(max-width: 900px)').matches) App.setMobileView('edit');
    if (tab === 'blocks') requestAnimationFrame(() => $$('.bk-text').forEach((t) => ((t.style.height = 'auto'), (t.style.height = t.scrollHeight + 'px'))));
    if (tab === 'save') App.emit('dims');
  };
  App.setMobileView = function (v) {
    App.ui.mobileView = v;
    $('#workspace').dataset.mview = v;
    $$('.mobile-switch button').forEach((b) => b.classList.toggle('on', b.dataset.mview === v));
    App.saveUI();
    if (v === 'preview') App.emit('fit');
  };

  /* ---------- source page ---------- */
  function initSource() {
    const raw = $('#rawInput');
    raw.value = App.store.read('zutto-excerpt:raw:v1', '') || '';
    raw.addEventListener(
      'input',
      U.debounce(() => App.store.write('zutto-excerpt:raw:v1', raw.value), 400)
    );
    const run = (append) => {
      const text = raw.value.trim();
      if (!text) return App.toast('먼저 원문을 붙여넣어 주세요.');
      const out = App.parseRaw(text, App.state.speakers, {
        plainAs: localVal('plainAs'),
        guess: localVal('guess'),
        stripQuotes: $('#optStrip').checked,
        asterisk: $('#optAst').checked,
      });
      if (!out.length) return App.toast('인식된 문장이 없어요.');
      if (!append && App.state.blocks.length) App.addRestorePoint('원문 변환 전');
      App.state.blocks = append ? App.state.blocks.concat(out) : out;
      App.commit({ list: true, immediate: true });
      const d = out.filter((b) => b.type === 'dialogue').length;
      const g = out.filter((b) => b.guessed).length;
      App.toast(`${out.length}개 블록 (대사 ${d} · 서술 ${out.length - d})${g ? ` — 추측 화자 ${g}개를 확인해 주세요` : ''}`, 'ok', 3600);
      App.setTab('blocks');
    };
    $('#btnParseReplace').addEventListener('click', () => run(false));
    $('#btnParseAppend').addEventListener('click', () => run(true));
  }

  /* ---------- speakers ---------- */
  function speakerCard(s) {
    const av = s.avatar ? `style="background-image:url(${s.avatar})"` : '';
    const init = s.avatar ? '' : esc(Array.from(App.speakerLabel(s) || '?')[0]);
    const disp = [
      ['short', '짧게'],
      ['ko', '한국어'],
      ['ja', '日本語'],
      ['both', '함께'],
      ['custom', '직접'],
    ];
    const used = App.state.blocks.filter((b) => b.speaker === s.id).length;
    return `<div class="spk" data-sid="${s.id}" style="--c:${s.color.name}">
      <div class="spk-top">
        <label class="spk-av" ${av} title="아이콘 이미지 바꾸기">${init}<input type="file" accept="image/*" data-sp-avatar /><em><svg><use href="#i-image"/></svg></em></label>
        <div class="spk-names"><b>${esc(App.speakerLabel(s))}</b><small>${esc([s.nameKo, s.nameJa].filter(Boolean).join(' · ') || '이름을 입력하세요')} · 대사 ${used}개</small></div>
      </div>
      <div class="spk-body">
        <div class="field-grid cols-3">
          <label class="field"><span class="lbl">짧은 이름</span><input type="text" data-sp="short" value="${esc(s.short)}" /></label>
          <label class="field"><span class="lbl">한국어 이름</span><input type="text" data-sp="nameKo" value="${esc(s.nameKo)}" /></label>
          <label class="field"><span class="lbl">日本語</span><input type="text" data-sp="nameJa" value="${esc(s.nameJa)}" /></label>
        </div>
        <div class="field">
          <span class="lbl">이미지에 표시할 이름</span>
          <div class="seg" data-sp-seg="display">${disp.map(([v, l]) => `<button data-value="${v}" class="${s.display === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        </div>
        <label class="field" style="${s.display === 'custom' ? '' : 'display:none'}" data-custom><span class="lbl">직접 입력</span><input type="text" data-sp="custom" value="${esc(s.custom)}" placeholder="예) 律くん" /></label>
        <label class="field"><span class="lbl">원문에서 인식할 이름 <em class="hint">쉼표로 구분</em></span><input type="text" data-sp="aliases" value="${esc(s.aliases)}" /></label>
        <div class="spk-colors">
          <label class="field color"><span class="lbl">이름 색</span><input type="color" data-sp-color="name" value="${s.color.name}" /></label>
          <label class="field color"><span class="lbl">대사 색</span><input type="color" data-sp-color="text" value="${s.color.text || App.state.style.color.text}" /></label>
          <label class="field color"><span class="lbl">말풍선</span><input type="color" data-sp-color="bubble" value="${s.color.bubble}" /></label>
          <label class="field color"><span class="lbl">풍선 글자</span><input type="color" data-sp-color="bubbleText" value="${s.color.bubbleText}" /></label>
        </div>
        <div class="field">
          <span class="lbl">말풍선 위치 <em class="hint">메신저 레이아웃</em></span>
          <div class="seg" data-sp-seg="side"><button data-value="left" class="${s.side !== 'right' ? 'on' : ''}">왼쪽</button><button data-value="right" class="${s.side === 'right' ? 'on' : ''}">오른쪽</button></div>
        </div>
      </div>
      <div class="spk-foot">
        <div class="btn-row">
          ${s.color.text ? '<button class="btn btn-ghost btn-sm" data-sp-act="resetText">대사 색 기본값</button>' : ''}
          ${s.avatar ? '<button class="btn btn-ghost btn-sm" data-sp-act="clearAvatar">아이콘 제거</button>' : ''}
        </div>
        ${App.state.speakers.length > 1 ? '<button class="btn btn-ghost btn-sm danger" data-sp-act="remove"><svg><use href="#i-trash"/></svg>삭제</button>' : ''}
      </div>
    </div>`;
  }

  App.renderSpeakers = function () {
    const el = $('#speakerList');
    if (!el) return;
    if (el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') return;
    el.innerHTML = App.state.speakers.map(speakerCard).join('');
  };

  function initSpeakers() {
    const el = $('#speakerList');
    const sp = (t) => App.speaker(t.closest('.spk').dataset.sid);
    const refreshHead = (card, s) => {
      card.querySelector('.spk-names b').textContent = App.speakerLabel(s);
      card.style.setProperty('--c', s.color.name);
    };
    el.addEventListener('input', (e) => {
      const t = e.target;
      const s = t.closest('.spk') && sp(t);
      if (!s) return;
      if (t.dataset.sp) {
        s[t.dataset.sp] = t.value;
        refreshHead(t.closest('.spk'), s);
        App.commit({ list: t.dataset.sp !== 'aliases' });
      } else if (t.dataset.spColor) {
        s.color[t.dataset.spColor] = t.value;
        refreshHead(t.closest('.spk'), s);
        markPresetCustom();
        App.commit();
      }
    });
    el.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.dataset.spColor) {
        App.commit({ list: true, immediate: true });
        App.renderSpeakers();
      }
      if (t.hasAttribute('data-sp-avatar') && t.files[0]) {
        const s = sp(t);
        try {
          s.avatar = await App.readImage(t.files[0], 240, 'image/jpeg', 0.88, true);
          App.commit({ immediate: true });
          App.renderSpeakers();
        } catch (err) {
          App.toast('이미지를 불러오지 못했어요.', 'error');
        }
      }
    });
    el.addEventListener('click', (e) => {
      const segBtn = e.target.closest('[data-sp-seg] button');
      if (segBtn) {
        e.preventDefault();
        const seg = segBtn.parentElement;
        const s = sp(seg);
        s[seg.dataset.spSeg] = segBtn.dataset.value;
        $$('button', seg).forEach((b) => b.classList.toggle('on', b === segBtn));
        const card = seg.closest('.spk');
        card.querySelector('[data-custom]').style.display = s.display === 'custom' ? '' : 'none';
        refreshHead(card, s);
        App.commit({ list: true, immediate: true });
        return;
      }
      const act = e.target.closest('[data-sp-act]');
      if (!act) return;
      const s = sp(act);
      if (act.dataset.spAct === 'remove') {
        const used = App.state.blocks.filter((b) => b.speaker === s.id).length;
        if (used && !confirm(`이 화자의 대사 ${used}개는 화자 없음으로 바뀌어요. 삭제할까요?`)) return;
        App.state.blocks.forEach((b) => b.speaker === s.id && (b.speaker = null));
        App.state.speakers = App.state.speakers.filter((x) => x !== s);
      } else if (act.dataset.spAct === 'clearAvatar') s.avatar = '';
      else if (act.dataset.spAct === 'resetText') s.color.text = '';
      App.commit({ list: true, immediate: true });
      App.renderSpeakers();
    });
    $('#btnAddSpeaker').addEventListener('click', () => {
      const s = App.defaultSpeaker();
      s.short = '화자 ' + (App.state.speakers.length + 1);
      App.state.speakers.push(s);
      App.commit({ list: true, immediate: true });
      App.renderSpeakers();
      requestAnimationFrame(() => {
        const c = $(`[data-sid="${s.id}"]`);
        if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  /* ---------- image upload helper (resized + compressed so it fits in localStorage) ---------- */
  App.readImage = function (file, maxSide, type, quality, square) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const img = new Image();
        img.onerror = rej;
        img.onload = () => {
          let sw = img.naturalWidth;
          let sh = img.naturalHeight;
          let sx = 0;
          let sy = 0;
          if (square) {
            const m = Math.min(sw, sh);
            sx = (sw - m) / 2;
            sy = (sh - m) / 2;
            sw = sh = m;
          }
          const k = Math.min(1, maxSide / Math.max(sw, sh));
          const c = document.createElement('canvas');
          c.width = Math.round(sw * k);
          c.height = Math.round(sh * k);
          c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
          res(c.toDataURL(type, quality));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };

  function initBgImage() {
    const info = () => {
      const img = App.state.style.bg.image;
      $('#bgImageInfo').textContent = img ? `${Math.round((img.length * 0.75) / 1024)}KB` : '';
    };
    $('#bgImageInput').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        App.state.style.bg.image = await App.readImage(f, 1600, 'image/jpeg', 0.86);
        App.commit({ immediate: true, panels: true });
        info();
      } catch (err) {
        App.toast('이미지를 불러오지 못했어요.', 'error');
      }
      e.target.value = '';
    });
    $('#bgImageClear').addEventListener('click', () => {
      App.state.style.bg.image = '';
      App.commit({ immediate: true, panels: true });
      info();
    });
    App.on('panels', info);
    info();
  }

  /* ---------- presets ---------- */
  App.renderPresets = function () {
    const grid = $('#presetGrid');
    grid.innerHTML = App.presets.list
      .map(
        (p) => `<button class="preset ${App.state.presetId === p.id ? 'on' : ''}" data-preset="${p.id}">${App.presetSwatch(p)}<b>${esc(p.name)} <span class="hint">${esc(p.en)}</span></b><small>${esc(p.desc)}</small></button>`
      )
      .join('');
    const mine = App.store.read(App.store.KEY_PRESETS, []);
    $('#myPresetWrap').innerHTML = mine.length
      ? `<span class="lbl">내 프리셋</span><div class="chips">${mine.map((p, i) => `<button class="chip" data-my="${i}">${esc(p.name)}</button>`).join('')}</div>`
      : '';
    $('#myPresetList').innerHTML = mine.length
      ? mine
          .map(
            (p, i) =>
              `<div class="mini-item"><span class="t">${esc(p.name)}<small>${new Date(p.at).toLocaleDateString()}</small></span><button class="btn btn-sm" data-my="${i}">적용</button><button class="icon-btn sm" data-my-del="${i}" aria-label="삭제"><svg><use href="#i-trash"/></svg></button></div>`
          )
          .join('')
      : '<div class="mini-empty">저장된 프리셋이 없어요.</div>';
  };
  function applyMyPreset(i) {
    const p = App.store.read(App.store.KEY_PRESETS, [])[i];
    if (!p) return;
    App.presets.apply({ id: 'my-' + i, style: p.style, speakers: p.speakers });
    App.commit({ immediate: true, panels: true, list: true });
    App.ensureFonts();
    App.toast(`‘${p.name}’ 프리셋을 적용했어요.`, 'ok');
  }
  function initPresets() {
    document.addEventListener('click', (e) => {
      const p = e.target.closest('[data-preset]');
      if (p) {
        App.presets.apply(App.presets.get(p.dataset.preset), { keepWidth: null });
        App.commit({ immediate: true, panels: true, list: true });
        App.ensureFonts();
        return;
      }
      const my = e.target.closest('[data-my]');
      if (my) return applyMyPreset(+my.dataset.my);
      const del = e.target.closest('[data-my-del]');
      if (del) {
        const list = App.store.read(App.store.KEY_PRESETS, []);
        const [gone] = list.splice(+del.dataset.myDel, 1);
        App.store.write(App.store.KEY_PRESETS, list);
        App.renderPresets();
        App.toast(`‘${gone.name}’ 삭제됨`);
      }
    });
    $('#btnSavePreset').addEventListener('click', () => {
      const name = $('#presetName').value.trim() || `내 디자인 ${new Date().toLocaleDateString()}`;
      const list = App.store.read(App.store.KEY_PRESETS, []);
      const speakers = {};
      App.state.speakers.forEach((s) => (speakers[s.id] = { color: U.clone(s.color), side: s.side }));
      const style = U.clone(App.state.style);
      style.bg.image = ''; // keep presets light
      list.unshift({ name, at: Date.now(), style, speakers });
      if (App.store.write(App.store.KEY_PRESETS, list)) {
        $('#presetName').value = '';
        App.renderPresets();
        App.toast(`‘${name}’ 프리셋을 저장했어요.`, 'ok');
      }
    });
  }

  /* ---------- info / project ---------- */
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  }
  App.download = download;

  App.renderSnapshots = function () {
    const list = App.store.read(App.store.KEY_SNAP, []);
    $('#snapshotList').innerHTML = list.length
      ? list
          .map(
            (s, i) =>
              `<div class="mini-item"><span class="t">${esc(s.label)}<small>${new Date(s.at).toLocaleString()} · ${(s.doc.blocks || []).length}블록</small></span><button class="btn btn-sm" data-snap="${i}">복원</button></div>`
          )
          .join('')
      : '<div class="mini-empty">아직 복원 지점이 없어요.</div>';
  };

  function initProject() {
    $('#btnToday').addEventListener('click', () => {
      App.state.meta.date = U.today();
      App.state.meta.showDate = true;
      App.syncControls();
      App.commit({ immediate: true });
    });
    $('#btnBackup').addEventListener('click', () => {
      const name = (App.state.meta.title || 'excerpt').replace(/[\\/:*?"<>|]/g, '').slice(0, 40);
      download(`${name}_발췌작업.json`, new Blob([JSON.stringify(App.state, null, 1)], { type: 'application/json' }));
    });
    $('#importInput').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const doc = JSON.parse(fr.result);
          if (!doc || !Array.isArray(doc.blocks)) throw new Error('bad');
          App.addRestorePoint('불러오기 전');
          App.state = App.normalize(doc);
          App.commit({ list: true, panels: true, immediate: true });
          App.ensureFonts();
          App.toast('작업 파일을 불러왔어요.', 'ok');
        } catch (err) {
          App.toast('올바른 작업 파일이 아니에요.', 'error');
        }
      };
      fr.readAsText(f);
      e.target.value = '';
    });
    $('#btnNewDoc').addEventListener('click', () => {
      if (!confirm('새 발췌를 시작할까요? 지금 내용은 복원 지점에 보관돼요.\n(디자인 설정은 그대로 유지됩니다)')) return;
      App.addRestorePoint('새로 시작 전');
      const keepStyle = U.clone(App.state.style);
      const keepSpeakers = U.clone(App.state.speakers);
      const d = App.defaultDoc();
      d.style = keepStyle;
      d.speakers = keepSpeakers;
      d.presetId = App.state.presetId;
      d.blocks = [];
      d.meta.title = '';
      d.meta.comment = '';
      App.state = d;
      App.commit({ list: true, panels: true, immediate: true });
      App.setTab('source');
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-snap]');
      if (!b) return;
      const s = App.store.read(App.store.KEY_SNAP, [])[+b.dataset.snap];
      if (!s || !confirm(`‘${s.label}’ 상태로 되돌릴까요? 현재 내용도 복원 지점에 보관돼요.`)) return;
      App.addRestorePoint('복원 전');
      App.state = App.normalize(s.doc);
      App.commit({ list: true, panels: true, immediate: true });
      App.ensureFonts();
      App.toast('복원했어요.', 'ok');
    });
    App.on('snapshots', App.renderSnapshots);
  }

  App.initPanels = function () {
    initBinding();
    initSource();
    initSpeakers();
    initBgImage();
    initPresets();
    initProject();
    $$('#rail button').forEach((b) => b.addEventListener('click', () => App.setTab(b.dataset.tab)));
    $$('.mobile-switch button').forEach((b) => b.addEventListener('click', () => App.setMobileView(b.dataset.mview)));
    document.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]');
      if (g) {
        e.preventDefault();
        App.setTab(g.dataset.goto);
      }
    });
    // remember which <details> are open
    $$('details.sec').forEach((d) => {
      const k = d.dataset.sec;
      if (k in App.ui.open) d.open = App.ui.open[k];
      d.addEventListener('toggle', () => {
        App.ui.open[k] = d.open;
        App.saveUI();
      });
    });
    App.on('panels', () => {
      App.syncControls();
      App.renderSpeakers();
      App.renderPresets();
    });
    App.on('list', () => {
      // speaker "used" counters
      if (App.ui.tab === 'speakers') App.renderSpeakers();
    });
  };
})();
