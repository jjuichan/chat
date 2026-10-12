/* Default document, base style, and the design presets */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const baseStyle = () => ({
    skin: 'none', // template graphics (see skins.js)
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
    narr: { italic: false, align: 'left', scale: 1, indent: 0 }, // indent: first-line indent in em
    dlgStyle: 'bar', // bar | tint | center | plain  (novel layout)
    dlgAlign: 'left', // left | center | right  (novel layout)
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
      color: { name: '#E8676D', text: '', bubble: '#FFE3E3', bubbleText: '#2E2629' },
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
      color: { name: '#9B111E', text: '', bubble: '#29252B', bubbleText: '#FFFFFF' },
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
  // palette from the brief
  const RUBY = '#9B111E';
  const BLACK = '#29252B';
  const CORAL = '#FF8F91';
  const SILVER = '#C2C2CA';

  const PRESETS = [
    {
      id: 'thread',
      name: '흰 종이',
      en: 'Paper',
      desc: '하얀 지면에 또렷한 명조. 가장 읽기 편한 기본형',
      style: { deco: { color1: CORAL, color2: RUBY }, color: { accent: RUBY } },
      speakers: {
        ritsu: { side: 'left', color: { name: '#E8676D', text: '', bubble: '#FFE3E3', bubbleText: '#2E2629' } },
        enju: { side: 'right', color: { name: RUBY, text: '', bubble: BLACK, bubbleText: '#FFFFFF' } },
      },
    },
    {
      id: 'diary',
      name: '스트로베리 다이어리',
      en: 'Strawberry Diary',
      desc: '깅엄 체크 위 일기장. 폴라로이드 프사, 딸기 스티커',
      style: {
        skin: 'diary',
        bg: { color: '#FDEFF0', pattern: 'gingham', patternColor: '#F4C2C2', patternOpacity: 0.6, patternScale: 1.2 },
        panel: { color: '#FFFFFF', radius: 16, shadow: 0.14, margin: 46, padding: 46 },
        deco: { ornament: 'none', color1: CORAL, color2: RUBY },
        font: { body: 'gowun-dodum', name: 'jua', title: 'jua', size: 17, lineHeight: 1.9, gap: 20 },
        color: { text: '#3A2A2E', narr: '#45363A', accent: RUBY, muted: '#B08A92', title: RUBY },
        dlgStyle: 'tint',
        names: { position: 'above', style: 'pill', scale: 0.78, avatar: true },
        emph: { mark: 'marker', markColor: '#FFD3D4', block: 'box' },
        divider: 'skin',
        head: { titleSize: 32 },
      },
      speakers: {
        ritsu: { color: { name: CORAL, text: '', bubble: '#FFE3E3', bubbleText: '#2E2629' } },
        enju: { color: { name: RUBY, text: '', bubble: RUBY, bubbleText: '#FFFFFF' } },
      },
    },
    {
      id: 'playlist',
      name: '미드나잇 플레이리스트',
      en: 'Midnight Playlist',
      desc: '차콜 위 음악 플레이어. 대사는 가사처럼',
      style: {
        skin: 'playlist',
        bg: { type: 'gradient', color: '#151217', color2: BLACK, angle: 160, noise: true },
        panel: { color: '#211D24', radius: 18, borderWidth: 1, borderColor: '#3A343D', shadow: 0.35, margin: 36, padding: 44 },
        deco: { ornament: 'none', color1: CORAL, color2: SILVER },
        font: { body: 'noto-sans', name: 'noto-sans', title: 'noto-sans', size: 16, lineHeight: 1.95, gap: 20 },
        color: { text: '#F1ECF2', narr: '#D3CCD6', accent: CORAL, muted: '#8F8794', title: '#FFFFFF' },
        dlgStyle: 'bar',
        names: { style: 'text', scale: 0.74 },
        quotes: '「」',
        emph: { mark: 'underline', markColor: CORAL, block: 'box' },
        divider: 'skin',
        head: { titleSize: 26 },
      },
      speakers: {
        ritsu: { color: { name: CORAL, text: '#FFE8E9', bubble: '#3A2C31', bubbleText: '#FFFFFF' } },
        enju: { color: { name: '#E5384A', text: '#FFFFFF', bubble: RUBY, bubbleText: '#FFFFFF' } },
        other: { color: { name: SILVER, text: '' } },
      },
    },
    {
      id: 'letter',
      name: '러브 레터',
      en: 'Love Letter',
      desc: '레이스 편지지, 밀랍 봉인, 붉은 실',
      style: {
        skin: 'letter',
        bg: { color: '#F3C6C6', noise: true },
        panel: { color: '#FFF9F8', radius: 0, shadow: 0.12, margin: 54, padding: 56 },
        deco: { ornament: 'none', color1: CORAL, color2: RUBY },
        font: { body: 'gowun-batang', name: 'gowun-batang', title: 'nanum-myeongjo', size: 17, lineHeight: 2.0, gap: 22 },
        color: { text: '#3B2A2E', narr: '#45343A', accent: RUBY, muted: '#A88A90', title: '#3B2A2E' },
        narr: { indent: 1 },
        dlgStyle: 'center',
        names: { position: 'hidden' },
        emph: { mark: 'marker', markColor: '#F9D3D3', block: 'none' },
        divider: 'skin',
        head: { titleSize: 28 },
      },
      speakers: {
        ritsu: { color: { name: '#E8676D', text: '#B5464C' } },
        enju: { color: { name: RUBY, text: RUBY } },
      },
    },
    {
      id: 'retroweb',
      name: '레트로 홈페이지',
      en: 'Retro Personal Web',
      desc: '2000년대 개인 홈피. 픽셀 아이콘, 배너, 방문자 카운터',
      style: {
        skin: 'retroweb',
        bg: { color: '#FFF9F8', pattern: 'dots', patternColor: '#F4C2C2', patternOpacity: 1, patternScale: 0.9 },
        panel: { color: '#FFFFFF', radius: 0, borderWidth: 2, borderStyle: 'dashed', borderColor: CORAL, shadow: 0, margin: 30, padding: 0 },
        deco: { ornament: 'none', color1: CORAL, color2: SILVER },
        font: { body: 'noto-sans', name: 'noto-sans', title: 'dotgothic', size: 16, lineHeight: 1.9, gap: 16 },
        color: { text: '#3C3640', narr: '#4B4550', accent: '#FF6F7A', muted: '#9A95A0', title: '#3C3640' },
        dlgStyle: 'plain',
        names: { position: 'inline', style: 'text', scale: 0.88 },
        quotes: '「」',
        emph: { mark: 'full', markColor: '#FFE0E1', block: 'box' },
        divider: 'skin',
        head: { titleSize: 24 },
      },
      speakers: {
        ritsu: { color: { name: '#F07478', text: '' } },
        enju: { color: { name: RUBY, text: '' } },
      },
    },
    {
      id: 'poison',
      name: '스위트 포이즌',
      en: 'Sweet Poison',
      desc: '루비 체크와 체인, 안전핀. 귀엽고 날카롭게',
      style: {
        skin: 'poison',
        bg: { color: '#141114', pattern: 'gingham', patternColor: RUBY, patternOpacity: 0.5, patternScale: 1.4, noise: true },
        panel: { color: '#1A161A', opacity: 0.96, radius: 4, borderWidth: 2, borderColor: RUBY, shadow: 0.5, margin: 50, padding: 52 },
        deco: { ornament: 'none', color1: CORAL, color2: RUBY },
        font: { body: 'noto-sans', name: 'noto-sans', title: 'black-han-sans', size: 16, lineHeight: 1.95, gap: 20 },
        color: { text: '#F3ECF0', narr: '#D6CDD2', accent: '#E0233A', muted: '#8E848A', title: '#FFFFFF' },
        dlgStyle: 'bar',
        names: { style: 'underline', scale: 0.76 },
        emph: { mark: 'underline', markColor: '#E0233A', block: 'box' },
        divider: 'skin',
        head: { titleSize: 38 },
      },
      speakers: {
        ritsu: { color: { name: CORAL, text: '#FFE8E9' } },
        enju: { color: { name: '#E5283C', text: '#FFFFFF' } },
        other: { color: { name: SILVER, text: '' } },
      },
    },
    {
      id: 'midnight',
      name: '한밤',
      en: 'Midnight',
      desc: '장식 없이 어두운 밤, 밝은 글자',
      style: {
        bg: { type: 'gradient', color: '#151113', color2: '#211A1D', angle: 170, noise: true },
        panel: { on: false, margin: 64 },
        deco: { ornament: 'line', color1: CORAL, color2: '#E5384A' },
        font: { body: 'noto-serif', name: 'noto-sans', title: 'noto-serif', size: 17, lineHeight: 2 },
        color: { text: '#F4EEF0', narr: '#D9D0D4', accent: CORAL, muted: '#9C9296', title: '#FFFFFF' },
        dlgStyle: 'bar',
        quotes: '「」',
        emph: { mark: 'underline', markColor: CORAL, block: 'box' },
      },
      speakers: {
        ritsu: { color: { name: CORAL, text: '#FFE9EA', bubble: '#3A2C31', bubbleText: '#F6E9ED' } },
        enju: { color: { name: '#E5384A', text: '#FFFFFF', bubble: RUBY, bubbleText: '#FFFFFF' } },
        other: { color: { name: SILVER, text: '' } },
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
        deco: { corners: 'tape', ornament: 'hearts', stamp: true, color1: CORAL, color2: RUBY },
        font: { body: 'gowun-batang', name: 'gowun-dodum', title: 'gowun-batang', size: 17 },
        color: { text: '#2A2226', narr: '#3A3135', accent: '#C8456C', muted: '#9E8790', title: '#2A2226' },
        dlgStyle: 'tint',
        names: { style: 'pill', scale: 0.72 },
        divider: 'hearts',
        head: { align: 'center', titleSize: 28 },
        foot: { align: 'center' },
      },
      speakers: {
        ritsu: { color: { name: '#F07478', text: '' } },
        enju: { color: { name: RUBY, text: '' } },
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
        deco: { ornament: 'none', color1: CORAL, color2: RUBY },
        font: { body: 'noto-sans', name: 'noto-sans', title: 'noto-sans', size: 16, lineHeight: 1.7, gap: 14 },
        color: { text: '#1E191C', narr: '#3E383B', muted: '#837A7E' },
        narr: { align: 'left', scale: 0.94 },
        quotes: 'none',
        emph: { mark: 'color', markColor: RUBY, block: 'none' },
        divider: 'dots',
        head: { align: 'center', titleSize: 22 },
        foot: { align: 'center' },
      },
      speakers: {
        ritsu: { side: 'left', color: { name: '#E8676D', text: '', bubble: '#FFFFFF', bubbleText: '#1E191C' } },
        enju: { side: 'right', color: { name: RUBY, text: '', bubble: BLACK, bubbleText: '#FFFFFF' } },
        other: { side: 'left', color: { name: '#6F676B', bubble: '#F7F4F5', bubbleText: '#1E191C' } },
      },
    },
  ];

  App.presets = {
    list: PRESETS,
    baseStyle,
    get: (id) => PRESETS.find((p) => p.id === id),
    // style + speaker colours a preset would produce, without touching the document
    compose(p, speakers) {
      const style = U.merge(baseStyle(), p.style);
      if (typeof style.narr.indent === 'boolean') style.narr.indent = style.narr.indent ? 1 : 0;
      const sps = speakers.map((s) => {
        const ov = (p.speakers && (p.speakers[s.id] || p.speakers.other)) || null;
        const base = App.defaultSpeaker(SPEAKER_BASE[s.id] ? s.id : '__x');
        const out = U.clone(s);
        out.color = U.merge(base.color, ov && ov.color);
        if (ov && ov.side) out.side = ov.side;
        else if (SPEAKER_BASE[s.id]) out.side = SPEAKER_BASE[s.id].side;
        return out;
      });
      return { style, speakers: sps };
    },
    apply(p, opts) {
      const st = App.state;
      const r = App.presets.compose(p, st.speakers);
      st.style = r.style;
      // keep the canvas width the user picked unless asked otherwise
      if (opts && opts.keepWidth) st.style.width = opts.keepWidth;
      st.speakers = r.speakers;
      st.presetId = p.id;
    },
  };
})();
