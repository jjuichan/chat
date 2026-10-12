/* 리츠 노트 — Gemini calls (extraction and summary compression)
   The API key is read from device settings and sent only to Google. */
(function () {
  'use strict';
  const N = window.Notes;
  const BASE = 'https://generativelanguage.googleapis.com/v1beta';

  // Role-play logs trip the default filters easily; this is the user's own fiction.
  const SAFETY = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map(
    (category) => ({ category, threshold: 'BLOCK_NONE' })
  );

  function friendly(status, msg) {
    const m = String(msg || '');
    if (/API_KEY_INVALID|API key not valid/i.test(m)) return 'API 키가 올바르지 않아요. 설정 탭에서 키를 다시 확인해 주세요.';
    if (status === 403) return '이 API 키로는 Gemini를 쓸 수 없어요. Google AI Studio에서 키를 확인하고, 키에 웹사이트 제한을 걸었다면 이 페이지 주소가 허용돼 있는지 봐 주세요.';
    if (status === 404) return `모델을 찾을 수 없어요 (${N.settings.model}). 설정 탭에서 ‘목록 불러오기’로 모델을 다시 골라 주세요.`;
    if (status === 429) return '사용량 한도에 걸렸어요. 잠시 뒤에 다시 시도하거나, 설정 탭에 유료 키도 넣어 두면 한도가 찰 때 자동으로 넘어가요.';
    if (status >= 500) return 'Gemini 서버가 잠시 불안정해요. 조금 뒤에 다시 시도해 주세요.';
    return m || `요청이 실패했어요 (${status}).`;
  }

  const KEY_LABEL = { free: '무료 키', paid: '유료 키' };
  const keyOf = (which) => String((which === 'paid' ? N.settings.geminiPaidKey : N.settings.geminiKey) || '').trim();

  async function callWith(which, path, body) {
    const key = keyOf(which);
    let res;
    try {
      res = await fetch(`${BASE}/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: Object.assign({ 'x-goog-api-key': key }, body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error('Gemini에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`${KEY_LABEL[which]}: ${friendly(res.status, data.error && data.error.message)}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // keys: 'auto' = free key first, paid key if the free quota is used up; 'paid' = paid key only.
  // Reports which key actually answered through N.gemini.lastKey.
  async function call(path, body, keys) {
    const free = keyOf('free');
    const paid = keyOf('paid');
    if (keys === 'paid') {
      if (!paid) throw new Error('유료 키가 없어요. 설정 탭에서 유료 키를 넣어 주세요.');
      N.gemini.lastKey = 'paid';
      return callWith('paid', path, body);
    }
    if (!free && !paid) throw new Error('Gemini API 키가 없어요. 설정 탭에서 먼저 입력해 주세요.');
    if (!free) {
      N.gemini.lastKey = 'paid';
      return callWith('paid', path, body);
    }
    try {
      N.gemini.lastKey = 'free';
      return await callWith('free', path, body);
    } catch (e) {
      if (e.status !== 429 || !paid) throw e;
      N.gemini.lastKey = 'fallback';
      return callWith('paid', path, body);
    }
  }

  async function generate({ system, prompt, schema, temperature, keys }) {
    const data = await call(`models/${encodeURIComponent(N.settings.model || 'gemini-2.5-flash')}:generateContent`, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      safetySettings: SAFETY,
      generationConfig: Object.assign(
        { temperature: temperature == null ? 0.2 : temperature },
        schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}
      ),
    }, keys);
    if (data.promptFeedback && data.promptFeedback.blockReason)
      throw new Error(`Gemini가 이 대화를 처리하지 않았어요 (${data.promptFeedback.blockReason}). 문제가 될 만한 부분을 빼고 다시 시도해 주세요.`);
    const cand = (data.candidates || [])[0];
    const text = cand && cand.content ? (cand.content.parts || []).map((p) => p.text || '').join('') : '';
    if (!text) {
      const why = cand && cand.finishReason;
      throw new Error(why === 'SAFETY' ? 'Gemini가 안전 필터 때문에 답하지 않았어요. 일부를 빼고 다시 시도해 주세요.' : '빈 응답이 왔어요. 다시 시도해 주세요.');
    }
    if (cand.finishReason === 'MAX_TOKENS' && schema)
      throw new Error('대화가 너무 길어서 결과가 잘렸어요. 대화를 두세 부분으로 나눠서 넣어 주세요.');
    return text;
  }

  N.gemini = {
    lastKey: null,
    hasKey: (which) => !!keyOf(which),

    async listModels() {
      const data = await call('models?pageSize=200', null, keyOf('free') ? 'auto' : 'paid');
      return (data.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini/i.test(m.name))
        .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName || m.name }));
    },

    // Check one key on its own (no fallback), so each box in settings gets its own verdict.
    async test(which) {
      await callWith(which, `models/${encodeURIComponent(N.settings.model || 'gemini-2.5-flash')}:generateContent`, {
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
        generationConfig: { temperature: 0 },
      });
    },

    // Pull facts about one character out of a chat log.
    async extract(log, charId, keys) {
      const c = N.CHARS[charId];
      const other = N.CHARS[c.other];
      const known = N.facts(charId)
        .filter((f) => f.status !== 'hold' || f.conflicts.length)
        .map((f) => `[${f.id}] (${N.catLabel(f.cat, charId)}) ${f.text}`)
        .join('\n');
      const cats = N.CATS.map((x) => `- ${x.id}: ${N.catLabel(x.id, charId)}${x.hint ? ` (${x.hint})` : ''}`).join('\n');

      const system = [
        `너는 AI 캐릭터 채팅 로그에서 캐릭터 설정을 수집하는 기록 담당이야.`,
        `대상 캐릭터: ${c.full} (${c.ja}). 로그에서 이렇게도 불려: ${N.aliases(charId).join(', ')}.`,
        `상대 캐릭터: ${other.full} (${other.ja}). 다른 이름: ${N.aliases(other.id).join(', ')}.`,
        ``,
        `규칙:`,
        `1. ${c.name}에 대해 로그에서 드러난 ‘오래 유지되는 설정’만 뽑아. 생일·나이·외모·성격·취향·과거·말버릇·호칭·인간관계·${other.name}와의 관계 등.`,
        `2. 그 장면에서만의 일시적인 행동이나 기분(예: 지금 커피를 마심, 지금 화남)은 뽑지 마. 단, 반복되는 습관이나 성격을 보여주면 설정으로 정리해.`,
        `3. 로그에 근거가 없는 건 절대 추측하거나 지어내지 마.`,
        `4. ${other.name}에 대한 정보는 뽑지 마. 둘의 관계에 대한 것만 rel 카테고리로 뽑아.`,
        `5. fact는 한국어 한 문장, 60자 이내, 명사형이나 ‘~함’체로 간결하게 (예: "단 음식을 싫어함", "${other.name}를 둘이 있을 때만 이름으로 부름").`,
        `6. quote에는 근거가 된 부분을 로그에서 글자 그대로 복사해 넣어 (150자 이내). 바꾸거나 요약하지 마.`,
        `7. 이미 아는 설정 목록과 비교해서 relation을 정해:`,
        `   - same: 이미 목록에 같은 내용이 있음 → relatedId에 그 id`,
        `   - conflict: 목록의 내용과 모순됨 → relatedId에 그 id, reason에 무엇이 어긋나는지 짧게`,
        `   - new: 목록에 없는 새로운 내용`,
        `8. 같은 내용을 여러 번 뽑지 마. 하나의 설정에 근거가 여러 개면 가장 분명한 것 하나만.`,
        ``,
        `카테고리:`,
        cats,
      ].join('\n');

      const prompt = [`[이미 아는 ${c.name} 설정]`, known || '(아직 없음)', '', '[채팅 로그]', log].join('\n');

      const schema = {
        type: 'OBJECT',
        properties: {
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                category: { type: 'STRING', enum: N.CATS.map((x) => x.id) },
                fact: { type: 'STRING' },
                quote: { type: 'STRING' },
                relation: { type: 'STRING', enum: ['new', 'same', 'conflict'] },
                relatedId: { type: 'STRING' },
                reason: { type: 'STRING' },
              },
              required: ['category', 'fact', 'quote', 'relation'],
              propertyOrdering: ['category', 'fact', 'quote', 'relation', 'relatedId', 'reason'],
            },
          },
        },
        required: ['items'],
      };

      const text = await generate({ system, prompt, schema, keys });
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error('Gemini 응답을 읽지 못했어요. 다시 시도해 주세요.');
      }
      const logN = N.util.norm(log);
      return (parsed.items || [])
        .filter((it) => it && it.fact)
        .map((it) => {
          const rel = N.state.facts[it.relatedId] && N.state.facts[it.relatedId].char === charId ? it.relatedId : null;
          return {
            key: N.util.uid(),
            cat: N.CATS.some((x) => x.id === it.category) ? it.category : 'etc',
            text: String(it.fact).trim(),
            quote: String(it.quote || '').trim(),
            relation: rel ? it.relation : 'new',
            relatedId: rel,
            reason: String(it.reason || '').trim(),
            quoteFound: !!it.quote && logN.includes(N.util.norm(it.quote)),
          };
        });
    },

    // Shorten the summary to fit a character-memory box.
    async compress(text, limit, charId) {
      const c = N.CHARS[charId];
      const out = await generate({
        system: [
          `너는 AI 캐릭터 채팅의 메모리/설정란에 넣을 캐릭터 설정 요약을 쓰는 편집자야.`,
          `주어진 ${c.full} 설정 목록을 ${limit}자 이내로 압축해.`,
          `- 목록에 없는 내용은 절대 추가하지 마.`,
          `- 중요도: 핵심 성격·말투·호칭·관계 > 기본 정보 > 취향 > 기타. 넘치면 덜 중요한 것부터 뺀다.`,
          `- 형식: 카테고리별로 "카테고리: 항목, 항목" 한 줄씩. 꾸밈말 없이 결과만 출력해.`,
        ].join('\n'),
        prompt: text,
        temperature: 0.3,
      });
      return out.trim();
    },
  };
})();
