/* 리츠 노트 — screens and interaction */
(function () {
  'use strict';
  const N = window.Notes;
  const U = N.util;
  const esc = U.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const view = {
    tab: N.CHARS[N.settings.tab] || ['collect', 'logs', 'settings'].includes(N.settings.tab) ? N.settings.tab : 'ritsu',
    filter: 'all',
    q: '',
    editing: null,
    openEv: new Set(),
    target: 'both', // whose facts to collect: 'both' lets Gemini sort them
    pickChar: 'ritsu',
    draftLogId: null, // log saved from the current textarea contents
    review: null, // { logId, charId, items, loading, error }
    readerLogId: null,
    saveFailed: false,
  };

  /* ================= small UI helpers ================= */
  function toast(msg, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'toast' + (opts.err ? ' err' : '');
    el.innerHTML = `<span>${esc(msg)}</span>`;
    if (opts.action) {
      const b = document.createElement('button');
      b.textContent = opts.action.label;
      b.onclick = () => {
        el.remove();
        opts.action.fn();
      };
      el.appendChild(b);
    }
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), opts.ms || (opts.action ? 6000 : opts.err ? 5000 : 2600));
  }

  function openModal(html, bind) {
    $('#modalBox').innerHTML = html;
    $('#modal').hidden = false;
    if (bind) bind($('#modalBox'));
    const first = $('#modalBox').querySelector('textarea, input[type=text]');
    if (first && !first.readOnly) setTimeout(() => first.focus(), 30);
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#modalBox').innerHTML = '';
  }
  $('#modal').addEventListener('mousedown', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  });

  function catOptions(sel, charId) {
    return N.CATS.map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(N.catLabel(c.id, charId))}</option>`).join('');
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    toast('복사했어요');
  }
  function logTitle(id) {
    const l = N.state.logs[id];
    return l ? l.title : null;
  }

  /* ================= tabs ================= */
  function setTab(tab) {
    view.tab = tab;
    N.saveSettings({ tab });
    if (N.CHARS[tab]) {
      view.filter = 'all';
      view.q = '';
      view.editing = null;
    }
    render();
    window.scrollTo({ top: 0 });
  }
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) setTab(b.dataset.tab);
  });

  function render() {
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === view.tab));
    const isChar = !!N.CHARS[view.tab];
    document.body.classList.toggle('char-enju', view.tab === 'enju');
    $$('.page').forEach((p) => p.classList.toggle('on', p.dataset.page === (isChar ? 'profile' : view.tab)));
    if (isChar) renderProfile(view.tab);
    if (view.tab === 'collect') renderCollect();
    if (view.tab === 'logs') renderLogs();
    if (view.tab === 'settings') renderSettings();
    renderBadges();
    renderBanners();
    renderSyncChip();
  }

  function renderBadges() {
    Object.keys(N.CHARS).forEach((id) => {
      const fs = N.facts(id);
      const conflicts = fs.filter((f) => f.conflicts.length).length;
      const fresh = fs.filter((f) => f.fresh).length;
      const el = $(`[data-badge=${id}]`);
      el.hidden = !conflicts && !fresh;
      el.className = 'tab-badge' + (conflicts ? ' warn' : '');
      el.textContent = conflicts ? `⚠${conflicts}` : fresh;
      el.title = conflicts ? `모순 ${conflicts}개` : `새 설정 ${fresh}개`;
    });
  }

  /* ================= profile ================= */
  const STATUS_ORDER = { canon: 0, open: 1, hold: 2 };

  function matchesFilter(f) {
    const v = view.filter;
    if (v === 'canon' || v === 'open' || v === 'hold') {
      if (f.status !== v) return false;
    } else if (v === 'new') {
      if (!f.fresh) return false;
    } else if (v === 'warn') {
      if (!f.conflicts.length) return false;
    }
    if (view.q) {
      const q = view.q.toLowerCase();
      const hay = (f.text + ' ' + f.evidence.map((e) => e.quote).join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function renderProfile(charId) {
    const c = N.CHARS[charId];
    const fs = N.facts(charId);
    const count = (fn) => fs.filter(fn).length;
    const n = {
      all: fs.length,
      canon: count((f) => f.status === 'canon'),
      open: count((f) => f.status === 'open'),
      hold: count((f) => f.status === 'hold'),
      new: count((f) => f.fresh),
      warn: count((f) => f.conflicts.length),
    };
    const logIds = new Set();
    fs.forEach((f) => f.evidence.forEach((e) => e.logId && logIds.add(e.logId)));

    const stat = (key, label, cls) =>
      (key === 'all' || n[key] || view.filter === key)
        ? `<button class="stat ${cls || ''}${view.filter === key ? ' on' : ''}" data-filter="${key}">${label} <b>${n[key]}</b></button>`
        : '';

    const sub =
      charId === 'ritsu'
        ? `대화에서 찾은 설정 · 근거가 된 대화 ${logIds.size}개`
        : `내 자캐 · 직접 적거나 대화에서 모은 설정`;

    let html = `
      <div class="hero">
        <h1>${esc(c.full)}<small>${esc(c.ja)}</small></h1>
        <p class="sub">${sub}</p>
        <div class="stats">
          ${stat('all', '전체')}${stat('canon', '확정')}${stat('open', '미정')}${stat('hold', '보류')}${stat('new', 'NEW', 'new')}${stat('warn', '⚠ 모순', 'warn')}
        </div>
        <div class="btn-row">
          <button class="btn btn-sm" data-act="add"><svg><use href="#i-plus"/></svg>직접 추가</button>
          <button class="btn btn-sm" data-act="summary"><svg><use href="#i-copy"/></svg>채팅용 요약</button>
          ${n.new ? `<button class="btn btn-sm btn-ghost" data-act="seen-all"><svg><use href="#i-check"/></svg>NEW ${n.new}개 모두 확인</button>` : ''}
        </div>
      </div>`;

    // contradictions, one card per pair
    const pairs = [];
    fs.forEach((f) =>
      f.conflicts.forEach((cf) => {
        const o = N.state.facts[cf.id];
        if (o && f.id < o.id) pairs.push([f, o, cf.reason]);
      })
    );
    if (pairs.length) {
      html += `<div class="card conflict-box"><h2 class="card-title"><svg><use href="#i-alert"/></svg>서로 어긋나는 설정 ${pairs.length}쌍</h2>
        <p class="hint">AI 채팅은 설정이 흔들릴 때가 있어요. 맞는 쪽을 고르면 다른 쪽은 보류로 옮겨요.</p>
        ${pairs
          .map(
            ([a, b, reason]) => `
          <div class="pair" data-a="${a.id}" data-b="${b.id}">
            ${reason ? `<p class="pair-reason"><b>어긋나는 점</b> ${esc(reason)}</p>` : ''}
            <div class="pair-sides">
              ${[a, b]
                .map(
                  (f, i) => `<div class="pair-side"><p>${esc(f.text)}</p>
                  <span class="hint">${esc(N.STATUS[f.status])} · ${f.evidence[0] ? esc(logTitle(f.evidence[0].logId) || '삭제된 대화') : '직접 입력'} · ${U.date(f.createdAt)}</span>
                  <button class="btn btn-sm" data-act="pick-side" data-side="${i}"><svg><use href="#i-check"/></svg>이게 맞아요</button></div>`
                )
                .join('')}
            </div>
            <div class="btn-row"><button class="btn btn-sm btn-ghost" data-act="both-ok">둘 다 맞아요 (모순 아님)</button></div>
          </div>`
          )
          .join('')}
      </div>`;
    }

    if (!fs.length) {
      html += `<div class="empty"><b>아직 모인 ${esc(c.name)} 설정이 없어요</b>
        ${charId === 'ritsu' ? '대화를 붙여넣으면 AI가 설정을 골라 줘요.' : '엔쥬는 내 자캐니까 직접 적어도 좋아요.'}
        <div class="btn-row">
          <button class="btn btn-brand" data-act="go-collect"><svg><use href="#i-wand"/></svg>대화에서 수집하기</button>
          <button class="btn" data-act="add"><svg><use href="#i-plus"/></svg>직접 추가</button>
        </div></div>`;
      $('#profilePage').innerHTML = html;
      return;
    }

    html += `<div class="toolbar"><label class="search"><svg><use href="#i-search"/></svg>
      <input type="search" id="factSearch" placeholder="설정이나 근거 대사에서 찾기" value="${esc(view.q)}" /></label></div>
      <div id="factList"></div>`;
    $('#profilePage').innerHTML = html;
    renderFactList(charId);
  }

  function renderFactList(charId) {
    const box = $('#factList');
    if (!box) return;
    const fs = N.facts(charId).filter(matchesFilter);
    const narrowed = view.filter !== 'all' || view.q;
    let html = '';
    N.CATS.forEach((cat) => {
      const list = fs
        .filter((f) => f.cat === cat.id)
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || a.createdAt - b.createdAt);
      if (!list.length && narrowed) return;
      // the 🔞 section stays folded until asked, so a glance at the screen doesn't show it
      const veiled = cat.id === 'adult' && !N.settings.showAdult;
      const veil = cat.id === 'adult'
        ? `<button class="btn btn-sm btn-ghost veil-btn" data-act="toggle-adult">${veiled ? '보이기' : '가리기'}</button>`
        : '';
      const body = veiled
        ? `<p class="empty-cat">${list.length ? `가려진 설정 ${list.length}개 · ‘보이기’를 누르면 펼쳐져요` : esc(cat.hint)}</p>`
        : list.length
          ? list.map(factCard).join('')
          : `<p class="empty-cat">${cat.hint ? esc(cat.hint) : '아직 없음'}</p>`;
      html += `<section class="cat${cat.id === 'adult' ? ' cat-adult' : ''}" data-cat="${cat.id}">
        <div class="cat-head"><h3>${esc(N.catLabel(cat.id, charId))}</h3><span class="count">${list.length || ''}</span>${veil}
          <button class="icon-btn" data-act="add" data-cat="${cat.id}" title="이 카테고리에 추가" aria-label="이 카테고리에 추가"><svg><use href="#i-plus"/></svg></button></div>
        ${body}
      </section>`;
    });
    box.innerHTML = html || `<div class="empty"><b>조건에 맞는 설정이 없어요</b></div>`;
  }

  function factCard(f) {
    if (view.editing === f.id) {
      return `<article class="fact fact-edit" data-id="${f.id}">
        <textarea data-field="text">${esc(f.text)}</textarea>
        <div class="input-row">
          <select data-field="cat">${catOptions(f.cat, f.char)}</select>
          <select data-field="char">${Object.values(N.CHARS).map((c) => `<option value="${c.id}"${c.id === f.char ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
          <button class="btn btn-sm btn-ghost" data-act="edit-cancel">취소</button>
          <button class="btn btn-sm btn-primary" data-act="edit-save"><svg><use href="#i-check"/></svg>저장</button>
        </div>
      </article>`;
    }
    const ev = f.evidence;
    const open = view.openEv.has(f.id);
    const badges = [
      f.fresh ? `<button class="badge new" data-act="seen" title="확인 표시">NEW</button>` : '',
      f.conflicts.length ? `<button class="badge warn" data-act="to-conflict"><svg><use href="#i-alert"/></svg>모순</button>` : '',
      f.seen ? `<span class="badge seen" title="다른 대화에서 다시 확인된 횟수">재확인 ×${f.seen}</span>` : '',
      ev.length ? `<button class="badge" data-act="toggle-ev"><svg><use href="#i-quote"/></svg>근거 ${ev.length}</button>` : `<span class="badge">직접 입력</span>`,
    ].join('');
    const seg = Object.keys(N.STATUS)
      .map((s) => `<button data-act="status" data-value="${s}"${f.status === s ? ' class="on"' : ''}>${N.STATUS[s]}</button>`)
      .join('');
    const evidence = open && ev.length
      ? `<div class="evidence">${ev
          .map((e) => {
            const title = logTitle(e.logId);
            return `<div><blockquote class="quote">${esc(e.quote)}</blockquote>
              <div class="quote-src"><span>${esc(title || (e.logId ? '삭제된 대화' : '직접 입력'))} · ${U.date(e.at)}</span>
              ${title ? `<button data-act="open-log" data-log="${e.logId}" data-quote="${esc(e.quote)}">대화에서 보기</button>` : ''}</div></div>`;
          })
          .join('')}</div>`
      : '';
    return `<article class="fact ${f.status}" data-id="${f.id}">
      <div class="fact-top"><p class="fact-text">${esc(f.text)}</p>
        <div class="fact-tools">
          <button class="icon-btn" data-act="edit" title="수정" aria-label="수정"><svg><use href="#i-edit"/></svg></button>
          <button class="icon-btn" data-act="delete" title="삭제" aria-label="삭제"><svg><use href="#i-trash"/></svg></button>
        </div></div>
      <div class="fact-meta">${badges}<div class="seg">${seg}</div></div>
      ${evidence}
    </article>`;
  }

  $('#profilePage').addEventListener('input', (e) => {
    if (e.target.id === 'factSearch') {
      view.q = e.target.value.trim();
      renderFactList(view.tab);
    }
  });

  $('#profilePage').addEventListener('click', (e) => {
    const charId = view.tab;
    const fl = e.target.closest('[data-filter]');
    if (fl) {
      view.filter = view.filter === fl.dataset.filter ? 'all' : fl.dataset.filter;
      return renderProfile(charId);
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const card = b.closest('.fact');
    const id = card && card.dataset.id;
    const pair = b.closest('.pair');

    if (act === 'add') return addFactModal(charId, b.dataset.cat);
    if (act === 'toggle-adult') {
      N.saveSettings({ showAdult: !N.settings.showAdult });
      return renderFactList(charId);
    }
    if (act === 'summary') return summaryModal(charId);
    if (act === 'go-collect') {
      view.target = charId;
      return setTab('collect');
    }
    if (act === 'seen-all') {
      return N.commit((s) => N.facts(charId).forEach((f) => f.fresh && N.patchFact(s, f.id, { fresh: false })));
    }
    if (act === 'seen') return N.commit((s) => N.patchFact(s, id, { fresh: false }));
    if (act === 'status') return N.commit((s) => N.patchFact(s, id, { status: b.dataset.value, fresh: false }));
    if (act === 'toggle-ev') {
      view.openEv.has(id) ? view.openEv.delete(id) : view.openEv.add(id);
      return renderFactList(charId);
    }
    if (act === 'to-conflict') {
      const box = $('.conflict-box');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (act === 'edit') {
      view.editing = id;
      renderFactList(charId);
      const t = $(`.fact[data-id="${id}"] textarea`);
      if (t) {
        t.focus();
        t.setSelectionRange(t.value.length, t.value.length);
      }
      return;
    }
    if (act === 'edit-cancel') {
      view.editing = null;
      return renderFactList(charId);
    }
    if (act === 'edit-save') {
      const text = $('[data-field=text]', card).value.trim();
      if (!text) return toast('내용을 적어 주세요', { err: true });
      const cat = $('[data-field=cat]', card).value;
      const ch = $('[data-field=char]', card).value;
      view.editing = null;
      N.commit((s) => N.patchFact(s, id, { text, cat, char: ch, fresh: false }));
      if (ch !== charId) toast(`${N.CHARS[ch].name} 쪽으로 옮겼어요`);
      return;
    }
    if (act === 'delete') return deleteFact(id);
    if (act === 'open-log') return openReader(b.dataset.log, b.dataset.quote);
    if (pair) {
      const a = pair.dataset.a;
      const bb = pair.dataset.b;
      if (act === 'both-ok') return N.commit((s) => N.unlinkConflict(s, a, bb));
      if (act === 'pick-side') {
        const keep = b.dataset.side === '0' ? a : bb;
        const drop = keep === a ? bb : a;
        N.commit((s) => {
          N.unlinkConflict(s, a, bb);
          N.patchFact(s, keep, { status: 'canon', fresh: false });
          N.patchFact(s, drop, { status: 'hold', fresh: false });
        });
        toast('맞는 쪽은 확정, 다른 쪽은 보류로 옮겼어요');
      }
    }
  });

  $('#profilePage').addEventListener('keydown', (e) => {
    if (e.target.matches('.fact-edit textarea') && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      $('[data-act=edit-save]', e.target.closest('.fact')).click();
    }
  });

  function deleteFact(id) {
    const backup = JSON.parse(JSON.stringify(N.state.facts[id]));
    N.commit((s) => N.removeFact(s, id));
    toast('삭제했어요', {
      action: {
        label: '되돌리기',
        fn: () =>
          N.commit((s) => {
            delete s.tomb[id];
            backup.conflicts = backup.conflicts.filter((c) => s.facts[c.id]);
            backup.updatedAt = Date.now();
            s.facts[id] = backup;
            backup.conflicts.forEach((c) => N.linkConflict(s, id, c.id, c.reason));
          }),
      },
    });
  }

  function flashFact(id) {
    requestAnimationFrame(() => {
      const el = $(`.fact[data-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1500);
    });
  }
  function goToFact(id) {
    const f = N.state.facts[id];
    if (!f) return;
    view.tab = f.char;
    view.filter = 'all';
    view.q = '';
    N.saveSettings({ tab: f.char });
    render();
    flashFact(id);
  }

  function addFactModal(charId, cat) {
    const c = N.CHARS[charId];
    openModal(
      `<h2>${esc(c.name)} 설정 직접 추가</h2>
      <p class="hint">짧게 적을수록 나중에 보기 좋아요. 예: “단 음식을 싫어함”</p>
      <label class="field"><span class="lbl">설정</span><textarea id="mText" style="min-height:80px"></textarea></label>
      <label class="field"><span class="lbl">카테고리</span><select id="mCat">${catOptions(cat || 'etc', charId)}</select></label>
      <label class="field"><span class="lbl">근거 대사 <em class="hint">선택</em></span><textarea id="mQuote" style="min-height:70px" placeholder="이 설정이 나온 대사를 붙여넣어 두면 나중에 확인하기 쉬워요"></textarea></label>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>취소</button><button class="btn btn-primary" id="mSave"><svg><use href="#i-check"/></svg>추가</button></div>`,
      (box) => {
        $('[data-close]', box).onclick = closeModal;
        $('#mSave', box).onclick = () => {
          const text = $('#mText', box).value.trim();
          if (!text) return toast('내용을 적어 주세요', { err: true });
          const quote = $('#mQuote', box).value.trim();
          let f;
          N.commit((s) => {
            f = N.addFact(s, {
              char: charId,
              cat: $('#mCat', box).value,
              text,
              status: 'canon',
              fresh: false,
              evidence: quote ? [{ id: U.uid(), quote, logId: null, at: Date.now() }] : [],
            });
          });
          closeModal();
          if (view.tab !== charId) setTab(charId);
          flashFact(f.id);
        };
      }
    );
  }

  /* ---------- summary for the chat app's memory box ---------- */
  function buildSummary(charId, includeOpen, includeAdult) {
    const c = N.CHARS[charId];
    const fs = N.facts(charId).filter(
      (f) => (f.status === 'canon' || (includeOpen && f.status === 'open')) && (includeAdult || f.cat !== 'adult')
    );
    const lines = [`[${c.full} 설정]`];
    N.CATS.forEach((cat) => {
      const items = fs.filter((f) => f.cat === cat.id).map((f) => f.text.replace(/\s*\n\s*/g, ' '));
      if (items.length) lines.push(`${N.catLabel(cat.id, charId)}: ${items.join(' / ')}`);
    });
    return { text: lines.length > 1 ? lines.join('\n') : '', count: fs.length };
  }

  function summaryModal(charId) {
    const c = N.CHARS[charId];
    const hasCanon = N.facts(charId).some((f) => f.status === 'canon');
    let includeOpen = !hasCanon;
    openModal(
      `<h2>${esc(c.name)} 채팅용 요약</h2>
      <p class="hint">AI 채팅의 메모리나 설정란에 그대로 붙여넣으세요. 기본은 <b>확정</b>한 설정만 들어가요. 직접 고쳐서 복사해도 돼요.</p>
      <div class="modal-opts">
        <label class="check"><input type="checkbox" id="sOpen"${includeOpen ? ' checked' : ''} /><span>미정도 포함</span></label>
        <label class="check"><input type="checkbox" id="sAdult" /><span>🔞 포함</span></label>
        <span class="hint" id="sCount"></span>
      </div>
      <textarea id="sText"></textarea>
      <div class="modal-opts">
        <label class="check">AI로 <input type="text" id="sLimit" inputmode="numeric" value="${esc(localStorage.getItem('ritsu-notes:sumlimit') || '500')}" />자 이내로</label>
        <button class="btn btn-sm" id="sCompress"><svg><use href="#i-wand"/></svg>압축하기</button>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>닫기</button><button class="btn btn-primary" id="sCopy"><svg><use href="#i-copy"/></svg>복사</button></div>`,
      (box) => {
        const ta = $('#sText', box);
        const fill = () => {
          const r = buildSummary(charId, includeOpen, $('#sAdult', box).checked);
          ta.value = r.text || '(아직 넣을 설정이 없어요. 프로필에서 설정을 ‘확정’하거나 ‘미정도 포함’을 켜 주세요.)';
          count();
        };
        const count = () => ($('#sCount', box).textContent = `${ta.value.length}자`);
        ta.addEventListener('input', count);
        $('#sOpen', box).onchange = (e) => {
          includeOpen = e.target.checked;
          fill();
        };
        $('#sAdult', box).onchange = fill;
        $('[data-close]', box).onclick = closeModal;
        $('#sCopy', box).onclick = () => copyText(ta.value);
        $('#sCompress', box).onclick = async (e) => {
          const limit = Math.max(50, parseInt($('#sLimit', box).value, 10) || 500);
          localStorage.setItem('ritsu-notes:sumlimit', String(limit));
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.innerHTML = '<i class="spin"></i>압축 중';
          try {
            ta.value = await N.gemini.compress(ta.value, limit, charId);
            count();
          } catch (err) {
            toast(err.message, { err: true });
          } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg><use href="#i-wand"/></svg>압축하기';
          }
        };
        fill();
      }
    );
  }

  /* ================= collect ================= */
  const logInput = $('#logInput');
  const logTitleInput = $('#logTitle');

  function renderCollect() {
    $$('#targetSeg button').forEach((b) => b.classList.toggle('on', b.dataset.value === view.target));
    $('#logCount').textContent = `${logInput.value.length.toLocaleString()}자`;
    $('#privateRow').hidden = !N.gemini.hasKey('paid');
    renderReview();
    renderReader();
  }

  $('#targetSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    view.target = b.dataset.value;
    if (N.CHARS[view.target]) view.pickChar = view.target;
    renderCollect();
  });
  logInput.addEventListener('input', () => {
    // new text = a new log; don't let the previous log's title carry over
    if (view.draftLogId) logTitleInput.value = '';
    view.draftLogId = null;
    $('#logCount').textContent = `${logInput.value.length.toLocaleString()}자`;
  });
  logTitleInput.addEventListener('input', () => {
    if (view.draftLogId && N.state.logs[view.draftLogId]) {
      const t = logTitleInput.value.trim();
      if (t) N.commit((s) => Object.assign(s.logs[view.draftLogId], { title: t, updatedAt: Date.now() }), { quiet: true });
    }
  });

  // Save the textarea as a log (once per distinct text) and return its id.
  function saveDraftLog() {
    const text = logInput.value.trim();
    if (!text) {
      toast('먼저 대화를 붙여넣어 주세요', { err: true });
      return null;
    }
    const priv = N.gemini.hasKey('paid') && $('#optPrivate').checked;
    const existing = (view.draftLogId && N.state.logs[view.draftLogId]) || Object.values(N.state.logs).find((l) => l.text === text);
    if (existing) {
      if (!!existing.private !== priv) N.commit((s) => Object.assign(s.logs[existing.id], { private: priv, updatedAt: Date.now() }), { quiet: true });
      return (view.draftLogId = existing.id);
    }
    const now = Date.now();
    const d = new Date();
    const id = U.uid();
    const title = logTitleInput.value.trim() || `${U.date(now)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 대화`;
    N.commit((s) => {
      s.logs[id] = { id, title, text, private: priv, createdAt: now, updatedAt: now, extractedAt: 0 };
    });
    view.draftLogId = id;
    return id;
  }

  $('#btnExtract').addEventListener('click', () => {
    const id = saveDraftLog();
    if (id) runExtract(id, view.target);
  });
  $('#btnReadOnly').addEventListener('click', () => {
    const id = saveDraftLog();
    if (id) openReader(id);
  });

  // Split text into pieces of about `size` characters, cutting at blank lines, then
  // line breaks, then spaces, so a piece rarely ends mid-sentence. Returns [{s, e}].
  function chunkText(text, size) {
    const out = [];
    let s = 0;
    while (s < text.length) {
      let e = Math.min(text.length, s + size);
      if (e < text.length) {
        const win = text.slice(s, e);
        const cut = [/\n\s*\n(?![\s\S]*\n\s*\n)/, /\n(?![\s\S]*\n)/, /\s(?![\s\S]*\s)/]
          .map((re) => {
            const m = re.exec(win);
            return m && m.index > size * 0.4 ? m.index + m[0].length : -1;
          })
          .find((i) => i > 0);
        if (cut) e = s + cut;
      }
      out.push({ s, e });
      s = e;
    }
    return out;
  }

  const CHUNK = 3000; // characters per piece after a refusal
  const SUBCHUNK = 900; // a refused piece is tried once more in smaller bits

  async function runExtract(logId, charId) {
    const log = N.state.logs[logId];
    if (!log) return;
    const keys = log.private ? 'paid' : 'auto';
    if (keys === 'paid' ? !N.gemini.hasKey('paid') : !N.gemini.hasKey('free') && !N.gemini.hasKey('paid')) {
      toast(keys === 'paid' ? '🔒 대화라서 유료 키가 필요해요' : 'Gemini API 키가 필요해요', { err: true, action: { label: '설정으로', fn: () => setTab('settings') } });
      return;
    }
    const r = (view.review = { logId, charId, items: [], loading: true, error: '', keyUsed: null, progress: null, blocked: [], cancel: false });
    if (view.tab !== 'collect') setTab('collect');
    else renderReview();
    $('#reviewCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    const alive = () => view.review === r && !r.cancel;
    const used = new Set();
    const run = async (s, e) => {
      const items = await N.gemini.extract(log.text.slice(s, e), charId, keys);
      used.add(N.gemini.lastKey);
      return items;
    };

    try {
      try {
        r.items = await run(0, log.text.length);
      } catch (e) {
        if (!e.blocked && !e.tooLong) throw e;
        // Refused or too long: go piece by piece and keep whatever gets through.
        const pieces = chunkText(log.text, CHUNK);
        const found = [];
        for (let i = 0; i < pieces.length && alive(); i++) {
          r.progress = { at: i + 1, of: pieces.length };
          renderReview();
          const p = pieces[i];
          try {
            found.push(...(await run(p.s, p.e)));
          } catch (err) {
            if (!err.blocked && !err.tooLong) throw err;
            for (const sub of chunkText(log.text.slice(p.s, p.e), SUBCHUNK)) {
              if (!alive()) break;
              try {
                found.push(...(await run(p.s + sub.s, p.s + sub.e)));
              } catch (err2) {
                if (!err2.blocked && !err2.tooLong) throw err2;
                r.blocked.push({ s: p.s + sub.s, e: p.s + sub.e });
              }
            }
          }
        }
        // the same fact can come back from several pieces
        const seen = new Set();
        r.items = found.filter((it) => {
          const k = it.relation === 'same' ? 'same:' + it.relatedId : it.char + ':' + U.norm(it.text);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        r.chunked = pieces.length;
      }
      if (view.review !== r) return;
      // remember which parts Gemini refused, so the reader can shade them
      const blocked = mergeRanges(r.blocked);
      if (JSON.stringify(blocked) !== JSON.stringify(log.blocked || []))
        N.commit((s) => s.logs[logId] && Object.assign(s.logs[logId], { blocked, updatedAt: Date.now() }), { quiet: true });
      r.items.forEach((it) => (it.on = true));
      r.keyUsed = used.has('fallback') ? 'fallback' : used.has('paid') ? 'paid' : 'free';
      if (used.has('fallback')) toast('무료 한도가 차서 유료 키로 처리한 부분이 있어요', { ms: 5000 });
    } catch (e) {
      if (view.review === r) r.error = e.message;
    }
    if (view.review !== r) return;
    r.loading = false;
    r.progress = null;
    renderReview();
  }

  function mergeRanges(list) {
    const out = [];
    list
      .slice()
      .sort((a, b) => a.s - b.s)
      .forEach((x) => {
        const last = out[out.length - 1];
        if (last && x.s <= last.e) last.e = Math.max(last.e, x.e);
        else out.push({ s: x.s, e: x.e });
      });
    return out;
  }

  function renderReview() {
    const card = $('#reviewCard');
    const r = view.review;
    if (!r) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const c = { name: targetName(r.charId) };
    const title = esc(logTitle(r.logId) || '');
    if (r.loading) {
      card.innerHTML = r.progress
        ? `<h2 class="card-title">${esc(c.name)} 설정 찾는 중… (${r.progress.at}/${r.progress.of})</h2>
          <div class="loading"><i class="spin"></i>한 번에는 처리되지 않아서 조각으로 나눠 읽고 있어요. 막히는 조각은 건너뛰고, 나중에 직접 고를 수 있게 표시해 둘게요.</div>
          <div class="progress"><i style="width:${Math.round((r.progress.at / r.progress.of) * 100)}%"></i></div>
          <div class="btn-row"><button class="btn btn-sm btn-ghost" data-act="stop">여기까지만</button></div>`
        : `<h2 class="card-title">${esc(c.name)} 설정 찾는 중…</h2><div class="loading"><i class="spin"></i>Gemini가 「${title}」을 읽고 있어요. 긴 대화는 30초쯤 걸릴 수 있어요.</div>`;
      return;
    }
    if (r.error) {
      card.innerHTML = `<h2 class="card-title">설정을 뽑지 못했어요</h2><p class="lead">${esc(r.error)}</p>
        <div class="btn-row"><button class="btn" data-act="retry"><svg><use href="#i-sync"/></svg>다시 시도</button>
        <button class="btn btn-ghost" data-act="close-review">닫기</button></div>`;
      return;
    }
    const blockedNote = r.blocked.length
      ? `<div class="notice"><svg><use href="#i-alert"/></svg><p>Gemini가 처리하지 않은 부분이 <b>${r.blocked.length}곳</b> 있어요. 대화 읽기 화면에 빗금으로 표시해 뒀으니, 거기서 직접 골라 주세요.</p>
          <button class="btn btn-sm" data-act="read-blocked"><svg><use href="#i-book"/></svg>그 부분 보기</button></div>`
      : '';
    if (!r.items.length) {
      card.innerHTML = blockedNote + `<h2 class="card-title">새로 찾은 설정이 없어요</h2><p class="lead">이 대화에서는 ${esc(c.name)}의 설정이 될 만한 내용을 찾지 못했어요. 직접 읽으면서 골라 볼까요?</p>
        <div class="btn-row"><button class="btn" data-act="read"><svg><use href="#i-book"/></svg>읽으면서 직접 고르기</button>
        <button class="btn btn-ghost" data-act="close-review">닫기</button></div>`;
      return;
    }
    const on = r.items.filter((i) => i.on).length;
    const kinds = { new: 0, same: 0, conflict: 0 };
    r.items.forEach((i) => kinds[i.relation]++);
    const per = Object.keys(N.CHARS)
      .map((id) => [id, r.items.filter((i) => i.char === id).length])
      .filter(([, n]) => n);
    const perText = per.length > 1 ? ` <small class="hint">(${per.map(([id, n]) => `${N.CHARS[id].name} ${n}`).join(' · ')})</small>` : '';
    card.innerHTML = `
      <div class="review-head">
        <div><h2 class="card-title">${esc(c.name)} 설정 후보 ${r.items.length}개${perText}</h2>
        <span class="hint">✨ 새 설정 ${kinds.new} · 재확인 ${kinds.same} · ⚠ 모순 ${kinds.conflict} — 「${title}」 · ${keyLabel(r.keyUsed)}</span></div>
        <button class="btn btn-sm btn-ghost" data-act="toggle-all">${on === r.items.length ? '모두 해제' : '모두 선택'}</button>
      </div>
      ${blockedNote}
      ${r.items.map((it) => candCard(it)).join('')}
      <div class="review-foot">
        <button class="btn btn-ghost" data-act="close-review">버리기</button>
        <button class="btn" data-act="read"><svg><use href="#i-book"/></svg>대화 읽으며 더 고르기</button>
        <button class="btn btn-brand" data-act="save-review"${on ? '' : ' disabled'}><svg><use href="#i-check"/></svg>선택한 ${on}개 저장</button>
      </div>`;
  }

  const targetName = (t) => (N.CHARS[t] ? N.CHARS[t].name : '리츠·엔쥬');

  function keyLabel(k) {
    return { free: '무료 키 사용', paid: '🔒 유료 키 사용', fallback: '무료 한도 초과 → 유료 키 사용' }[k] || '';
  }

  function candCard(it) {
    const charId = it.char;
    const rel = it.relatedId && N.state.facts[it.relatedId];
    // whose fact this is — Gemini's guess, one tap to correct
    const whose = `<div class="seg seg-sm who" title="누구 설정인지">${Object.values(N.CHARS)
      .map((c) => `<button data-act="set-char" data-value="${c.id}" class="w-${c.id}${c.id === charId ? ' on' : ''}">${esc(c.name)}</button>`)
      .join('')}</div>`;
    let relHtml = `<span class="badge new">✨ 새 설정</span>`;
    if (it.relation === 'same' && rel) relHtml = `<span class="badge seen">재확인</span><span>이미 있는 설정: <b>${esc(rel.text)}</b> — 근거만 추가돼요</span>`;
    if (it.relation === 'conflict' && rel)
      relHtml = `<span class="badge warn"><svg><use href="#i-alert"/></svg>모순</span><span>기존: <b>${esc(rel.text)}</b>${it.reason ? ` — ${esc(it.reason)}` : ''}</span>`;
    const editable = it.relation !== 'same';
    return `<div class="cand${it.on ? '' : ' off'}" data-key="${it.key}">
      <input type="checkbox" class="check" data-act="toggle"${it.on ? ' checked' : ''} aria-label="저장할지 선택" />
      <div class="cand-body">
        ${editable ? `<div class="cand-row"><input type="text" data-field="text" value="${esc(it.text)}" /><select data-field="cat">${catOptions(it.cat, charId)}</select></div>` : ''}
        <div class="cand-rel">${whose}${relHtml}</div>
        ${it.quote ? `<blockquote class="quote">${esc(it.quote)}</blockquote>` : ''}
        ${it.quote && !it.quoteFound ? `<span class="badge warn"><svg><use href="#i-alert"/></svg>원문에서 이 대사를 못 찾았어요 — AI가 지어냈을 수 있으니 확인해 주세요</span>` : ''}
      </div>
    </div>`;
  }

  $('#reviewCard').addEventListener('input', (e) => {
    const card = e.target.closest('.cand');
    if (!card || !view.review) return;
    const it = view.review.items.find((i) => i.key === card.dataset.key);
    if (it && e.target.dataset.field) it[e.target.dataset.field === 'cat' ? 'cat' : 'text'] = e.target.value;
  });
  $('#reviewCard').addEventListener('change', (e) => {
    const card = e.target.closest('.cand');
    if (!card || !view.review) return;
    const it = view.review.items.find((i) => i.key === card.dataset.key);
    if (!it) return;
    if (e.target.dataset.act === 'toggle') {
      it.on = e.target.checked;
      renderReview();
    } else if (e.target.dataset.field === 'cat') it.cat = e.target.value;
  });
  $('#reviewCard').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    const r = view.review;
    if (!b || !r) return;
    const act = b.dataset.act;
    if (act === 'close-review') {
      view.review = null;
      return renderReview();
    }
    if (act === 'retry') return runExtract(r.logId, r.charId);
    if (act === 'set-char') {
      const it = r.items.find((i) => i.key === b.closest('.cand').dataset.key);
      if (!it || it.char === b.dataset.value) return;
      it.char = b.dataset.value;
      // a match against the other person's fact no longer applies
      const rel = it.relatedId && N.state.facts[it.relatedId];
      if (rel && rel.char !== it.char) {
        if (it.relation === 'same') it.text = it.text || rel.text;
        it.relation = 'new';
        it.relatedId = null;
      }
      return renderReview();
    }
    if (act === 'read') return openReader(r.logId);
    if (act === 'read-blocked') return openReader(r.logId, null, true);
    if (act === 'stop') {
      r.cancel = true;
      b.disabled = true;
      b.textContent = '마무리하는 중…';
      return;
    }
    if (act === 'toggle-all') {
      const all = r.items.every((i) => i.on);
      r.items.forEach((i) => (i.on = !all));
      return renderReview();
    }
    if (act === 'save-review') saveReview();
  });

  function saveReview() {
    const r = view.review;
    const chosen = r.items.filter((i) => i.on && (i.relation === 'same' || i.text.trim()));
    let added = 0;
    let again = 0;
    let conflicts = 0;
    const now = Date.now();
    N.commit((s) => {
      chosen.forEach((it) => {
        const ev = it.quote ? [{ id: U.uid(), quote: it.quote, logId: r.logId, at: now }] : [];
        const rel = it.relatedId && s.facts[it.relatedId];
        if (it.relation === 'same' && rel) {
          const dup = rel.evidence.some((e) => U.norm(e.quote) === U.norm(it.quote));
          N.patchFact(s, rel.id, { seen: (rel.seen || 0) + 1, evidence: dup ? rel.evidence : rel.evidence.concat(ev) });
          again++;
          return;
        }
        const f = N.addFact(s, { char: it.char, cat: it.cat, text: it.text.trim(), status: 'open', fresh: true, src: 'ai', evidence: ev });
        if (it.relation === 'conflict' && rel) {
          N.linkConflict(s, f.id, rel.id, it.reason);
          conflicts++;
        } else added++;
      });
      if (s.logs[r.logId]) Object.assign(s.logs[r.logId], { extractedAt: now, updatedAt: now });
    });
    const savedFor = chosen.map((i) => i.char);
    const charId = savedFor.includes('ritsu') ? 'ritsu' : savedFor[0] || 'ritsu';
    view.review = null;
    renderReview();
    const parts = [];
    if (added) parts.push(`새 설정 ${added}개`);
    if (again) parts.push(`재확인 ${again}개`);
    if (conflicts) parts.push(`모순 ${conflicts}개`);
    toast(parts.length ? `${parts.join(' · ')} 저장했어요` : '저장할 항목이 없었어요', {
      action: parts.length ? { label: `${N.CHARS[charId].name} 보기`, fn: () => setTab(charId) } : null,
    });
    if (view.readerLogId) renderReader();
  }

  /* ---------- reader: pick facts by selecting text ---------- */
  // quote: scroll to where this quote is used. toBlocked: scroll to the first part Gemini refused.
  function openReader(logId, quote, toBlocked) {
    const log = N.state.logs[logId];
    if (!log) return toast('이 대화는 삭제됐어요', { err: true });
    view.readerLogId = logId;
    if (view.tab !== 'collect') setTab('collect');
    else renderReader();
    requestAnimationFrame(() => {
      let target = $('#readerCard');
      if (toBlocked) target = $('#reader .blk') || target;
      else if (quote) {
        const at = log.text.indexOf(quote);
        const m = at >= 0 && $$('#reader mark[data-s]').find((x) => +x.dataset.s >= at && +x.dataset.s < at + quote.length);
        if (m) target = m;
      }
      target.scrollIntoView({ behavior: 'smooth', block: target.id === 'readerCard' ? 'start' : 'center' });
    });
  }

  function renderReader() {
    const card = $('#readerCard');
    const log = view.readerLogId && N.state.logs[view.readerLogId];
    if (!log) {
      card.hidden = true;
      hidePickbar();
      return;
    }
    card.hidden = false;
    $('#readerTitle').textContent = log.title;
    const text = log.text;
    // quotes already used as evidence from this log (overlaps: the first one wins)
    const found = [];
    Object.values(N.state.facts).forEach((f) =>
      f.evidence.forEach((e) => {
        if (e.logId !== log.id || !e.quote) return;
        const at = text.indexOf(e.quote);
        if (at >= 0) found.push({ s: at, e: at + e.quote.length, id: f.id, char: f.char });
      })
    );
    found.sort((a, b) => a.s - b.s || b.e - a.e);
    const marks = [];
    found.forEach((r) => {
      if (!marks.length || r.s >= marks[marks.length - 1].e) marks.push(r);
    });
    const blocked = log.blocked || [];
    // cut the text wherever a highlight or a refused part starts or ends
    const cuts = new Set([0, text.length]);
    marks.concat(blocked).forEach((r) => {
      cuts.add(Math.max(0, Math.min(text.length, r.s)));
      cuts.add(Math.max(0, Math.min(text.length, r.e)));
    });
    const pts = Array.from(cuts).sort((a, b) => a - b);
    let html = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      let seg = esc(text.slice(a, b));
      const m = marks.find((r) => r.s <= a && b <= r.e);
      if (m) seg = `<mark class="${m.char === 'enju' ? 'e' : 'r'}" data-fact="${m.id}" data-s="${a}" title="저장된 설정으로 가기">${seg}</mark>`;
      if (blocked.some((r) => r.s <= a && b <= r.e)) seg = `<span class="blk" title="Gemini가 처리하지 않은 부분 — 직접 골라 주세요">${seg}</span>`;
      html += seg;
    }
    $('#reader').innerHTML = html;
    $('#readerBlockedHint').hidden = !blocked.length;
  }
  $('#btnCloseReader').addEventListener('click', () => {
    view.readerLogId = null;
    renderReader();
  });
  $('#reader').addEventListener('click', (e) => {
    const m = e.target.closest('mark[data-fact]');
    if (m && String(window.getSelection()).trim() === '') goToFact(m.dataset.fact);
  });

  let picked = '';
  let holdUntil = 0; // tapping the bar clears the selection on phones; don't hide it for that
  $('#pickbar').addEventListener('pointerdown', () => (holdUntil = Date.now() + 1000));
  function hidePickbar() {
    $('#pickbar').hidden = true;
    document.body.classList.remove('picking');
  }
  function renderPickbar() {
    $$('#pickChar button').forEach((b) => b.classList.toggle('on', b.dataset.value === view.pickChar));
    $('#pickCats').innerHTML = N.CATS.map((c) => `<button data-cat="${c.id}">${esc(N.catLabel(c.id, view.pickChar))}</button>`).join('');
  }
  const onSelection = U.debounce(() => {
    const sel = window.getSelection();
    const reader = $('#reader');
    if (!sel || sel.isCollapsed || !reader || !reader.contains(sel.anchorNode) || !reader.contains(sel.focusNode)) {
      if (Date.now() > holdUntil) hidePickbar();
      return;
    }
    const t = sel.toString().trim();
    if (t.length < 2) return hidePickbar();
    picked = t;
    $('#pickPreview').textContent = `“${t.replace(/\s+/g, ' ')}”`;
    renderPickbar();
    $('#pickbar').hidden = false;
    document.body.classList.add('picking');
  }, 120);
  document.addEventListener('selectionchange', onSelection);

  $('#pickChar').addEventListener('mousedown', (e) => e.preventDefault());
  $('#pickCats').addEventListener('mousedown', (e) => e.preventDefault());
  $('#pickChar').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    view.pickChar = b.dataset.value;
    renderPickbar();
  });
  $('#pickCats').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (!b || !picked || !view.readerLogId) return;
    const quote = picked;
    const charId = view.pickChar;
    let f;
    N.commit((s) => {
      f = N.addFact(s, {
        char: charId,
        cat: b.dataset.cat,
        text: quote.replace(/\s+/g, ' ').slice(0, 200),
        status: 'canon',
        fresh: false,
        evidence: [{ id: U.uid(), quote, logId: view.readerLogId, at: Date.now() }],
      });
    });
    picked = '';
    window.getSelection().removeAllRanges();
    hidePickbar();
    toast(`${N.CHARS[charId].name} · ${N.catLabel(b.dataset.cat, charId)}에 추가했어요`, {
      action: {
        label: '짧게 다듬기',
        fn: () => {
          goToFact(f.id);
          view.editing = f.id;
          renderFactList(f.char);
          const t = $(`.fact[data-id="${f.id}"] textarea`);
          if (t) t.focus();
        },
      },
    });
  });

  /* ================= logs ================= */
  function renderLogs() {
    const logs = Object.values(N.state.logs).sort((a, b) => b.createdAt - a.createdAt);
    const used = {};
    Object.values(N.state.facts).forEach((f) => f.evidence.forEach((e) => e.logId && (used[e.logId] = (used[e.logId] || 0) + 1)));
    $('#logList').innerHTML = logs.length
      ? logs
          .map(
            (l) => `<div class="log-item" data-id="${l.id}">
          <div class="log-main"><b>${l.private ? '🔒 ' : ''}${esc(l.title)}</b>
            <span>${U.date(l.createdAt)} · ${l.text.length.toLocaleString()}자 · 근거 ${used[l.id] || 0}개${l.extractedAt ? '' : ' · AI 수집 전'}${l.blocked && l.blocked.length ? ` · ⚠ 직접 고를 부분 ${l.blocked.length}곳` : ''}</span></div>
          <div class="btn-row">
            <button class="btn btn-sm" data-act="read"><svg><use href="#i-book"/></svg>읽기</button>
            <button class="icon-btn" data-act="extract" title="AI로 다시 뽑기" aria-label="AI로 다시 뽑기"><svg><use href="#i-wand"/></svg></button>
            <button class="icon-btn" data-act="rename" title="이름 바꾸기" aria-label="이름 바꾸기"><svg><use href="#i-edit"/></svg></button>
            <button class="icon-btn" data-act="delete" title="삭제" aria-label="삭제"><svg><use href="#i-trash"/></svg></button>
          </div></div>`
          )
          .join('')
      : `<div class="empty"><b>아직 저장된 대화가 없어요</b>수집하기 탭에서 대화를 넣으면 여기 쌓여요.</div>`;
  }
  $('#logList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.closest('.log-item').dataset.id;
    const log = N.state.logs[id];
    if (!log) return;
    const act = b.dataset.act;
    if (act === 'read') return openReader(id);
    if (act === 'extract') {
      return openModal(
        `<h2>「${esc(log.title)}」 다시 뽑기</h2><p class="hint">누구 설정을 찾을까요? ‘둘 다’를 고르면 AI가 리츠 것과 엔쥬 것을 나눠 줘요. 이미 있는 설정은 ‘재확인’으로 표시돼요.</p>
        ${N.gemini.hasKey('paid') ? `<label class="check"><input type="checkbox" id="xPrivate"${log.private ? ' checked' : ''} /><span>🔒 유료 키로만 처리</span></label>` : ''}
        <div class="modal-foot"><button class="btn btn-ghost" data-close>취소</button>
        <button class="btn" data-char="ritsu">리츠만</button><button class="btn" data-char="enju">엔쥬만</button><button class="btn btn-brand" data-char="both">둘 다 (AI 구분)</button></div>`,
        (box) => {
          $('[data-close]', box).onclick = closeModal;
          $$('[data-char]', box).forEach(
            (x) =>
              (x.onclick = () => {
                const pv = $('#xPrivate', box);
                if (pv && pv.checked !== !!log.private) N.commit((s) => Object.assign(s.logs[id], { private: pv.checked, updatedAt: Date.now() }), { quiet: true });
                closeModal();
                view.target = x.dataset.char;
                runExtract(id, x.dataset.char);
              })
          );
        }
      );
    }
    if (act === 'rename') {
      const t = prompt('대화 제목', log.title);
      if (t && t.trim()) N.commit((s) => Object.assign(s.logs[id], { title: t.trim(), updatedAt: Date.now() }));
      return;
    }
    if (act === 'delete') {
      if (!confirm(`「${log.title}」을 삭제할까요?\n이 대화에서 모은 설정과 근거 대사는 그대로 남아요.`)) return;
      N.commit((s) => {
        delete s.logs[id];
        s.tomb[id] = Date.now();
      });
      if (view.readerLogId === id) view.readerLogId = null;
      if (view.draftLogId === id) view.draftLogId = null;
    }
  });

  /* ================= settings & backup ================= */
  function renderSettings() {
    const st = N.settings;
    const daysSinceFile = st.lastFileBackup ? (Date.now() - st.lastFileBackup) / 86400000 : Infinity;
    $('#backupCard').innerHTML = `
      <h2 class="card-title">백업</h2>
      <p class="lead">설정은 이 브라우저에 자동 저장되지만, 사이트 데이터를 지우면 사라질 수 있어요. 가끔 파일로도 받아 두세요.</p>
      <div class="backup-grid">
        <div class="backup-stat ${daysSinceFile < 8 ? 'good' : 'bad'}"><span>마지막 파일 백업</span><b>${U.ago(st.lastFileBackup)}</b></div>
        <div class="backup-stat ${st.driveOn ? 'good' : 'bad'}"><span>드라이브 동기화</span><b>${st.driveOn ? U.ago(st.lastDriveSync) : '꺼짐'}</b></div>
        <div class="backup-stat ${N.persisted ? 'good' : ''}"><span>브라우저 저장소</span><b>${N.persisted ? '보호됨' : '일반'}</b></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="btnExportFile"><svg><use href="#i-download"/></svg>파일로 내보내기</button>
        <button class="btn" id="btnImportFile"><svg><use href="#i-upload"/></svg>파일 불러오기</button>
        <input type="file" id="importInput" accept="application/json,.json" hidden />
      </div>`;
    $('#btnExportFile').onclick = () => {
      N.exportFile();
      toast('백업 파일을 저장했어요');
    };
    $('#btnImportFile').onclick = () => $('#importInput').click();
    $('#importInput').onchange = async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const data = await N.readFile(file);
        importModal(data);
      } catch (err) {
        toast(err.message, { err: true });
      }
    };

    const clientId = $('#clientId');
    if (document.activeElement !== clientId) clientId.value = st.clientId || '';
    $('#originHint').textContent = location.origin && location.origin !== 'null' ? location.origin : '(GitHub Pages 주소, 예: https://아이디.github.io)';
    renderDrive();

    if (document.activeElement !== $('#geminiKey')) $('#geminiKey').value = st.geminiKey || '';
    if (document.activeElement !== $('#geminiPaidKey')) $('#geminiPaidKey').value = st.geminiPaidKey || '';
    if (document.activeElement !== $('#model')) $('#model').value = st.model || '';
    const free = N.gemini.hasKey('free');
    const paid = N.gemini.hasKey('paid');
    $('#geminiInfo').textContent =
      free && paid ? '무료 키 먼저, 한도가 차면 유료 키로 넘어가요' : free ? '무료 키만 써요' : paid ? '유료 키만 써요' : '키를 넣으면 AI 수집을 쓸 수 있어요';
    if (document.activeElement !== $('#aliasRitsu')) $('#aliasRitsu').value = N.aliases('ritsu').join(', ');
    if (document.activeElement !== $('#aliasEnju')) $('#aliasEnju').value = N.aliases('enju').join(', ');
  }

  function renderDrive() {
    const st = N.settings;
    const D = N.drive;
    let info = '꺼져 있어요';
    if (st.driveOn) {
      info = {
        syncing: '동기화 중…',
        ok: `동기화됨 · ${U.ago(st.lastDriveSync)}`,
        login: '로그인이 만료됐어요. ‘지금 동기화’를 누르면 다시 연결돼요.',
        error: `오류: ${D.error}`,
        off: '연결됨',
      }[D.status];
    }
    $('#driveInfo').textContent = info;
    $('#driveBtns').innerHTML = st.driveOn
      ? `<button class="btn btn-sm btn-ghost" id="btnDriveOff">연결 끊기</button><button class="btn btn-sm btn-primary" id="btnDriveSync"><svg><use href="#i-sync"/></svg>지금 동기화</button>`
      : `<button class="btn btn-sm btn-primary" id="btnDriveOn"><svg><use href="#i-cloud"/></svg>연결하기</button>`;
    const on = $('#btnDriveOn');
    if (on)
      on.onclick = async () => {
        N.saveSettings({ clientId: $('#clientId').value.trim() });
        try {
          await N.drive.signIn();
          await N.drive.sync({ interactive: true });
          toast('구글 드라이브와 연결했어요. 이제 자동으로 저장돼요');
        } catch (e) {
          toast(e.message, { err: true });
        }
        render();
      };
    const sync = $('#btnDriveSync');
    if (sync) sync.onclick = () => syncNow();
    const off = $('#btnDriveOff');
    if (off)
      off.onclick = () => {
        if (!confirm('드라이브 연결을 끊을까요? 드라이브에 저장된 파일은 지워지지 않아요.')) return;
        N.drive.signOut();
        render();
      };
  }

  async function syncNow() {
    try {
      await N.drive.sync({ interactive: true });
      toast('동기화했어요');
    } catch (e) {
      toast(e.message === 'login' ? '다시 로그인해 주세요' : e.message, { err: true });
    }
  }

  function importModal(data) {
    const nf = Object.keys(data.facts || {}).length;
    const nl = Object.keys(data.logs || {}).length;
    openModal(
      `<h2>백업 파일 불러오기</h2>
      <p class="lead">설정 ${nf}개, 대화 ${nl}개가 들어 있어요${data.exportedAt ? ` (${U.date(data.exportedAt)} 백업)` : ''}.</p>
      <p class="hint"><b>합치기</b>는 지금 있는 것과 파일 내용을 항목별로 합쳐요 (같은 항목은 더 최근에 고친 쪽). <b>덮어쓰기</b>는 지금 내용을 지우고 파일 내용으로 바꿔요.</p>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>취소</button>
      <button class="btn danger" id="iReplace">덮어쓰기</button><button class="btn btn-primary" id="iMerge">합치기 (추천)</button></div>`,
      (box) => {
        $('[data-close]', box).onclick = closeModal;
        $('#iMerge', box).onclick = () => {
          // Restoring a backup should bring back things deleted here since, so the
          // file's items beat local tombstones (and get a fresh stamp so Drive keeps them).
          const now = Date.now();
          const restore = JSON.parse(JSON.stringify(data));
          ['facts', 'logs'].forEach((k) =>
            Object.values(restore[k] || {}).forEach((x) => {
              if (N.state.tomb[x.id]) {
                delete N.state.tomb[x.id];
                x.updatedAt = now;
              }
            })
          );
          restore.tomb = {};
          const merged = N.merge(N.state, restore);
          N.commit((s) => Object.assign(s, merged));
          closeModal();
          toast('합쳤어요');
        };
        $('#iReplace', box).onclick = () => {
          if (!confirm('지금 내용을 지우고 파일 내용으로 바꿀까요?')) return;
          const now = Date.now();
          N.commit((s) => {
            // tombstone what we drop so Drive doesn't bring it back; bump what we keep so it wins
            Object.keys(s.facts).forEach((id) => !data.facts[id] && (s.tomb[id] = now));
            Object.keys(s.logs).forEach((id) => !(data.logs || {})[id] && (s.tomb[id] = now));
            s.facts = data.facts;
            s.logs = data.logs || {};
            Object.values(s.facts).concat(Object.values(s.logs)).forEach((x) => {
              x.updatedAt = now;
              delete s.tomb[x.id];
            });
            if (data.chars) s.chars = Object.assign({}, data.chars, { updatedAt: now });
          });
          N.replace(N.state); // normalise whatever the file contained
          closeModal();
          toast('파일 내용으로 바꿨어요');
        };
      }
    );
  }

  $('#clientId').addEventListener('change', (e) => {
    const v = e.target.value.trim();
    if (v === N.settings.clientId) return;
    if (N.settings.driveOn) N.drive.signOut();
    N.saveSettings({ clientId: v });
    render();
  });
  const keyInputs = () => ({ geminiKey: $('#geminiKey').value.trim(), geminiPaidKey: $('#geminiPaidKey').value.trim() });
  $$('.key-input').forEach((inp) =>
    inp.addEventListener('change', () => {
      N.saveSettings(keyInputs());
      $(inp.id === 'geminiKey' ? '#freeState' : '#paidState').textContent = '';
      renderSettings();
    })
  );
  $$('[data-show]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.preventDefault();
      const k = $('#' + b.dataset.show);
      k.type = k.type === 'password' ? 'text' : 'password';
    })
  );
  $('#model').addEventListener('change', (e) => N.saveSettings({ model: e.target.value.trim() || 'gemini-2.5-flash' }));
  $('#btnModels').addEventListener('click', async (e) => {
    N.saveSettings(keyInputs());
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const models = await N.gemini.listModels();
      $('#modelList').innerHTML = models.map((m) => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join('');
      toast(`모델 ${models.length}개를 불러왔어요. 모델 칸을 눌러 골라 주세요`);
      $('#model').value = '';
      $('#model').focus();
    } catch (err) {
      toast(err.message, { err: true });
    } finally {
      btn.disabled = false;
    }
  });
  $('#model').addEventListener('blur', (e) => {
    if (!e.target.value.trim()) e.target.value = N.settings.model;
  });
  $('#btnTestKey').addEventListener('click', async (e) => {
    N.saveSettings(Object.assign(keyInputs(), { model: $('#model').value.trim() || N.settings.model }));
    const which = ['free', 'paid'].filter((k) => N.gemini.hasKey(k));
    if (!which.length) return toast('먼저 키를 넣어 주세요', { err: true });
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<i class="spin"></i>확인 중';
    let fails = 0;
    for (const k of ['free', 'paid']) {
      const el = $(k === 'free' ? '#freeState' : '#paidState');
      el.className = 'hint key-state';
      el.textContent = '';
      if (!which.includes(k)) continue;
      try {
        await N.gemini.test(k);
        el.classList.add('ok');
        el.textContent = `✓ 연결 성공 · ${N.settings.model}`;
      } catch (err) {
        fails++;
        el.classList.add('bad');
        el.textContent = err.message.replace(/^(무료|유료) 키: /, '✕ ');
      }
    }
    btn.disabled = false;
    btn.textContent = '키 연결 테스트';
    toast(fails ? '연결에 실패한 키가 있어요. 키 아래 메시지를 확인해 주세요' : 'Gemini 연결 성공!', { err: !!fails });
  });
  ['ritsu', 'enju'].forEach((id) => {
    $(`#alias${id === 'ritsu' ? 'Ritsu' : 'Enju'}`).addEventListener('change', (e) => {
      const v = e.target.value.trim() || N.CHARS[id].aliases;
      N.commit((s) => {
        s.chars[id] = Object.assign({}, s.chars[id], { aliases: v });
        s.chars.updatedAt = Date.now();
      });
    });
  });
  $('#btnWipe').addEventListener('click', () => {
    const n = Object.keys(N.state.facts).length;
    if (!confirm(`설정 ${n}개와 대화 기록을 모두 지울까요? 되돌릴 수 없어요.`)) return;
    const now = Date.now();
    N.commit((s) => {
      Object.keys(s.facts).concat(Object.keys(s.logs)).forEach((id) => (s.tomb[id] = now));
      s.facts = {};
      s.logs = {};
    });
    view.review = null;
    view.readerLogId = null;
    view.draftLogId = null;
    toast('모두 지웠어요');
  });

  /* ================= banners & sync chip ================= */
  function renderBanners() {
    const st = N.settings;
    const now = Date.now();
    const out = [];
    if (view.saveFailed) {
      out.push(`<div class="banner"><svg><use href="#i-alert"/></svg><p><b>브라우저에 저장하지 못했어요.</b> 저장 공간이 부족하거나 사생활 보호 모드일 수 있어요. 지금 파일로 백업해 주세요.</p>
        <div class="btn-row"><button class="btn btn-sm btn-primary" data-banner="export">파일로 백업</button></div></div>`);
    }
    const driveFresh = st.driveOn && N.drive.status === 'ok' && !N.drive.dirty;
    const total = Object.keys(N.state.facts).length;
    const stale = st.lastFileBackup ? now - st.lastFileBackup > 7 * 86400000 : total >= 5;
    if (!driveFresh && st.changesSinceBackup > 0 && (st.backupSnooze || 0) < now && (st.changesSinceBackup >= 15 || stale)) {
      out.push(`<div class="banner"><svg><use href="#i-alert"/></svg>
        <p><b>백업할 때 됐어요!</b> 마지막 백업 이후 ${st.changesSinceBackup}번 수정했어요${st.lastFileBackup ? ` (${U.ago(st.lastFileBackup)} 백업)` : ''}.${st.driveOn ? '' : ' 드라이브 동기화를 켜 두면 자동으로 지켜져요.'}</p>
        <div class="btn-row">
          <button class="btn btn-sm btn-ghost" data-banner="snooze">나중에</button>
          ${st.driveOn ? '' : '<button class="btn btn-sm" data-banner="drive">드라이브 켜기</button>'}
          <button class="btn btn-sm btn-primary" data-banner="export"><svg><use href="#i-download"/></svg>지금 백업</button>
        </div></div>`);
    }
    $('#banners').innerHTML = out.join('');
  }
  $('#banners').addEventListener('click', (e) => {
    const b = e.target.closest('[data-banner]');
    if (!b) return;
    const a = b.dataset.banner;
    if (a === 'export') {
      N.exportFile();
      view.saveFailed = false;
      toast('백업 파일을 저장했어요');
    }
    if (a === 'snooze') N.saveSettings({ backupSnooze: Date.now() + 3 * 86400000 });
    if (a === 'drive') setTab('settings');
    renderBanners();
  });

  function renderSyncChip() {
    const chip = $('#syncChip');
    const st = N.settings;
    if (!st.driveOn) {
      chip.hidden = true;
      return;
    }
    chip.hidden = false;
    const D = N.drive;
    let cls = 'ok';
    let label = '동기화됨';
    if (D.status === 'syncing') (cls = 'syncing'), (label = '동기화 중');
    else if (D.status === 'login') (cls = 'warn'), (label = D.dirty ? '저장 대기 · 눌러서 동기화' : '눌러서 동기화');
    else if (D.status === 'error') (cls = 'warn'), (label = '동기화 오류');
    else if (D.dirty) (cls = 'syncing'), (label = '저장 대기');
    chip.className = 'sync-chip ' + cls;
    chip.title = D.status === 'error' ? D.error : st.lastDriveSync ? `마지막 동기화: ${U.ago(st.lastDriveSync)}` : '';
    $('span', chip).textContent = label;
  }
  $('#syncChip').addEventListener('click', syncNow);

  /* ================= wiring ================= */
  N.on('change', () => {
    if (view.tab === 'collect') {
      renderReader();
      renderBadges();
      renderBanners();
      return; // keep the textarea and review edits untouched
    }
    render();
  });
  N.on('drive', () => {
    renderSyncChip();
    renderBanners();
    if (view.tab === 'settings') renderDrive();
  });
  N.on('backup', renderBanners);
  N.on('saved', () => {
    if (view.saveFailed) {
      view.saveFailed = false;
      renderBanners();
    }
  });
  N.on('save-failed', () => {
    view.saveFailed = true;
    renderBanners();
  });

  // Anything that slips through shows up as a message rather than a silently blank screen.
  window.addEventListener('error', (e) => toast(`오류가 났어요: ${e.message}. 새로고침해 주세요.`, { err: true, ms: 8000 }));
  window.addEventListener('unhandledrejection', (e) =>
    toast(`오류가 났어요: ${(e.reason && e.reason.message) || e.reason}. 새로고침해 주세요.`, { err: true, ms: 8000 })
  );

  (async function start() {
    await N.load();
    render();
    N.drive.init();
  })();
})();
