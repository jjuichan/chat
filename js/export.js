/* PNG export: same DOM as the preview, fonts embedded as exact subsets */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const { $ } = U;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  // canvas limits: iOS Safari ≈ 16.7M px area; desktop browsers allow far more but cap each side at ~16k–32k
  const MAX_AREA = isIOS ? 16000000 : 100000000;
  const MAX_SIDE = isIOS ? 8192 : 16384;

  App.exportPlan = function () {
    const card = $('#card');
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const want = App.state.export.scale || 2;
    let scale = want;
    scale = Math.min(scale, MAX_SIDE / w, MAX_SIDE / h, Math.sqrt(MAX_AREA / (w * h)));
    scale = Math.max(0.5, Math.floor(scale * 100) / 100);
    return { w, h, want, scale, reduced: scale < want - 0.001, outW: Math.round(w * scale), outH: Math.round(h * scale) };
  };

  function fileName() {
    const custom = ($('#fileName') && $('#fileName').value.trim()) || '';
    const m = App.state.meta;
    const base = custom || [m.title || 'excerpt', (m.date || '').replace(/[^\d]/g, '')].filter(Boolean).join('_');
    return base.replace(/[\\/:*?"<>|]/g, '').slice(0, 80) + '.png';
  }

  async function makeBlob() {
    const card = $('#card');
    const plan = App.exportPlan();
    await document.fonts.ready;
    let fontCSS = '';
    try {
      fontCSS = await App.fonts.embedCSS(card, App.fonts.usedFamilies(App.state.style));
    } catch (e) {
      console.warn(e);
      App.toast('글꼴을 내려받지 못해 기본 글꼴로 저장될 수 있어요 (인터넷 연결 확인).', 'error', 4000);
    }
    card.classList.add('exporting');
    const opts = {
      pixelRatio: plan.scale,
      width: plan.w,
      height: plan.h,
      fontEmbedCSS: fontCSS,
      skipAutoScale: true,
      cacheBust: false,
      style: { boxShadow: 'none', margin: '0' },
    };
    try {
      // Safari sometimes paints web fonts only on the second pass
      if (isSafari) await window.htmlToImage.toCanvas(card, opts);
      const canvas = await window.htmlToImage.toCanvas(card, opts);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('toBlob failed');
      return { blob, plan };
    } finally {
      card.classList.remove('exporting');
    }
  }

  async function withOverlay(msg, fn) {
    const ov = $('#exportOverlay');
    $('#exportMsg').textContent = msg;
    ov.hidden = false;
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      App.toast('이미지를 만들지 못했어요. 해상도를 낮춰 다시 시도해 주세요.', 'error', 4200);
      return null;
    } finally {
      ov.hidden = true;
    }
  }

  App.exportPNG = () =>
    withOverlay('이미지를 만드는 중…', async () => {
      const { blob, plan } = await makeBlob();
      App.download(fileName(), blob);
      App.toast(
        plan.reduced
          ? `저장했어요 · ${plan.outW}×${plan.outH}px (기기 한계로 ${plan.scale.toFixed(2)}배로 조정)`
          : `저장했어요 · ${plan.outW}×${plan.outH}px`,
        'ok',
        3600
      );
    });

  App.copyPNG = () =>
    withOverlay('클립보드에 복사하는 중…', async () => {
      if (!navigator.clipboard || !window.ClipboardItem) return App.toast('이 브라우저는 이미지 복사를 지원하지 않아요.', 'error');
      // Safari requires the ClipboardItem to be created synchronously with a promise
      const item = new ClipboardItem({ 'image/png': makeBlob().then((r) => r.blob) });
      await navigator.clipboard.write([item]);
      App.toast('이미지를 클립보드에 복사했어요.', 'ok');
    });

  App.sharePNG = () =>
    withOverlay('공유할 이미지를 만드는 중…', async () => {
      const { blob } = await makeBlob();
      const file = new File([blob], fileName(), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: App.state.meta.title || 'ずうっといっしょ！' });
        } catch (e) {
          if (e && e.name !== 'AbortError') throw e;
        }
      } else {
        App.download(fileName(), blob);
        App.toast('공유를 지원하지 않아 다운로드했어요.');
      }
    });
})();
