/* Boot: preview stage, zoom, shortcuts */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const { $ } = U;

  let card;
  let zoom = 1;

  App.ensureFonts = function () {
    return App.fonts.ensure(App.fonts.usedFamilies(App.state.style)).then(() => App.emit('resized'));
  };

  /* ---------- preview & zoom ---------- */
  function fitZoom() {
    const scroll = $('#stageScroll');
    const pad = window.innerWidth <= 900 ? 24 : 56;
    const avail = scroll.clientWidth - pad;
    return U.clamp(avail / card.offsetWidth, 0.2, 1);
  }
  function applyZoom() {
    const z = App.ui.zoom === 'fit' ? fitZoom() : App.ui.zoom;
    zoom = z;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    $('#cardScaler').style.transform = `scale(${z})`;
    const sizer = $('#stageSizer');
    sizer.style.width = Math.ceil(w * z) + 'px';
    sizer.style.height = Math.ceil(h * z) + 'px';
    $('#zoomVal').textContent = Math.round(z * 100) + '%';
    updateDims();
  }
  function setZoom(z) {
    App.ui.zoom = z === 'fit' ? 'fit' : U.clamp(Math.round(z * 100) / 100, 0.2, 3);
    App.saveUI();
    applyZoom();
  }
  function updateDims() {
    if (!App.exportPlan) return;
    const p = App.exportPlan();
    const ratio = App.state.style.ratio;
    const minH = ratio !== 'auto' ? parseInt(getComputedStyle(card).minHeight, 10) : 0;
    const grown = minH && p.h > minH + 1;
    $('#dimInfo').innerHTML =
      `<b>${p.w} × ${p.h}</b> → 저장 ${p.outW} × ${p.outH}px` +
      (grown ? ` · <span class="warn">내용이 길어 ${ratio}보다 길어졌어요</span>` : '') +
      (p.reduced ? ` · <span class="warn">${p.scale.toFixed(2)}배로 자동 조정</span>` : '');
    const info = $('#exportInfo');
    if (info)
      info.innerHTML = `미리보기 그대로 저장돼요. 현재 <b>${p.outW} × ${p.outH}px</b>${
        p.reduced ? ` <span class="warn">(기기 한계로 ${p.scale.toFixed(2)}배)</span>` : ''
      }`;
  }

  function render() {
    App.renderCard(card);
    applyZoom();
  }

  function initStage() {
    card = $('#card');
    App.on('render', render);
    App.on('fit', applyZoom);
    App.on('resized', applyZoom);
    App.on('dims', updateDims);
    new ResizeObserver(() => applyZoom()).observe(card);
    new ResizeObserver(() => App.ui.zoom === 'fit' && applyZoom()).observe($('#stageScroll'));

    $('#zoomIn').addEventListener('click', () => setZoom(zoom * 1.15));
    $('#zoomOut').addEventListener('click', () => setZoom(zoom / 1.15));
    $('#zoomFit').addEventListener('click', () => setZoom('fit'));
    $('#zoomVal').addEventListener('click', () => setZoom(App.ui.zoom === 'fit' ? 1 : 'fit'));
    $('#stageScroll').addEventListener(
      'wheel',
      (e) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
      },
      { passive: false }
    );
    // pinch zoom on touch devices
    let pinch = null;
    const sc = $('#stageScroll');
    sc.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 2) {
          const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          pinch = { d, z: zoom };
        }
      },
      { passive: true }
    );
    sc.addEventListener(
      'touchmove',
      (e) => {
        if (!pinch || e.touches.length !== 2) return;
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        setZoom(pinch.z * (d / pinch.d));
      },
      { passive: false }
    );
    sc.addEventListener('touchend', () => (pinch = null));

    // click a paragraph in the preview → jump to its block
    card.addEventListener('click', (e) => {
      const el = e.target.closest('[data-id]');
      if (!el) return;
      if (window.matchMedia('(max-width: 900px)').matches) return;
      App.revealBlock(el.dataset.id);
    });
  }

  /* ---------- top bar ---------- */
  function initTop() {
    const undo = $('#btnUndo');
    const redo = $('#btnRedo');
    const sync = () => {
      undo.disabled = !App.canUndo();
      redo.disabled = !App.canRedo();
    };
    App.on('history', sync);
    undo.addEventListener('click', App.undo);
    redo.addEventListener('click', App.redo);
    sync();

    const ss = $('#saveState');
    App.on('dirty', () => {
      ss.classList.add('dirty');
      ss.querySelector('span').textContent = '저장 중…';
    });
    App.on('saved', (d) => {
      ss.classList.remove('dirty');
      ss.querySelector('span').textContent = `자동 저장됨 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    $('#btnExport').addEventListener('click', () => App.exportPNG());
    $('#btnExport2').addEventListener('click', () => App.exportPNG());
    $('#btnCopyImg').addEventListener('click', () => App.copyPNG());
    $('#btnShare').addEventListener('click', () => App.sharePNG());

    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const inField = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
      if (mod && e.key.toLowerCase() === 'z' && !inField) {
        e.preventDefault();
        e.shiftKey ? App.redo() : App.undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !inField) {
        e.preventDefault();
        App.redo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        App.exportPNG();
      }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    App.load();
    App.initEditor();
    App.initPanels();
    initStage();
    initTop();

    App.setTab(App.ui.tab || 'blocks');
    App.setMobileView(App.ui.mobileView || 'edit');
    App.renderList();
    App.renderSpeakers();
    App.renderPresets();
    App.renderSnapshots();
    App.syncControls();
    render();
    App.snapshotNow();
    App.ensureFonts();
    // re-measure once web fonts settle
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => applyZoom());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
