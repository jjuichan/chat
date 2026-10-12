/* Default document, base style, and the design presets */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const baseStyle = () => ({
    layout: 'novel', // novel | script | bubble
    width: 720,
    ratio: 'auto', // auto | 1:1 | 4:5 | 3:4 | 9:16 | 16:9
    bg: {
      type: 'solid', // solid | gradient
      color: '#F6F1EC',
      color2: '#F3E3E8',
      angle: 160,
      pattern: 'none',
      patternColor: '#C9B8BE',
      patternOpacity: 0.35,
      patternScale: 1,
      noise: true,
      image: '',
      imageOpacity: 0.35,
    },
    panel: {
      on: true,
      color: '#FFFDFB',
      opacity: 1,
      radius: 18,
      borderWidth: 1,
      borderColor: '#E9DEDF',
      borderStyle: 'solid',
      shadow: 0.1,
      margin: 40,
      padding: 48,
    },
    deco: {
      corners: 'none', // none | bracket | flourish | tape
      side: 'thread', // none | thread
      ornament: 'twist', // none | twist | dots | line | hearts
      scatter: 'none', // none | sparkle | heart | petal
      stamp: false,
      color1: '#E68AA7',
      color2: '#C8102E',
    },
    font: { body: 'gowun-batang', narr: '', name: 'zen-maru', title: 'zen-maru', size: 16, lineHeight: 1.85, letterSpacing: 0, gap: 16 },
    color: { text: '#2B2427', narr: '#5E565A', accent: '#C8102E', muted: '#A0969B', title: '#2B2427' },
    narr: { italic: false, align: 'left', scale: 1, indent: false },
    names: { position: 'above', style: 'text', scale: 0.8, avatar: false },
    quotes: '“”',
    emph: { mark: 'marker', markColor: '#F8C8D6', block: 'bar' },
    divider: 'twist',
    head: { align: 'center', titleSize: 26 },
    bubble: { radius: 18, avatar: true, maxWidth: 78 },
    foot: { align: 'center' },
  });

  const SPEAKER_BASE = {
    ritsu: {
      id: 'ritsu',
      short: '리츠',
      nameKo: '사카이 리츠',
      nameJa: '酒井律',
      custom: '',
      display: 'short',
      aliases: '사카이 리츠, 리츠, 酒井律, 律, 사카이, 酒井, Ritsu',
      side: 'left',
      avatar: '',
      color: { name: '#D9708F', text: '', bubble: '#F6E3E9', bubbleText: '#3B3236' },
    },
    enju: {
      id: 'enju',
      short: '엔쥬',
      nameKo: '카나이 엔쥬',
      nameJa: '金井媛珠',
      custom: '',
      display: 'short',
      aliases: '카나이 엔쥬, 엔쥬, 金井媛珠, 媛珠, 카나이, 金井, Enju',
      side: 'right',
      avatar: '',
      color: { name: '#C8102E', text: '', bubble: '#1E1719', bubbleText: '#FFFFFF' },
    },
  };
  App.defaultSpeaker = function (id) {
    if (SPEAKER_BASE[id]) return U.clone(SPEAKER_BASE[id]);
    return {
      id: id || U.uid(),
      short: '새 화자',
      nameKo: '',
      nameJa: '',
      custom: '',
      display: 'short',
      aliases: '',
      side: 'left',
      avatar: '',
      color: { name: '#7D7378', text: '', bubble: '#ECE8E9', bubbleText: '#2D272A' },
    };
  };

  const SAMPLE = [
    { type: 'narration', text: '창밖으로 늦은 오후의 빛이 길게 늘어져 있었다. 리츠는 읽던 책을 덮고, 소파 끝에 웅크린 엔쥬를 바라보았다.' },
    { type: 'dialogue', speaker: 'ritsu', text: '또 거기서 졸고 있어? 목 아플 텐데.' },
    { type: 'dialogue', speaker: 'enju', text: '안 졸았어. 눈 감고 생각한 거야.' },
    { type: 'narration', text: '뻔한 거짓말에 리츠가 작게 웃었다. 엔쥬는 대꾸 대신 리츠의 소매 끝을 붙잡았다.' },
    { type: 'dialogue', speaker: 'enju', text: '……있잖아. 내일도 같이 있을 거지?' },
    { type: 'dialogue', speaker: 'ritsu', text: '당연하지. ==내일도, 그 다음 날도.==', emph: true },
    { type: 'divider', text: '' },
    { type: 'narration', text: '붉은 실처럼 얽힌 손가락 사이로, 노을이 천천히 저물어 갔다.' },
  ];

  App.defaultDoc = function () {
    const style = baseStyle();
    const doc = {
      version: 1,
      presetId: 'thread',
      meta: {
        title: '내일도, 그 다음 날도',
        subtitle: 'ずうっといっしょ！',
        date: U.today(),
        comment: '',
        footer: 'Ritsu × Enju',
        stampTop: 'ずうっと',
        stampBottom: 'いっしょ',
        showTitle: true,
        showSubtitle: true,
        showDate: true,
        showComment: true,
        showFooter: true,
      },
      speakers: [App.defaultSpeaker('ritsu'), App.defaultSpeaker('enju')],
      blocks: SAMPLE.map((b) => Object.assign({ id: U.uid(), speaker: null, emph: false, hidden: false, gap: 0 }, b)),
      style,
      export: { scale: 2 },
    };
    return doc;
  };

  /* ---------- design presets ----------
   * style: partial override on top of baseStyle()
   * speakers: colours / sides per speaker id ("other" = any extra speaker)
   */
  const PRESETS = [
    {
      id: 'thread',
      name: '붉은 실',
      en: 'Red Thread',
      desc: '아이보리 종이 위, 분홍과 빨강 두 가닥 실',
      style: {},
      speakers: {
        ritsu: { color: { name: '#D9708F', text: '', bubble: '#F6E3E9', bubbleText: '#3B3236' }, side: 'left' },
        enju: { color: { name: '#C8102E', text: '', bubble: '#1E1719', bubbleText: '#FFFFFF' }, side: 'right' },
      },
    },
    {
      id: 'midnight',
      name: '한밤의 듀엣',
      en: 'Midnight Duet',
      desc: '검은 밤, 대본처럼 주고받는 대사',
      style: {
        layout: 'script',
        bg: { type: 'gradient', color: '#141012', color2: '#24191C', angle: 170, pattern: 'dots', patternColor: '#FFFFFF', patternOpacity: 0.06, noise: true },
        panel: { on: false, margin: 64, padding: 0 },
        deco: { side: 'none', ornament: 'twist', scatter: 'sparkle', corners: 'bracket', color1: '#F29AB6', color2: '#FF3349' },
        font: { body: 'noto-serif', name: 'zen-kaku', title: 'shippori', size: 16, lineHeight: 1.9, gap: 18 },
        color: { text: '#ECE4E6', narr: '#9D9397', accent: '#FF4458', muted: '#7C7276', title: '#FFFFFF' },
        narr: { italic: false, align: 'left', scale: 0.94 },
        names: { style: 'text', scale: 0.78 },
        quotes: '「」',
        emph: { mark: 'underline', markColor: '#FF4458', block: 'bar' },
        divider: 'twist',
        head: { align: 'left', titleSize: 28 },
      },
      speakers: {
        ritsu: { color: { name: '#F59BB8', text: '#F6E9ED', bubble: '#3A2C31', bubbleText: '#F6E9ED' } },
        enju: { color: { name: '#FF3B4E', text: '#FFFFFF', bubble: '#B3122A', bubbleText: '#FFFFFF' } },
        other: { color: { name: '#B9AFB3', text: '', bubble: '#2A2326', bubbleText: '#EEEEEE' } },
      },
    },
    {
      id: 'sakura',
      name: '벚꽃 편지',
      en: 'Sakura Letter',
      desc: '줄 노트에 붙인 테이프와 도장',
      style: {
        bg: { type: 'solid', color: '#F9E9EE', pattern: 'hearts', patternColor: '#E9A6BA', patternOpacity: 0.32, noise: true },
        panel: { on: true, color: '#FFFDFC', opacity: 1, radius: 6, borderWidth: 0, borderColor: '#EFCBD6', borderStyle: 'solid', shadow: 0.16, margin: 44, padding: 50 },
        deco: { side: 'none', corners: 'tape', ornament: 'hearts', scatter: 'petal', stamp: true, color1: '#E88AA8', color2: '#D2193A' },
        font: { body: 'gowun-batang', name: 'gowun-dodum', title: 'klee', size: 16, lineHeight: 1.9, gap: 16 },
        color: { text: '#3A2F33', narr: '#6E6166', accent: '#D2486E', muted: '#B39AA3', title: '#3A2F33' },
        names: { style: 'pill', scale: 0.74 },
        emph: { mark: 'marker', markColor: '#FAD0DC', block: 'box' },
        divider: 'hearts',
        quotes: '“”',
      },
      speakers: {
        ritsu: { color: { name: '#E07E9D', text: '', bubble: '#FBE4EB', bubbleText: '#3B3236' } },
        enju: { color: { name: '#C8102E', text: '', bubble: '#C8102E', bubbleText: '#FFFFFF' } },
      },
    },
    {
      id: 'messenger',
      name: '메신저',
      en: 'Messenger',
      desc: '말풍선으로 주고받는 채팅 화면',
      style: {
        layout: 'bubble',
        width: 640,
        bg: { type: 'gradient', color: '#EEEBEC', color2: '#E4DFE1', angle: 180, pattern: 'none', noise: false },
        panel: { on: false, margin: 36, padding: 0 },
        deco: { side: 'none', corners: 'none', ornament: 'none', scatter: 'none', stamp: false },
        font: { body: 'noto-sans', name: 'noto-sans', title: 'zen-maru', size: 15, lineHeight: 1.65, gap: 10 },
        color: { text: '#2A2427', narr: '#7D7579', accent: '#C8102E', muted: '#9A9195', title: '#2A2427' },
        narr: { align: 'center', scale: 0.87 },
        names: { style: 'text', scale: 0.78 },
        quotes: 'none',
        emph: { mark: 'color', markColor: '#C8102E', block: 'none' },
        divider: 'dots',
        head: { align: 'center', titleSize: 20 },
        bubble: { radius: 20, avatar: true, maxWidth: 76 },
      },
      speakers: {
        ritsu: { side: 'left', color: { name: '#C5617F', text: '', bubble: '#FFFFFF', bubbleText: '#2F282B' } },
        enju: { side: 'right', color: { name: '#B10E27', text: '', bubble: '#1D1618', bubbleText: '#FFFFFF' } },
        other: { side: 'left', color: { name: '#7D7378', bubble: '#F7F4F5', bubbleText: '#2D272A' } },
      },
    },
    {
      id: 'novel',
      name: '모노 노벨',
      en: 'Mono Novel',
      desc: '이름 없이 읽히는 문고본 한 페이지',
      style: {
        bg: { type: 'solid', color: '#FBFAF7', pattern: 'none', noise: true },
        panel: { on: false, margin: 72, padding: 0 },
        deco: { side: 'none', corners: 'none', ornament: 'line', scatter: 'none', color1: '#B8B0B3', color2: '#2B2427' },
        font: { body: 'nanum-myeongjo', name: 'noto-serif', title: 'nanum-myeongjo', size: 16, lineHeight: 2, gap: 6 },
        color: { text: '#1F1B1D', narr: '#1F1B1D', accent: '#9E1B2E', muted: '#8F878B', title: '#1F1B1D' },
        narr: { align: 'justify', indent: true },
        names: { position: 'hidden' },
        quotes: '“”',
        emph: { mark: 'color', markColor: '#9E1B2E', block: 'none' },
        divider: 'star',
        head: { align: 'left', titleSize: 24 },
        foot: { align: 'right' },
      },
      speakers: {
        ritsu: { color: { name: '#C9718E', text: '' } },
        enju: { color: { name: '#9E1B2E', text: '' } },
      },
    },
    {
      id: 'gingham',
      name: '깅엄 리본',
      en: 'Gingham Ribbon',
      desc: '분홍 깅엄 체크와 동글동글 글씨',
      style: {
        bg: { type: 'solid', color: '#FFFFFF', pattern: 'gingham', patternColor: '#F2A9C0', patternOpacity: 0.42, noise: false },
        panel: { on: true, color: '#FFFFFF', opacity: 0.96, radius: 28, borderWidth: 2, borderColor: '#F3BCCD', borderStyle: 'dashed', shadow: 0.08, margin: 44, padding: 44 },
        deco: { side: 'none', corners: 'flourish', ornament: 'dots', scatter: 'heart', stamp: false, color1: '#EE8FAE', color2: '#D3203F' },
        font: { body: 'gowun-dodum', name: 'zen-maru', title: 'zen-maru', size: 16, lineHeight: 1.8, gap: 14 },
        color: { text: '#3B3135', narr: '#7A6C72', accent: '#E0577F', muted: '#C09BA8', title: '#D3203F' },
        names: { style: 'pill', scale: 0.76 },
        emph: { mark: 'full', markColor: '#FFE0EA', block: 'box' },
        divider: 'hearts',
      },
      speakers: {
        ritsu: { color: { name: '#EE8FAE', text: '', bubble: '#FDE6EE', bubbleText: '#3B3236' } },
        enju: { color: { name: '#D3203F', text: '', bubble: '#D3203F', bubbleText: '#FFFFFF' } },
      },
    },
    {
      id: 'noir',
      name: '흑적',
      en: 'Noir Rouge',
      desc: '검정과 진홍, 날카로운 액자',
      style: {
        bg: { type: 'gradient', color: '#0D0A0B', color2: '#2B0A10', angle: 165, pattern: 'stripe', patternColor: '#FFFFFF', patternOpacity: 0.03, noise: true },
        panel: { on: true, color: '#141011', opacity: 0.86, radius: 2, borderWidth: 1, borderColor: '#5E1A23', borderStyle: 'double', shadow: 0.4, margin: 40, padding: 52 },
        deco: { side: 'none', corners: 'bracket', ornament: 'line', scatter: 'none', color1: '#E9A1B6', color2: '#E2182F' },
        font: { body: 'hahmlet', name: 'shippori', title: 'shippori', size: 16, lineHeight: 1.85, gap: 16 },
        color: { text: '#EEE6E8', narr: '#A2989C', accent: '#E2182F', muted: '#7F7478', title: '#FFFFFF' },
        names: { style: 'underline', scale: 0.78 },
        quotes: '『』',
        emph: { mark: 'underline', markColor: '#E2182F', block: 'big' },
        divider: 'line',
      },
      speakers: {
        ritsu: { color: { name: '#EBA4B9', text: '#F3E8EB', bubble: '#3A2A2F', bubbleText: '#FFFFFF' } },
        enju: { color: { name: '#F0263D', text: '#FFFFFF', bubble: '#E2182F', bubbleText: '#FFFFFF' } },
        other: { color: { name: '#A79DA1', text: '' } },
      },
    },
    {
      id: 'ash',
      name: '잿빛 분홍',
      en: 'Ash Pink',
      desc: '회색 모눈 위의 단정한 대본',
      style: {
        layout: 'script',
        bg: { type: 'solid', color: '#E8E6E7', pattern: 'grid', patternColor: '#BDB6B9', patternOpacity: 0.35, noise: false },
        panel: { on: true, color: '#F8F7F7', opacity: 1, radius: 0, borderWidth: 1, borderColor: '#CFC8CB', borderStyle: 'solid', shadow: 0, margin: 36, padding: 44 },
        deco: { side: 'none', corners: 'none', ornament: 'dots', scatter: 'none', stamp: false, color1: '#E07A9B', color2: '#4A4447' },
        font: { body: 'ibm-plex', name: 'ibm-plex', title: 'zen-kaku', size: 15, lineHeight: 1.8, gap: 14 },
        color: { text: '#2E2A2C', narr: '#6F696C', accent: '#E07A9B', muted: '#9C9598', title: '#2E2A2C' },
        names: { style: 'dot', scale: 0.82 },
        quotes: 'none',
        emph: { mark: 'full', markColor: '#F7D4DF', block: 'bar' },
        divider: 'dots',
        head: { align: 'left', titleSize: 24 },
        foot: { align: 'left' },
      },
      speakers: {
        ritsu: { color: { name: '#E07A9B', text: '' } },
        enju: { color: { name: '#B3172B', text: '' } },
      },
    },
  ];

  App.presets = {
    list: PRESETS,
    baseStyle,
    get: (id) => PRESETS.find((p) => p.id === id),
    apply(p, opts) {
      const st = App.state;
      st.style = U.merge(baseStyle(), p.style);
      // keep the canvas width the user picked unless asked otherwise
      if (opts && opts.keepWidth) st.style.width = opts.keepWidth;
      st.speakers.forEach((s) => {
        const ov = (p.speakers && (p.speakers[s.id] || p.speakers.other)) || null;
        const base = App.defaultSpeaker(SPEAKER_BASE[s.id] ? s.id : '__x');
        const col = U.merge(base.color, ov && ov.color);
        s.color = col;
        if (ov && ov.side) s.side = ov.side;
        else if (SPEAKER_BASE[s.id]) s.side = SPEAKER_BASE[s.id].side;
      });
      st.presetId = p.id;
    },
  };
})();
