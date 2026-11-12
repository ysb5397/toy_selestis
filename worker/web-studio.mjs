const API = '/ysb5397/web-studio/api/ai/';
const MAX_BODY = 4 * 1024 * 1024;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
async function boundedJson(request) {
  if (!request.body) throw Object.assign(Error('JSON 요청이 필요해.'), { status: 400 });
  const reader = request.body.getReader(), chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY) throw Object.assign(Error('요청이 너무 커. 페이지나 대화를 나눠줘.'), { status: 413 });
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
/** No shared API key, per-user secrets, prompts or histories are stored in Worker memory. */
export async function handleStudioAPI(request, fetchImpl = (...args) => fetch(...args)) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(API)) return null;
  const operation = url.pathname.slice(API.length);
  if (!['responses', 'check'].includes(operation)) return json({ error: '이 웹 버전은 API Key 연결만 지원해. 편집 기록은 브라우저에 저장돼.' }, 404);
  if (request.method !== 'POST') return json({ error: 'POST 요청이 필요해.' }, 405);
  if ((request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: '같은 웹 작업실에서만 요청할 수 있어.' }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return json({ error: 'JSON 요청이 필요해.' }, 415);
  const bearer = request.headers.get('Authorization') || '';
  if (!/^Bearer sk-[A-Za-z0-9_-]{10,500}$/.test(bearer)) return json({ error: '본인의 OpenAI API Key를 먼저 연결해줘.' }, 401);
  let body;
  try { body = await boundedJson(request); } catch (error) { return json({ error: error.status ? error.message : 'JSON 형식을 확인해줘.' }, error.status || 400); }
  if (!body || body.authMode !== 'apiKey') return json({ error: 'API 사용량 결제를 명시적으로 선택해줘. OAuth·공유 Key로 전환하지 않아.' }, 400);
  if (typeof body.model !== 'string' || !/^gpt-[a-zA-Z0-9._-]{1,100}$/.test(body.model)) return json({ error: 'GPT 모델 이름을 확인해줘.' }, 400);
  if (operation === 'responses' && (!Array.isArray(body.input) || !body.input.length || body.input.length > 300 || !Array.isArray(body.tools) || body.tools.length > 30 || body.tools.some(tool => !tool || tool.type !== 'function') || typeof body.instructions !== 'string' || body.instructions.length > 30000)) return json({ error: 'AI 편집 요청 형식이 올바르지 않아.' }, 400);
  const controller = new AbortController(), abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 120000);
  const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', abort); };
  if (request.signal.aborted) { cleanup(); return json({ error: '요청을 중단했어.' }, 499); }
  try {
    const checking = operation === 'check';
    const upstream = await fetchImpl(checking ? `https://api.openai.com/v1/models/${encodeURIComponent(body.model)}` : 'https://api.openai.com/v1/responses', {
      method: checking ? 'GET' : 'POST', headers: { Authorization: bearer, 'Content-Type': 'application/json' }, signal: controller.signal, redirect: 'error',
      ...(checking ? {} : { body: JSON.stringify({ model: body.model, input: body.input, instructions: body.instructions, tools: body.tools, store: false, stream: true, include: ['reasoning.encrypted_content'], parallel_tool_calls: false, max_output_tokens: 12000 }) }),
    });
    if (!upstream.ok) {
      await upstream.body?.cancel(); cleanup();
      return json({ error: upstream.status === 401 ? 'OpenAI API Key 인증에 실패했어.' : upstream.status === 429 ? 'OpenAI API 사용 한도·결제·호출 제한을 확인해줘.' : [403, 404].includes(upstream.status) ? '이 모델에 접근할 수 없어. 모델과 프로젝트 권한을 확인해줘.' : 'OpenAI가 요청을 완료하지 못했어. 모델 지원 여부와 입력 크기를 확인해줘.' }, upstream.status);
    }
    if (checking) { await upstream.body?.cancel(); cleanup(); return json({ ok: true, model: body.model }); }
    if (!upstream.body) throw Error('No stream');
    const reader = upstream.body.getReader();
    const stream = new ReadableStream({
      async pull(target) {
        try { const { done, value } = await reader.read(); if (done) { cleanup(); reader.releaseLock(); target.close(); } else target.enqueue(value); }
        catch { cleanup(); target.error(Error('OpenAI 응답 연결이 끊겼어.')); }
      },
      async cancel() { abort(); cleanup(); await reader.cancel().catch(() => {}); },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { cleanup(); return json({ error: controller.signal.aborted ? '요청이 중단됐거나 대기 시간이 지났어.' : 'OpenAI에 연결하지 못했어. 잠시 후 다시 시도해줘.' }, controller.signal.aborted ? 504 : 502); }
}
