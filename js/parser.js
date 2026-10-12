/* Parse pasted AI-chat text into blocks */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const QUOTE_PAIRS = [
    ['"', '"'],
    ['“', '”'],
    ['「', '」'],
    ['『', '』'],
    ['‘', '’'],
  ];
  const OPEN = QUOTE_PAIRS.map((p) => p[0]);
  const ENDS_SENTENCE = /[.!?。！？…~♡♥」』”"）)\]]\s*$/;
  const QUOTE_TAIL_PARTICLE = /^\s*(하고|라고|라며|라면서|이라고|이라며|고\s|며\s|란|이란|는\s|하며|하는|하던|하면서|하자|라는)/;

  function aliasTable(speakers) {
    const rows = [];
    speakers.forEach((s) => {
      const names = new Set(
        [s.short, s.nameKo, s.nameJa, s.custom]
          .concat(String(s.aliases || '').split(/[,，、\n]/))
          .map((x) => String(x || '').trim())
          .filter(Boolean)
      );
      names.forEach((n) => rows.push({ id: s.id, name: n }));
    });
    // longest first so "사카이 리츠" wins over "리츠"
    return rows.sort((a, b) => b.name.length - a.name.length);
  }

  function matchSpeakerName(label, table) {
    const l = label.replace(/[\[\]【】<>《》()（）*_]/g, '').trim();
    if (!l) return null;
    const exact = table.find((r) => r.name.toLowerCase() === l.toLowerCase());
    if (exact) return exact.id;
    const part = table.find((r) => r.name.length >= 2 && l.includes(r.name));
    return part ? part.id : null;
  }

  function lastMention(text, table) {
    let best = null;
    let bestPos = -1;
    table.forEach((r) => {
      if (r.name.length < 1) return;
      const i = text.lastIndexOf(r.name);
      if (i > bestPos) {
        bestPos = i;
        best = r.id;
      }
    });
    return best;
  }

  // Split one line into segments: {kind:'narr'|'dlg'|'plain', text}
  function segment(line, opts) {
    const segs = [];
    let i = 0;
    let buf = '';
    const flush = (kind) => {
      if (buf.trim()) segs.push({ kind: kind || 'plain', text: buf });
      buf = '';
    };
    while (i < line.length) {
      const ch = line[i];
      // *narration*  (also **...** used by some services)
      if (ch === '*' && opts.asterisk) {
        let j = i;
        while (line[j] === '*') j++;
        const stars = line.slice(i, j);
        const end = line.indexOf(stars, j);
        if (end > j) {
          flush('plain');
          segs.push({ kind: 'narr', text: line.slice(j, end) });
          i = end + stars.length;
          continue;
        }
      }
      const qi = OPEN.indexOf(ch);
      if (qi >= 0) {
        const close = QUOTE_PAIRS[qi][1];
        const end = line.indexOf(close, i + 1);
        if (end > i) {
          const before = buf;
          const after = line.slice(end + 1);
          const standalone = (!before.trim() || ENDS_SENTENCE.test(before)) && !/^[가-힣A-Za-z]/.test(after) && !QUOTE_TAIL_PARTICLE.test(after);
          if (standalone) {
            flush('plain');
            segs.push({ kind: 'dlg', text: line.slice(i + 1, end), raw: line.slice(i, end + 1) });
            i = end + 1;
            continue;
          }
          buf += line.slice(i, end + 1);
          i = end + 1;
          continue;
        }
      }
      buf += ch;
      i++;
    }
    flush('plain');
    return segs;
  }

  /**
   * opts: { plainAs: 'narration'|'dialogue', guess: 'mention'|'alternate'|'none',
   *         stripQuotes: bool, asterisk: bool }
   */
  App.parseRaw = function (raw, speakers, opts) {
    opts = Object.assign({ plainAs: 'narration', guess: 'mention', stripQuotes: true, asterisk: true }, opts || {});
    const table = aliasTable(speakers);
    const mains = speakers.slice(0, 2).map((s) => s.id);
    const blocks = [];
    let lastDlgSpeaker = null;
    let context = ''; // recent narration for name-mention guessing

    const push = (b) => {
      b.text = b.text.replace(/\s+$/g, '').replace(/^\s+/g, '');
      if (!b.text && b.type !== 'divider') return;
      blocks.push(Object.assign({ id: U.uid(), speaker: null, emph: false, hidden: false, gap: 0 }, b));
    };
    const guessSpeaker = () => {
      if (opts.guess === 'none') return null;
      if (opts.guess === 'mention') {
        const m = lastMention(context, table);
        if (m) return m;
      }
      if (mains.length === 2) {
        if (!lastDlgSpeaker) return mains[0];
        return lastDlgSpeaker === mains[0] ? mains[1] : mains[0];
      }
      return mains[0] || null;
    };
    const addDialogue = (text, speaker, guessed, rawText) => {
      const t = opts.stripQuotes || !rawText ? text : rawText;
      push({ type: 'dialogue', speaker, text: t, guessed: !!guessed });
      if (speaker) lastDlgSpeaker = speaker;
      context = '';
    };

    const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;
      // dividers
      if (/^([-=*_~]\s*){3,}$/.test(line) || /^[✦✧★☆◆◇♡♥・·]{1,}(\s*[✦✧★☆◆◇♡♥・·])*$/.test(line)) {
        push({ type: 'divider', text: '' });
        return;
      }
      // "이름: 대사" / "[이름] 대사" / "【이름】 대사"
      let speaker = null;
      let body = line;
      let m = line.match(/^([^:：「“"*\s][^:：「“"]{0,23}?)\s*[:：]\s*(.*)$/);
      if (m) {
        const id = matchSpeakerName(m[1], table);
        if (id) {
          speaker = id;
          body = m[2];
        }
      }
      if (!speaker) {
        m = line.match(/^[\[【<《]\s*([^\]】>》]{1,24})\s*[\]】>》]\s*(.*)$/);
        if (m) {
          const id = matchSpeakerName(m[1], table);
          if (id) {
            speaker = id;
            body = m[2];
          }
        }
      }
      if (!body.trim()) return;

      const segs = segment(body, opts);
      if (speaker) {
        // named line: unquoted text is the speaker's dialogue unless it is *narration*
        const onlyPlain = segs.every((s) => s.kind === 'plain');
        if (onlyPlain) {
          addDialogue(stripWrap(body), speaker, false);
          return;
        }
        segs.forEach((s) => {
          if (s.kind === 'narr') {
            push({ type: 'narration', text: s.text });
            context += ' ' + s.text;
          } else if (s.kind === 'dlg') addDialogue(s.text, speaker, false, s.raw);
          else if (s.text.trim()) addDialogue(s.text.trim(), speaker, false);
        });
        return;
      }

      segs.forEach((s) => {
        if (s.kind === 'dlg') {
          const sp = guessSpeaker();
          addDialogue(s.text, sp, true, s.raw);
        } else if (s.kind === 'narr' || opts.plainAs === 'narration') {
          const t = s.text.trim();
          if (!t) return;
          push({ type: 'narration', text: t });
          context += ' ' + t;
        } else {
          const t = s.text.trim();
          if (!t) return;
          addDialogue(t, lastDlgSpeaker || guessSpeaker(), true);
        }
      });
    });
    return blocks;
  };

  function stripWrap(t) {
    const s = t.trim();
    for (const [o, c] of QUOTE_PAIRS) if (s.startsWith(o) && s.endsWith(c) && s.length > 1) return s.slice(1, -1);
    return s;
  }
})();
