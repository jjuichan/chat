/* Block editor: list, inline formatting, reordering, block menu */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const { $, esc } = U;

  let listEl;
  let lastFocus = null; // {id, start, end}

  const ico = (id) => `<svg><use href="#i-${id}"/></svg>`;
  const blocks = () => App.state.blocks;
  const idxOf = (id) => blocks().findIndex((b) => b.id === id);

  function newBlock(type, speaker) {
    return { id: U.uid(), type: type || 'narration', speaker: speaker || null, text: '', emph: false, hidden: false, gap: 0 };
  }

  function blockItem(b, i) {
    const sp = App.speaker(b.speaker);
    const color = b.type === 'dialogue' ? (sp ? sp.color.name : 'var(--text-3)') : '';
    const cls = ['bk', 't-' + b.type];
    if (b.hidden) cls.push('is-hidden');
    let head = `<button class="bk-handle" data-drag title="끌어서 순서 바꾸기" aria-label="순서 바꾸기">${ico('grip')}</button>
      <span class="bk-idx">${String(i + 1).padStart(2, '0')}</span>`;
    if (b.type !== 'divider') {
      head += `<div class="bk-type"><button data-act="type" data-v="narration" class="${b.type === 'narration' ? 'on' : ''}">서술</button><button data-act="type" data-v="dialogue" class="${
        b.type === 'dialogue' ? 'on' : ''
      }">대사</button></div>`;
    }
    if (b.type === 'dialogue') {
      head += '<div class="bk-sp">';
      App.state.speakers.forEach((s) => {
        head += `<button class="chip ${b.speaker === s.id ? 'on' : ''}" data-act="speaker" data-v="${s.id}" style="--c:${s.color.name}"><i></i>${esc(s.short || App.speakerLabel(s))}</button>`;
      });
      if (b.guessed) head += '<span class="bk-guess" title="화자를 문맥으로 추측했어요. 맞으면 이름을 한 번 눌러 확정하세요.">추측</span>';
      head += '</div>';
    }
    head += `<div class="bk-tools">
      ${b.type !== 'divider' ? `<button data-act="emph" class="${b.emph ? 'on' : ''}" title="블록 강조">${ico('star')}</button>` : ''}
      <button data-act="hide" title="${b.hidden ? '이미지에 표시' : '이미지에서 숨기기'}">${ico(b.hidden ? 'eye-off' : 'eye')}</button>
      <button data-act="more" title="더 보기">${ico('more')}</button></div>`;
    const body =
      b.type === 'divider'
        ? '<div class="bk-div">구분선</div>'
        : `<textarea class="bk-text" rows="1" spellcheck="false" placeholder="${b.type === 'dialogue' ? '대사를 입력하세요' : '서술문을 입력하세요'}">${esc(b.text)}</textarea>`;
    const gap = b.gap ? `<span class="bk-gap">간격 ${b.gap > 0 ? '+' : ''}${b.gap}</span>` : '';
    return `<div class="${cls.join(' ')}" data-id="${b.id}" style="--sp:${color || ''}"><div class="bk-head">${head}</div>${body}${gap}</div>`;
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  App.renderList = function () {
    if (!listEl) return;
    const bs = blocks();
    if (!bs.length) {
      listEl.innerHTML = `<div class="empty-blocks"><b>아직 블록이 없어요</b>원문 탭에서 채팅을 붙여넣거나, 위의 버튼으로 블록을 추가해 보세요.</div>`;
    } else {
      listEl.innerHTML = bs.map(blockItem).join('');
      U.$$('.bk-text', listEl).forEach(autosize);
    }
    updateStats();
  };

  function updateStats() {
    const bs = blocks();
    const hidden = bs.filter((b) => b.hidden).length;
    const chars = bs.filter((b) => !b.hidden).reduce((n, b) => n + b.text.length, 0);
    const el = $('#blockStats');
    if (el) el.textContent = `${bs.length}개 블록${hidden ? ` · ${hidden}개 숨김` : ''} · ${chars.toLocaleString()}자`;
  }

  function focusBlock(id, pos) {
    requestAnimationFrame(() => {
      const ta = listEl.querySelector(`[data-id="${id}"] .bk-text`);
      if (!ta) return;
      ta.focus({ preventScroll: true });
      const p = pos == null ? ta.value.length : pos;
      ta.setSelectionRange(p, p);
      ta.closest('.bk').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
  App.focusBlock = focusBlock;

  App.revealBlock = function (id) {
    App.setTab('blocks');
    requestAnimationFrame(() => {
      const el = listEl.querySelector(`[data-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    });
  };

  /* ---------- actions ---------- */
  function insertAt(i, b) {
    blocks().splice(i, 0, b);
    App.commit({ list: true, immediate: true });
    if (b.type !== 'divider') focusBlock(b.id, 0);
  }
  App.addBlock = function (type) {
    const bs = blocks();
    let speaker = null;
    if (type === 'dialogue') {
      // alternate from the last dialogue speaker
      const last = [...bs].reverse().find((b) => b.type === 'dialogue' && b.speaker);
      const sps = App.state.speakers;
      if (last && sps.length > 1) {
        const k = sps.findIndex((s) => s.id === last.speaker);
        speaker = sps[(k + 1) % Math.min(2, sps.length)].id;
      } else speaker = sps[0] ? sps[0].id : null;
    }
    // insert after the focused block if there is one
    const at = lastFocus && idxOf(lastFocus.id) >= 0 ? idxOf(lastFocus.id) + 1 : bs.length;
    insertAt(at, newBlock(type, speaker));
  };

  function move(id, dir) {
    const i = idxOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks().length) return;
    const bs = blocks();
    [bs[i], bs[j]] = [bs[j], bs[i]];
    App.commit({ list: true, immediate: true });
  }
  function mergeUp(id) {
    const i = idxOf(id);
    if (i <= 0) return App.toast('위에 합칠 블록이 없어요.');
    const a = blocks()[i - 1];
    const b = blocks()[i];
    if (a.type === 'divider' || b.type === 'divider') return App.toast('구분선은 합칠 수 없어요.');
    const pos = a.text.length + (a.text && b.text ? 1 : 0);
    a.text = [a.text, b.text].filter(Boolean).join('\n');
    blocks().splice(i, 1);
    App.commit({ list: true, immediate: true });
    focusBlock(a.id, pos);
  }
  function splitAt(id, pos) {
    const i = idxOf(id);
    const b = blocks()[i];
    if (!b || b.type === 'divider') return;
    const head = b.text.slice(0, pos).replace(/\s+$/, '');
    const tail = b.text.slice(pos).replace(/^\s+/, '');
    if (!head || !tail) return App.toast('나눌 위치에 커서를 둔 뒤 눌러 주세요.');
    b.text = head;
    const nb = Object.assign(newBlock(b.type, b.speaker), { text: tail });
    blocks().splice(i + 1, 0, nb);
    App.commit({ list: true, immediate: true });
    focusBlock(nb.id, 0);
  }
  function wrapSelection(mark) {
    if (!lastFocus) return App.toast('먼저 블록의 문장을 선택해 주세요.');
    const ta = listEl.querySelector(`[data-id="${lastFocus.id}"] .bk-text`);
    const b = blocks()[idxOf(lastFocus.id)];
    if (!ta || !b) return;
    let { start, end } = lastFocus;
    if (start === end) {
      // no selection: wrap the whole block
      start = 0;
      end = ta.value.length;
    }
    const sel = ta.value.slice(start, end);
    // toggle off if already wrapped
    const before = ta.value.slice(Math.max(0, start - mark.length), start);
    const after = ta.value.slice(end, end + mark.length);
    let v;
    let ns;
    let ne;
    if (before === mark && after === mark) {
      v = ta.value.slice(0, start - mark.length) + sel + ta.value.slice(end + mark.length);
      ns = start - mark.length;
      ne = end - mark.length;
    } else if (sel.startsWith(mark) && sel.endsWith(mark) && sel.length >= mark.length * 2) {
      const inner = sel.slice(mark.length, sel.length - mark.length);
      v = ta.value.slice(0, start) + inner + ta.value.slice(end);
      ns = start;
      ne = start + inner.length;
    } else {
      v = ta.value.slice(0, start) + mark + sel + mark + ta.value.slice(end);
      ns = start + mark.length;
      ne = end + mark.length;
    }
    ta.value = v;
    b.text = v;
    autosize(ta);
    ta.focus();
    ta.setSelectionRange(ns, ne);
    lastFocus = { id: b.id, start: ns, end: ne };
    App.commit({ immediate: true });
  }

  /* ---------- menu ---------- */
  const menu = { el: null, id: null };
  function openMenu(id, anchor) {
    menu.id = id;
    const el = menu.el;
    const b = blocks()[idxOf(id)];
    $('#menuGap').textContent = b.gap ? (b.gap > 0 ? '+' : '') + b.gap : '기본';
    el.hidden = false;
    const r = anchor.getBoundingClientRect();
    const mw = el.offsetWidth;
    const mh = el.offsetHeight;
    let left = Math.min(window.innerWidth - mw - 8, r.right - mw);
    let top = r.bottom + 4;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    el.style.left = Math.max(8, left) + 'px';
    el.style.top = top + 'px';
  }
  function closeMenu() {
    if (menu.el) menu.el.hidden = true;
    menu.id = null;
  }
  function menuAction(m) {
    const id = menu.id;
    const i = idxOf(id);
    if (i < 0) return closeMenu();
    const b = blocks()[i];
    switch (m) {
      case 'up':
        move(id, -1);
        break;
      case 'down':
        move(id, 1);
        break;
      case 'addAbove':
        insertAt(i, newBlock('narration'));
        break;
      case 'addBelow':
        insertAt(i + 1, newBlock('narration'));
        break;
      case 'dup':
        insertAt(i + 1, Object.assign(U.clone(b), { id: U.uid() }));
        break;
      case 'merge':
        mergeUp(id);
        break;
      case 'gapMinus':
      case 'gapPlus':
        b.gap = U.clamp((b.gap || 0) + (m === 'gapPlus' ? 1 : -1), -1, 6);
        $('#menuGap').textContent = b.gap ? (b.gap > 0 ? '+' : '') + b.gap : '기본';
        App.commit({ list: true });
        return; // keep menu open
      case 'del':
        blocks().splice(i, 1);
        App.commit({ list: true, immediate: true });
        App.toast('블록을 삭제했어요. 실행 취소(Ctrl+Z)로 되돌릴 수 있어요.');
        break;
    }
    closeMenu();
  }

  /* ---------- drag to reorder (pointer events: mouse + touch) ---------- */
  function startDrag(e, item) {
    e.preventDefault();
    const scroller = $('#panel');
    const items = U.$$('.bk', listEl);
    const from = items.indexOf(item);
    const rects = items.map((el) => el.getBoundingClientRect());
    const gap = items.length > 1 ? rects[1].top - rects[0].bottom : 8;
    const h = rects[from].height + gap;
    const startY = e.clientY;
    const startScroll = scroller.scrollTop;
    let to = from;
    let lastY = e.clientY;
    let raf = 0;
    item.classList.add('dragging');
    items.forEach((el) => el !== item && el.classList.add('shifting'));
    const handle = e.target.closest('[data-drag]');
    try {
      handle.setPointerCapture(e.pointerId);
    } catch (_) {}

    const update = () => {
      const dy = lastY - startY + (scroller.scrollTop - startScroll);
      item.style.transform = `translateY(${dy}px)`;
      const center = rects[from].top + rects[from].height / 2 + dy;
      to = from;
      for (let k = 0; k < items.length; k++) {
        if (k === from) continue;
        const mid = rects[k].top + rects[k].height / 2;
        if (k < from && center < mid) {
          to = Math.min(to, k);
        }
        if (k > from && center > mid) to = Math.max(to, k);
      }
      items.forEach((el, k) => {
        if (k === from) return;
        let shift = 0;
        if (from < to && k > from && k <= to) shift = -h;
        if (from > to && k < from && k >= to) shift = h;
        el.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    };
    const autoScroll = () => {
      const r = scroller.getBoundingClientRect();
      const edge = 56;
      let v = 0;
      if (lastY < r.top + edge) v = -Math.ceil((r.top + edge - lastY) / 6);
      else if (lastY > r.bottom - edge) v = Math.ceil((lastY - (r.bottom - edge)) / 6);
      if (v) {
        scroller.scrollTop += v;
        update();
      }
      raf = requestAnimationFrame(autoScroll);
    };
    raf = requestAnimationFrame(autoScroll);
    const onMove = (ev) => {
      lastY = ev.clientY;
      update();
    };
    const onUp = () => {
      cancelAnimationFrame(raf);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      items.forEach((el) => {
        el.style.transform = '';
        el.classList.remove('shifting', 'dragging');
      });
      if (to !== from) {
        const bs = blocks();
        const [b] = bs.splice(from, 1);
        bs.splice(to, 0, b);
        App.commit({ list: true, immediate: true });
      }
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

  /* ---------- wiring ---------- */
  App.initEditor = function () {
    listEl = $('#blockList');
    menu.el = $('#blockMenu');

    listEl.addEventListener('input', (e) => {
      const ta = e.target.closest('.bk-text');
      if (!ta) return;
      const id = ta.closest('.bk').dataset.id;
      const b = blocks()[idxOf(id)];
      if (!b) return;
      b.text = ta.value;
      autosize(ta);
      updateStats();
      App.commit();
    });
    const remember = (e) => {
      const ta = e.target.closest && e.target.closest('.bk-text');
      if (!ta) return;
      lastFocus = { id: ta.closest('.bk').dataset.id, start: ta.selectionStart, end: ta.selectionEnd };
    };
    ['focusin', 'keyup', 'mouseup', 'select', 'touchend'].forEach((ev) => listEl.addEventListener(ev, remember));
    document.addEventListener('selectionchange', () => {
      const a = document.activeElement;
      if (a && a.classList && a.classList.contains('bk-text')) remember({ target: a });
    });

    listEl.addEventListener('keydown', (e) => {
      const ta = e.target.closest('.bk-text');
      if (!ta) return;
      const id = ta.closest('.bk').dataset.id;
      // Ctrl/Cmd+Enter: split at cursor · Alt+↑/↓: move block
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        splitAt(id, ta.selectionStart);
      } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        move(id, e.key === 'ArrowUp' ? -1 : 1);
        focusBlock(id, ta.selectionStart);
      } else if (e.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0 && idxOf(id) > 0) {
        e.preventDefault();
        mergeUp(id);
      }
    });

    listEl.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('[data-drag]');
      if (h && (e.button === 0 || e.pointerType !== 'mouse')) startDrag(e, h.closest('.bk'));
    });

    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.closest('.bk').dataset.id;
      const b = blocks()[idxOf(id)];
      if (!b) return;
      switch (btn.dataset.act) {
        case 'type':
          b.type = btn.dataset.v;
          if (b.type === 'dialogue' && !b.speaker) b.speaker = (App.state.speakers[0] || {}).id || null;
          break;
        case 'speaker':
          b.speaker = btn.dataset.v;
          b.guessed = false;
          break;
        case 'emph':
          b.emph = !b.emph;
          break;
        case 'hide':
          b.hidden = !b.hidden;
          break;
        case 'more':
          openMenu(id, btn);
          return;
      }
      App.commit({ list: true, immediate: true });
    });

    menu.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (b) menuAction(b.dataset.m);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!menu.el.hidden && !menu.el.contains(e.target) && !e.target.closest('[data-act=more]')) closeMenu();
    });
    $('#panel').addEventListener('scroll', closeMenu, { passive: true });
    window.addEventListener('resize', closeMenu);

    // add buttons
    U.$$('[data-add]').forEach((b) => b.addEventListener('click', () => App.addBlock(b.dataset.add)));

    // format bar — mousedown preventDefault keeps the textarea selection
    const bar = $('#fmtBar');
    bar.addEventListener('mousedown', (e) => e.preventDefault());
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-fmt]');
      if (!b) return;
      const f = b.dataset.fmt;
      if (f === 'mark') wrapSelection('==');
      else if (f === 'bold') wrapSelection('**');
      else if (f === 'under') wrapSelection('__');
      else if (f === 'small') wrapSelection('~~');
      else if (!lastFocus) App.toast('먼저 블록을 선택해 주세요.');
      else if (f === 'split') splitAt(lastFocus.id, lastFocus.start);
      else if (f === 'merge') mergeUp(lastFocus.id);
    });

    $('#btnShowAll').addEventListener('click', () => {
      blocks().forEach((b) => (b.hidden = false));
      App.commit({ list: true, immediate: true });
    });
    $('#btnDropHidden').addEventListener('click', () => {
      const n = blocks().filter((b) => b.hidden).length;
      if (!n) return App.toast('숨긴 블록이 없어요.');
      App.state.blocks = blocks().filter((b) => !b.hidden);
      App.commit({ list: true, immediate: true });
      App.toast(`숨긴 블록 ${n}개를 삭제했어요.`);
    });
    $('#btnClearBlocks').addEventListener('click', () => {
      if (!blocks().length) return;
      if (!confirm('모든 블록을 비울까요? (복원 지점에 보관됩니다)')) return;
      App.addRestorePoint('전체 비우기 전');
      App.state.blocks = [];
      App.commit({ list: true, immediate: true });
    });

    App.on('list', App.renderList);
    App.on('dirty', updateStats);
  };
})();
