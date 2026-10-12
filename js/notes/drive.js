/* 리츠 노트 — Google Drive sync
   Uses Google Identity Services (token model) with the drive.appdata scope: the
   app can only see its own hidden folder, never the user's other Drive files.
   One file, ritsu-notes.json, holds the data; every sync downloads it, merges it
   with this device's copy (see Notes.merge) and uploads the result. */
(function () {
  'use strict';
  const N = window.Notes;
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const FILE = 'ritsu-notes.json';
  const TKEY = 'ritsu-notes:drive-token';

  let token = null;
  let tokenExp = 0;
  let client = null;
  let clientFor = '';
  let fileId = null;
  let running = null;
  let again = false;
  let lastSyncAt = 0;
  let retryTimer = null;
  let retryDelay = 0;
  let knownRemote = ''; // modifiedTime of the Drive file as we last left it

  const D = (N.drive = { status: 'off', error: '', dirty: false });

  try {
    const t = JSON.parse(sessionStorage.getItem(TKEY));
    if (t && t.exp > Date.now()) {
      token = t.token;
      tokenExp = t.exp;
    }
  } catch (e) {}

  function setStatus(status, error) {
    D.status = status;
    D.error = error || '';
    N.emit('drive');
  }
  D.hasToken = () => !!token && Date.now() < tokenExp;

  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error('구글 로그인 스크립트를 불러오지 못했어요. 인터넷 연결이나 광고 차단 확장 프로그램을 확인해 주세요.'));
      document.head.appendChild(s);
    });
  }

  // Must be called from a click: it opens Google's popup.
  D.signIn = async function () {
    const id = (N.settings.clientId || '').trim();
    if (!id) throw new Error('OAuth 클라이언트 ID를 먼저 입력해 주세요.');
    await loadGis();
    if (!client || clientFor !== id) {
      client = google.accounts.oauth2.initTokenClient({ client_id: id, scope: SCOPE, callback: () => {} });
      clientFor = id;
    }
    await new Promise((res, rej) => {
      client.callback = (r) => {
        if (r.error) return rej(new Error(r.error === 'access_denied' ? '구글 드라이브 접근을 허용하지 않았어요.' : `로그인 실패: ${r.error_description || r.error}`));
        token = r.access_token;
        tokenExp = Date.now() + (Number(r.expires_in || 3600) - 60) * 1000;
        try {
          sessionStorage.setItem(TKEY, JSON.stringify({ token, exp: tokenExp }));
        } catch (e) {}
        res();
      };
      client.error_callback = (e) =>
        rej(new Error(e && e.type === 'popup_closed' ? '로그인 창이 닫혔어요.' : e && e.type === 'popup_failed_to_open' ? '팝업이 차단됐어요. 이 사이트의 팝업을 허용해 주세요.' : '로그인하지 못했어요.'));
      client.requestAccessToken({ prompt: N.settings.driveOn ? '' : 'consent' });
    });
    N.saveSettings({ driveOn: true });
  };

  D.signOut = function () {
    if (token && window.google && google.accounts) {
      try {
        google.accounts.oauth2.revoke(token, () => {});
      } catch (e) {}
    }
    token = null;
    tokenExp = 0;
    fileId = null;
    try {
      sessionStorage.removeItem(TKEY);
    } catch (e) {}
    N.saveSettings({ driveOn: false });
    setStatus('off');
  };

  async function api(url, opts) {
    const res = await fetch(url, Object.assign({}, opts, { headers: Object.assign({ Authorization: `Bearer ${token}` }, (opts && opts.headers) || {}) }));
    if (res.status === 401) {
      token = null;
      tokenExp = 0;
      try {
        sessionStorage.removeItem(TKEY);
      } catch (e) {}
      const err = new Error('login');
      err.login = true;
      throw err;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw driveError(res.status, data.error || {});
    }
    return res;
  }

  // Turn Drive's error into something readable, and say whether waiting will fix it.
  function driveError(status, e) {
    const reasons = (e.errors || []).map((x) => x.reason).concat(e.status || '').join(' ');
    const msg = String(e.message || '');
    let text = msg || `드라이브 요청 실패 (${status})`;
    let kind = 'other';
    if (/storageQuotaExceeded|teamDriveFileLimitExceeded/i.test(reasons) || /storage quota|storage limit/i.test(msg)) {
      kind = 'storage';
      text = '구글 드라이브 저장 공간이 꽉 찼어요. Gmail·구글 포토와 함께 쓰는 공간이라, 그쪽을 정리하면 다시 동기화돼요. 그동안은 파일 백업을 써 주세요.';
    } else if (/accessNotConfigured|SERVICE_DISABLED/i.test(reasons) || /has not been used|is disabled/i.test(msg)) {
      kind = 'disabled';
      text = '이 프로젝트에서 Google Drive API가 꺼져 있어요. Cloud 콘솔의 Drive API 페이지에서 ‘사용’을 눌러 주세요.';
    } else if (status === 429 || /rateLimitExceeded|userRateLimitExceeded|quotaExceeded|dailyLimitExceeded|RESOURCE_EXHAUSTED/i.test(reasons) || /rate limit|quota/i.test(msg)) {
      kind = 'rate';
      text = '드라이브 요청 한도에 잠시 걸렸어요. 조금 뒤 자동으로 다시 시도해요.';
    }
    const err = new Error(text);
    err.kind = kind;
    err.status = status;
    err.raw = msg;
    return err;
  }

  async function findFile() {
    if (fileId) return fileId;
    const q = encodeURIComponent(`name='${FILE}'`);
    const res = await api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`);
    const data = await res.json();
    fileId = data.files && data.files[0] ? data.files[0].id : null;
    return fileId;
  }

  async function upload(body) {
    const id = await findFile();
    if (id) {
      const res = await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media&fields=modifiedTime`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      knownRemote = (await res.json().catch(() => ({}))).modifiedTime || '';
      return;
    }
    const boundary = 'rn' + N.util.uid();
    const meta = JSON.stringify({ name: FILE, parents: ['appDataFolder'], mimeType: 'application/json' });
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const res = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
    const made = await res.json();
    fileId = made.id;
    knownRemote = made.modifiedTime || '';
  }

  async function syncOnce() {
    setStatus('syncing');
    const startedAt = N.state.updatedAt;
    const id = await findFile();
    let merged = N.state;
    if (id) {
      // Only download when another device changed the file since our last upload.
      const meta = await (await api(`https://www.googleapis.com/drive/v3/files/${id}?fields=modifiedTime`)).json();
      if (!knownRemote || meta.modifiedTime !== knownRemote) {
        const res = await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
        const remote = await res.json().catch(() => null);
        if (N.isValidData(remote)) merged = N.merge(N.state, remote);
      }
    }
    D.dirty = false;
    await upload(JSON.stringify(merged));
    // Edits made while we were talking to Drive are kept: merge once more, and go around again.
    if (N.state.updatedAt !== startedAt) {
      again = true;
      N.replace(N.merge(N.state, merged));
    } else if (JSON.stringify(merged) !== JSON.stringify(N.state)) {
      N.replace(merged);
    }
    N.saveSettings({ lastDriveSync: Date.now() });
    setStatus('ok');
  }

  // After a rate-limit error, try again later: 1, 2, 4 … up to 30 minutes.
  function scheduleRetry() {
    clearTimeout(retryTimer);
    retryDelay = Math.min(retryDelay ? retryDelay * 2 : 60000, 30 * 60000);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      D.sync().catch(() => {});
    }, retryDelay);
  }

  // Sync now. Pass {interactive:true} from a click so an expired login can be renewed.
  D.sync = async function (opts) {
    if (!N.settings.driveOn || !N.settings.clientId) return;
    if (!D.hasToken()) {
      if (!(opts && opts.interactive)) return setStatus('login');
      await D.signIn();
    }
    if (running) {
      again = true;
      return running;
    }
    clearTimeout(retryTimer);
    retryTimer = null;
    running = (async () => {
      try {
        do {
          again = false;
          lastSyncAt = Date.now();
          await syncOnce();
        } while (again);
        retryDelay = 0;
      } catch (e) {
        if (e.login) setStatus('login');
        else {
          setStatus('error', e.message);
          if (e.kind === 'rate') scheduleRetry();
        }
        throw e;
      } finally {
        running = null;
      }
    })();
    return running;
  };

  // Edits come in bursts; wait for a pause, and never sync more than once per 15 seconds.
  const MIN_GAP = 15000;
  let gapTimer = null;
  const autoSync = N.util.debounce(function go() {
    if (!D.hasToken()) {
      if (N.settings.driveOn) setStatus('login');
      return;
    }
    if (D.status === 'error' && retryTimer) return; // a retry is already waiting
    const wait = lastSyncAt + MIN_GAP - Date.now();
    clearTimeout(gapTimer);
    if (wait > 0) gapTimer = setTimeout(go, wait);
    else D.sync().catch(() => {});
  }, 4000);

  N.on('change', (o) => {
    if (o && o.external) return;
    if (!N.settings.driveOn) return;
    D.dirty = true;
    N.emit('drive');
    autoSync();
  });

  D.init = function () {
    if (!N.settings.driveOn || !N.settings.clientId) return setStatus('off');
    if (D.hasToken()) D.sync().catch(() => {});
    else setStatus('login');
  };
})();
