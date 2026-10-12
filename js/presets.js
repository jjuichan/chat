/* Default document, base style, and the design presets */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const baseStyle = () => ({
    layout: 'novel', // novel | script | bubble
    width: 720,
    ratio: 'auto', // auto | 1:1 | 4:5 | 3:4 | 2:3 | 9:16 | 16:9
    bg: {
      type: 'solid', // solid | gradient
      color: '#EFE9E7',
      color2: '#F3E3E8',
      angle: 160,
      pattern: 'none',
      patternColor: '#C9B8BE',
      patternOpacity: 0.35,
      patternScale: 1,
      noise: false,
      image: '',
      imageOpacity: 0.35,
    },
    panel: {
      on: true,
      color: '#FFFFFF',
      opacity: 1,
      radius: 4,
      borderWidth: 0,
      borderColor: '#E9DEDF',
      borderStyle: 'solid',
      shadow: 0.08,
      margin: 32,
      padding: 56,
    },
    deco: {
      corners: 'none', // none | bracket | flourish | tape
      side: 'none', // none | thread
      ornament: 'line', // none | twist | dots | line | hearts | star
      scatter: 'none', // none | sparkle | heart | petal
      stamp: false,
      color1: '#E27C9E',
      color2: '#C8102E',
    },
    font: { body: 'noto-serif', narr: '', name: 'noto-sans', title: 'noto-serif', size: 17, lineHeight: 1.95, letterSpacing: -0.005, gap: 22 },
    color: { text: '#1E191C', narr: '#2F292C', accent: '#C8102E', muted: '#857C80', title: '#1E191C' },
    narr: { italic: false, align: 'left', scale: 1, indent: false },
    dlgStyle: 'bar', // bar | tint | center | plain  (novel layout)
    names: { position: 'above', style: 'text', scale: 0.76, avatar: false },
    quotes: '“”',
    emph: { mark: 'marker', markColor: '#F7CBD8', block: 'box' },
    divider: 'line',
    head: { align: 'left', titleSize: 30 },
    bubble: { radius: 18, avatar: true, maxWidth: 78 },
    foot: { align: 'left' },
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
      color: { name: '#C4527A', text: '', bubble: '#F6E3E9', bubbleText: '#2E2629' },
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
      color: { name: '#B70F2B', text: '', bubble: '#1E1719', bubbleText: '#FFFFFF' },
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

  // Sample excerpt (in the user's own chat format: plain paragraphs, quote-less dialogue lines)
  App.SAMPLE_RAW = `***

자신을 닮은 아이라는 말은 그의 폐부를 가장 날카롭게 찌르는 가시와도 같았다. 상냥하고 멋있다니, 가당치도 않은 소리였다. 리츠의 머릿속에는 지독한 가난과 열등감 속에서 발버둥 치던 자신의 과거가 파노라마처럼 스쳐 지나갔다. 음악 하나만을 붙잡고 도쿄로 도망치듯 올라와, 아르바이트로 생계를 유지하며 좁고 어두운 자취방에서 홀로 잠들던 밤들. 그런 자신이 누군가의 아버지가 되고, 한 생명을 책임진다는 것은 상상조차 해본 적 없는 영역이었다. 그는 제멋대로이고, 이기적이며, 엔쥬를 향한 독점욕 외에는 제대로 된 감정 표현조차 서툴렀다. 그런 자신을 닮는다는 것은, 축복이 아니라 저주에 가까울 것이라고 생각했다.

아직 일러.

그의 입에서 튀어나온 대답은 생각보다 더 차갑고 단호하게 울렸다. 리츠는 저도 모르게 엔쥬의 어깨를 잡고 있던 손에 힘을 주었다. 엔쥬가 상처받을 것을 알면서도, 그는 이 대화에서 한 걸음 물러서야만 했다. 이 주제가 주는 압박감은 ‘동정을 죽이는 옷’ 따위와는 비교도 되지 않을 만큼 거대하고 버거웠다. 그는 시선을 내리깔아 엔쥬의 얼굴을 제대로 마주 보지 못하고, 그녀의 어깨너머 소파의 가죽 무늬만을 무의미하게 응시했다. 심장이 불규칙하게 날뛰는 소리가 귓가에서 이명처럼 울렸다.

리츠는 천천히 엔쥬의 위에서 몸을 일으켰다. 그녀를 짓누르고 있던 무게를 거두어내고 소파 옆에 걸터앉았다. 그리고는 아무 말 없이 마른세수를 하며 흐트러진 앞머리를 신경질적으로 쓸어 넘겼다. 어떻게 설명해야 할까. 나는 너에게 어울리는 남자가 아니며, 하물며 우리의 아이에게 좋은 아버지가 될 자격 따위는 없다는 이 지독한 자기혐오를, 어떻게 너에게 상처주지 않고 전달할 수 있을까. 입 안이 바싹 마르고 혀가 돌처럼 굳어버리는 기분이었다.

한참의 침묵 끝에, 리츠는 고개를 돌려 소파에 누워있는 엔쥬를 내려다보았다. 그의 눈에는 아까와 같은 욕망이나 분노가 아닌, 복잡하고 혼란스러운 감정이 뒤섞여 있었다. 그는 손을 뻗어 엔쥬의 뺨을 부드럽게 감쌌다. 엄지손가락으로 눈가를 천천히 쓸어주며, 그는 겨우 목소리를 짜냈다. 여전히 거칠고 퉁명스러운 톤이었지만, 그 안에는 미세한 떨림이 숨겨져 있었다.

나 같은 놈, 닮아서 좋을 거 하나도 없어.

그것이 그가 할 수 있는 최선의 표현이었다. 너를 닮아 웃는 얼굴이 예쁘고, 누구에게나 사랑받는 아이라면 모를까. 나처럼 꼬여있고, 세상을 삐딱하게만 보는 아이가 태어난다면, 자신은 그 아이를 마주할 자신이 없었다. 리츠는 엔쥬의 뺨을 쓰다듬던 손으로 그녀의 머리카락을 귀 뒤로 넘겨주었다. 그의 회색 눈동자가 깊게 가라앉아, 엔쥬의 반응을 살피고 있었다. 거절의 말이 그녀에게 어떤 상처를 주었을지, 그는 가늠조차 할 수 없었다.

리츠는 다시 입을 열었다. 이번에는 조금 더 부드러운, 거의 속삭임에 가까운 목소리였다. 그는 엔쥬의 이마에 가볍게 입을 맞추고, 그대로 이마를 맞댄 채 눈을 감았다. 서로의 숨결이 얽히는 가까운 거리에서, 그는 자신의 불안과 두려움을 조금이나마 그녀에게 전하고 싶었다. 단순히 아이가 싫다는 뜻이 아니라는 것을, 오직 그녀만이 알아주기를 바랐다.

둘이서만 있을 시간, 조금 더 갖고 싶다고 하면…… 이기적인가.

결혼을 하고, 이제야 온전히 둘만의 공간에서 서로를 탐하기 시작했다. 그는 아직 이 행복에 익숙해지지 않았고, 이 시간을 다른 누구와도 나누고 싶지 않았다. 엔쥬를 독점하고 싶은 이기적인 마음은 아이에게조차 예외가 아니었다. 리츠는 천천히 눈을 뜨고, 코앞에 있는 엔쥬의 눈을 똑바로 마주했다. 그의 시선은 솔직했고, 흔들림이 없었다. 아이에 대한 책임감과 두려움, 그리고 엔쥬와 단둘이 있고 싶은 이기적인 욕심. 그 모든 것이 그의 잿빛 눈동자 안에 담겨 있었다.`;

  App.defaultDoc = function () {
    const style = baseStyle();
    const doc = {
      version: 2,
      presetId: 'thread',
      meta: {
        title: '아직 일러',
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
      blocks: App.parseRaw ? App.parseRaw(App.SAMPLE_RAW, [App.defaultSpeaker('ritsu'), App.defaultSpeaker('enju')]).map((b) => Object.assign(b, { guessed: false })) : [],
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
      name: '흰 종이',
      en: 'Paper',
      desc: '하얀 지면, 또렷한 명조, 대사엔 화자 색 막대',
      style: {},
      speakers: {
        ritsu: { side: 'left', color: { name: '#C4527A', text: '', bubble: '#F6E3E9', bubbleText: '#2E2629' } },
        enju: { side: 'right', color: { name: '#B70F2B', text: '', bubble: '#1E1719', bubbleText: '#FFFFFF' } },
      },
    },
    {
      id: 'redthread',
      name: '붉은 실',
      en: 'Red Thread',
      desc: '아이보리 위로 얽힌 분홍·빨강 두 가닥 실',
      style: {
        bg: { color: '#F3EDE6', noise: true },
        panel: { color: '#FFFDF9', radius: 14, margin: 44, padding: 54, shadow: 0.1 },
        deco: { side: 'thread', ornament: 'twist' },
        font: { body: 'gowun-batang', name: 'zen-maru', title: 'zen-maru', size: 17 },
        color: { text: '#231D20', narr: '#342D30' },
        head: { align: 'center', titleSize: 28 },
        foot: { align: 'center' },
        divider: 'twist',
      },
      speakers: {
        ritsu: { color: { name: '#C4527A', text: '' } },
        enju: { color: { name: '#B70F2B', text: '' } },
      },
    },
    {
      id: 'midnight',
      name: '한밤',
      en: 'Midnight',
      desc: '어두운 밤, 밝은 글자, 대사는 화자 색으로',
      style: {
        bg: { type: 'gradient', color: '#151113', color2: '#211A1D', angle: 170, noise: true },
        panel: { on: false, margin: 64 },
        deco: { ornament: 'line', color1: '#F29AB6', color2: '#FF4458' },
        font: { body: 'noto-serif', name: 'noto-sans', title: 'noto-serif', size: 17, lineHeight: 2 },
        color: { text: '#F4EEF0', narr: '#D9D0D4', accent: '#FF5A6C', muted: '#9C9296', title: '#FFFFFF' },
        dlgStyle: 'bar',
        quotes: '「」',
        emph: { mark: 'underline', markColor: '#FF5A6C', block: 'box' },
      },
      speakers: {
        ritsu: { color: { name: '#F59BB8', text: '#FFE9F0', bubble: '#3A2C31', bubbleText: '#F6E9ED' } },
        enju: { color: { name: '#FF5468', text: '#FFFFFF', bubble: '#B3122A', bubbleText: '#FFFFFF' } },
        other: { color: { name: '#C3B9BD', text: '' } },
      },
    },
    {
      id: 'center',
      name: '가운데 대사',
      en: 'Centered Lines',
      desc: '서술은 단정하게, 대사는 가운데에 크게',
      style: {
        bg: { color: '#F6F2EF' },
        panel: { on: false, margin: 72 },
        deco: { ornament: 'dots' },
        font: { body: 'nanum-myeongjo', name: 'noto-sans', title: 'nanum-myeongjo', size: 17, lineHeight: 2.05, gap: 24 },
        color: { text: '#1C1719', narr: '#2B2528' },
        dlgStyle: 'center',
        names: { position: 'hidden' },
        divider: 'dots',
        head: { align: 'center', titleSize: 28 },
        foot: { align: 'center' },
      },
      speakers: {
        ritsu: { color: { name: '#C4527A', text: '#9E3D60' } },
        enju: { color: { name: '#B70F2B', text: '#A50E27' } },
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
        bg: { color: '#ECE8E9' },
        panel: { on: false, margin: 36 },
        deco: { ornament: 'none' },
        font: { body: 'noto-sans', name: 'noto-sans', title: 'noto-sans', size: 16, lineHeight: 1.7, gap: 14 },
        color: { text: '#1E191C', narr: '#3E383B', muted: '#837A7E' },
        narr: { align: 'left', scale: 0.94 },
        quotes: 'none',
        emph: { mark: 'color', markColor: '#C8102E', block: 'none' },
        divider: 'dots',
        head: { align: 'center', titleSize: 22 },
        foot: { align: 'center' },
      },
      speakers: {
        ritsu: { side: 'left', color: { name: '#C4527A', text: '', bubble: '#FFFFFF', bubbleText: '#1E191C' } },
        enju: { side: 'right', color: { name: '#B70F2B', text: '', bubble: '#1D1618', bubbleText: '#FFFFFF' } },
        other: { side: 'left', color: { name: '#6F676B', bubble: '#F7F4F5', bubbleText: '#1E191C' } },
      },
    },
    {
      id: 'sakura',
      name: '벚꽃 편지',
      en: 'Sakura Letter',
      desc: '분홍 하트 무늬 위 편지지, 테이프와 도장',
      style: {
        bg: { color: '#F8E6EC', pattern: 'hearts', patternColor: '#E9A6BA', patternOpacity: 0.3 },
        panel: { color: '#FFFDFC', radius: 6, shadow: 0.14, margin: 44, padding: 52 },
        deco: { corners: 'tape', ornament: 'hearts', stamp: true, color1: '#E88AA8', color2: '#C8183A' },
        font: { body: 'gowun-batang', name: 'gowun-dodum', title: 'gowun-batang', size: 17 },
        color: { text: '#2A2226', narr: '#3A3135', accent: '#C8456C', muted: '#9E8790', title: '#2A2226' },
        dlgStyle: 'tint',
        names: { style: 'pill', scale: 0.72 },
        divider: 'hearts',
        head: { align: 'center', titleSize: 28 },
        foot: { align: 'center' },
      },
      speakers: {
        ritsu: { color: { name: '#D06A8D', text: '' } },
        enju: { color: { name: '#C8102E', text: '' } },
      },
    },
    {
      id: 'noir',
      name: '흑적',
      en: 'Noir Rouge',
      desc: '검정과 진홍, 이중선 액자',
      style: {
        bg: { type: 'gradient', color: '#0E0B0C', color2: '#290A10', angle: 165, pattern: 'stripe', patternColor: '#FFFFFF', patternOpacity: 0.03, noise: true },
        panel: { color: '#141011', opacity: 0.92, radius: 2, borderWidth: 3, borderColor: '#6A1E28', borderStyle: 'double', shadow: 0.4, margin: 40, padding: 56 },
        deco: { corners: 'bracket', ornament: 'line', color1: '#E9A1B6', color2: '#E2182F' },
        font: { body: 'hahmlet', name: 'noto-sans', title: 'hahmlet', size: 17 },
        color: { text: '#F2ECEE', narr: '#D6CCD0', accent: '#FF3B52', muted: '#94898D', title: '#FFFFFF' },
        names: { style: 'underline' },
        quotes: '『』',
        emph: { mark: 'underline', markColor: '#FF3B52', block: 'big' },
        head: { align: 'center' },
        foot: { align: 'center' },
      },
      speakers: {
        ritsu: { color: { name: '#F0A8BD', text: '#FBEFF3' } },
        enju: { color: { name: '#FF3B52', text: '#FFFFFF' } },
        other: { color: { name: '#B9AFB3', text: '' } },
      },
    },
    {
      id: 'ash',
      name: '잿빛 대본',
      en: 'Ash Script',
      desc: '회색 모눈 위, 이름 열을 맞춘 대본',
      style: {
        layout: 'script',
        bg: { color: '#E6E3E4', pattern: 'grid', patternColor: '#BDB6B9', patternOpacity: 0.32 },
        panel: { color: '#FBFAFA', radius: 0, borderWidth: 1, borderColor: '#CFC8CB', shadow: 0, margin: 32, padding: 48 },
        deco: { ornament: 'dots', color1: '#D9708F', color2: '#3E383B' },
        font: { body: 'ibm-plex', name: 'ibm-plex', title: 'ibm-plex', size: 16, lineHeight: 1.85 },
        color: { text: '#1F1B1D', narr: '#38323A', accent: '#C4527A', muted: '#857E81' },
        names: { style: 'dot', scale: 0.8 },
        quotes: 'none',
        emph: { mark: 'full', markColor: '#F7D4DF', block: 'bar' },
        divider: 'dots',
      },
      speakers: {
        ritsu: { color: { name: '#C4527A', text: '' } },
        enju: { color: { name: '#B70F2B', text: '' } },
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
