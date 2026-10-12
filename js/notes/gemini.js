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
    // err.blocked: Google refused the content; err.tooLong: the answer was cut off.
    // The collect screen reacts to both by splitting the log into smaller pieces.
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      const err = new Error(`Gemini가 이 대화를 처리하지 않았어요 (${data.promptFeedback.blockReason}).`);
      err.blocked = true;
      throw err;
    }
    const cand = (data.candidates || [])[0];
    const text = cand && cand.content ? (cand.content.parts || []).map((p) => p.text || '').join('') : '';
    const why = cand && cand.finishReason;
    if (/SAFETY|PROHIBITED|BLOCKLIST|SPII/.test(why || '')) {
      const err = new Error(`Gemini가 안전 필터 때문에 답하지 않았어요 (${why}).`);
      err.blocked = true;
      throw err;
    }
    if (why === 'MAX_TOKENS' && schema) {
      const err = new Error('대화가 너무 길어서 결과가 잘렸어요.');
      err.tooLong = true;
      throw err;
    }
    if (!text) throw new Error('빈 응답이 왔어요. 다시 시도해 주세요.');
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
    // target: 'ritsu' | 'enju' | 'both'. With 'both', Gemini also says whose fact each item is.
    async extract(log, target, keys) {
      const both = target === 'both';
      const ids = both ? ['ritsu', 'enju'] : [target];
      const R = N.CHARS.ritsu;
      const E = N.CHARS.enju;
      const known = ids
        .map((id) => {
          const list = N.facts(id)
            .filter((f) => f.status !== 'hold' || f.conflicts.length)
            .map((f) => `[${f.id}] (${N.catLabel(f.cat, id)}) ${f.text}`)
            .join('\n');
          return `[이미 아는 ${N.CHARS[id].name} 설정]\n${list || '(아직 없음)'}`;
        })
        .join('\n\n');
      const cats = N.CATS.map((x) => `- ${x.id}: ${x.id === 'rel' ? '상대와의 관계' : x.label}${x.hint ? ` (${x.hint})` : ''}`).join('\n');
      const who = both ? `${R.name}와 ${E.name} 두 사람` : N.CHARS[target].name;
      const ex = both ? R : N.CHARS[target];
      const exOther = N.CHARS[ex.other];

      const system = [
        `너는 AI 캐릭터 채팅 로그에서 캐릭터 설정을 수집하는 기록 담당이야.`,
        `등장인물:`,
        `- ritsu = ${R.full} (${R.ja}). 로그에서 이렇게도 불려: ${N.aliases('ritsu').join(', ')}.`,
        `- enju = ${E.full} (${E.ja}). 로그에서 이렇게도 불려: ${N.aliases('enju').join(', ')}.`,
        `수집 대상: ${who}.`,
        ``,
        `규칙:`,
        `1. ${who}에 대해 로그에서 드러난 ‘오래 유지되는 설정’만 뽑아. 생일·나이·외모·성격·취향·과거·말버릇·호칭·인간관계·상대와의 관계 등.`,
        `2. 그 장면에서만의 일시적인 행동이나 기분(예: 지금 커피를 마심, 지금 화남)은 뽑지 마. 단, 반복되는 습관이나 성격을 보여주면 설정으로 정리해.`,
        `3. 로그에 근거가 없는 건 절대 추측하거나 지어내지 마.`,
        both
          ? `4. character에는 그 설정의 주인을 적어 (ritsu 또는 enju). 누가 한 말인지가 아니라 누구에 대한 설정인지로 정해. 예: 엔쥬가 "리츠는 단 걸 싫어하잖아"라고 했다면 ritsu. 리츠가 엔쥬를 부르는 호칭은 ritsu의 말버릇·호칭. 둘에게 똑같이 해당하는 관계 설정은 각자 하나씩 뽑아.`
          : `4. character는 항상 ${target}. ${exOther.name}에 대한 정보는 뽑지 마. 둘의 관계에 대한 것만 rel 카테고리로 뽑아.`,
        `   주인이 누군지 로그만으로 확실하지 않으면 뽑지 마.`,
        `   성적인 취향·성향·스킨십 습관처럼 은밀한 설정은 adult 카테고리로 뽑아. 장면을 묘사하지 말고 설정만 담백하게 적어 (예: "목덜미에 약함").`,
        `5. fact는 한국어 한 문장, 60자 이내, 명사형이나 ‘~함’체로 간결하게. 주어(이름)는 빼고 써 (예: "단 음식을 싫어함", "${exOther.name}를 둘이 있을 때만 이름으로 부름").`,
        `6. quote에는 근거가 된 부분을 로그에서 글자 그대로 복사해 넣어 (150자 이내). 바꾸거나 요약하지 마.`,
        `7. 같은 인물의 이미 아는 설정 목록과 비교해서 relation을 정해:`,
        `   - same: 이미 목록에 같은 내용이 있음 → relatedId에 그 id. 이미 아는 설정이라도 이 로그에 근거가 보이면 빠짐없이 same으로 포함해 (근거를 모으는 용도야).`,
        `   - conflict: 목록의 내용과 모순됨 → relatedId에 그 id, reason에 무엇이 어긋나는지 짧게`,
        `   - new: 목록에 없는 새로운 내용`,
        `8. 같은 내용을 여러 번 뽑지 마. 하나의 설정에 근거가 여러 개면 가장 분명한 것 하나만.`,
        ``,
        `카테고리:`,
        cats,
      ].join('\n');

      const prompt = [known, '', '[채팅 로그]', log].join('\n');

      const schema = {
        type: 'OBJECT',
        properties: {
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                character: { type: 'STRING', enum: ids },
                category: { type: 'STRING', enum: N.CATS.map((x) => x.id) },
                fact: { type: 'STRING' },
                quote: { type: 'STRING' },
                relation: { type: 'STRING', enum: ['new', 'same', 'conflict'] },
                relatedId: { type: 'STRING' },
                reason: { type: 'STRING' },
              },
              required: ['character', 'category', 'fact', 'quote', 'relation'],
              propertyOrdering: ['character', 'category', 'fact', 'quote', 'relation', 'relatedId', 'reason'],
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
          const char = ids.includes(it.character) ? it.character : ids[0];
          // a "same"/"conflict" link only counts if it points at a fact of the same person
          const rel = N.state.facts[it.relatedId] && N.state.facts[it.relatedId].char === char ? it.relatedId : null;
          return {
            key: N.util.uid(),
            char,
            cat: N.CATS.some((x) => x.id === it.category) ? it.category : 'etc',
            text: String(it.fact).trim(),
            quote: String(it.quote || '').trim(),
            relation: rel ? it.relation : 'new',
            relatedId: rel,
            reason: String(it.reason || '').trim(),
            quoteFound: !!it.quote && logN.includes(N.util.norm(it.quote)),
          };
        })
        .map((it) => Object.assign(it, { quote: N.util.locate(log, it.quote) || it.quote }));
    },

    // For each given fact, find the passage in the log that backs it up. Returns [{factId, quote}],
    // keeping only quotes that really are in the log (as the exact original text).
    async findEvidence(log, facts, keys) {
      if (!facts.length) return [];
      const list = facts.map((f) => `[${f.id}] (${N.CHARS[f.char].name}) ${f.text}`).join('\n');
      const system = [
        `너는 캐릭터 설정의 근거를 채팅 로그에서 찾아 주는 기록 담당이야.`,
        `등장인물: ${N.CHARS.ritsu.full}(별칭: ${N.aliases('ritsu').join(', ')}), ${N.CHARS.enju.full}(별칭: ${N.aliases('enju').join(', ')}).`,
        `규칙:`,
        `1. 설정 목록의 각 항목에 대해, 로그에서 그 설정을 보여주거나 뒷받침하는 부분을 찾아.`,
        `2. quote에는 로그의 해당 부분을 글자 그대로 복사해 (150자 이내). 바꾸거나 요약하지 마.`,
        `3. 근거가 분명하지 않은 설정은 결과에서 빼. 억지로 찾지 마.`,
        `4. 한 설정에 근거가 여러 곳이면 가장 분명한 것 최대 2개.`,
      ].join('\n');
      const schema = {
        type: 'OBJECT',
        properties: {
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { factId: { type: 'STRING' }, quote: { type: 'STRING' } },
              required: ['factId', 'quote'],
              propertyOrdering: ['factId', 'quote'],
            },
          },
        },
        required: ['items'],
      };
      const text = await generate({ system, prompt: `[설정 목록]\n${list}\n\n[채팅 로그]\n${log}`, schema, keys });
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error('Gemini 응답을 읽지 못했어요. 다시 시도해 주세요.');
      }
      const ok = new Set(facts.map((f) => f.id));
      return (parsed.items || [])
        .filter((it) => it && ok.has(it.factId))
        .map((it) => ({ factId: it.factId, quote: N.util.locate(log, it.quote) }))
        .filter((it) => it.quote);
    },

    // Turn a passage the user picked into a short fact line.
    async factFromQuote(quote, keys) {
      const schema = {
        type: 'OBJECT',
        properties: {
          character: { type: 'STRING', enum: ['ritsu', 'enju'] },
          category: { type: 'STRING', enum: N.CATS.map((x) => x.id) },
          fact: { type: 'STRING' },
        },
        required: ['character', 'category', 'fact'],
      };
      const text = await generate({
        system: [
          `너는 채팅 로그의 한 대목에서 캐릭터 설정을 한 줄로 정리하는 기록 담당이야.`,
          `등장인물: ritsu = ${N.CHARS.ritsu.full}(별칭: ${N.aliases('ritsu').join(', ')}), enju = ${N.CHARS.enju.full}(별칭: ${N.aliases('enju').join(', ')}).`,
          `대목에서 알 수 있는 오래 유지되는 설정 하나를 한국어 한 문장, 60자 이내, ‘~함’체로 써. 주어(이름)는 빼.`,
          `character는 누구에 대한 설정인지(누가 말했는지가 아니라). 은밀한 성적 취향은 adult 카테고리, 장면 묘사 없이 담백하게.`,
          `카테고리: ${N.CATS.map((c) => c.id + '=' + c.label).join(', ')}`,
        ].join('\n'),
        prompt: quote,
        schema,
        keys,
      });
      try {
        const r = JSON.parse(text);
        return { char: N.CHARS[r.character] ? r.character : 'ritsu', cat: N.CATS.some((c) => c.id === r.category) ? r.category : 'etc', text: String(r.fact || '').trim() };
      } catch (e) {
        throw new Error('Gemini 응답을 읽지 못했어요. 다시 시도해 주세요.');
      }
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
