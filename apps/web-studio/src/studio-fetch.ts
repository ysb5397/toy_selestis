import { createBrowserStore } from "./browser-store";
export const STUDIO_BASE = "/ysb5397/web-studio";
const MODELS = ["gpt-6.1-sol", "gpt-6-astra", "gpt-6.1-terra", "gpt-6-luna"];
export function createStudioRequest(store = createBrowserStore(), request: typeof fetch = (...args) => globalThis.fetch(...args)) {
  let apiKey = "";
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  const config = () => ({ hosted: true, configured: !!apiKey, source: apiKey ? "browser-session" : "none", defaultModel: MODELS[0], models: MODELS, oauth: { available: false, connected: false, activeId: null, accounts: [], pending: false, attempt: { state: "idle", message: "공개 웹 버전에서는 로컬 앱용 OAuth를 지원하지 않아." } } });
  const studioRequest: typeof fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init.method || "GET";
    init.signal?.throwIfAborted();
    try {
      if (url === "/api/workspace-history") {
        if (method === "GET") return response(await store.readHistory());
        if (method === "PUT") { const data = JSON.parse(String(init.body)); const record = await store.saveHistory(data.state, data.revision); return response({ revision: record.revision, savedAt: record.savedAt }); }
      }
      if (url === "/api/ai/history") {
        if (method === "GET") return response({ messages: await store.readMessages() });
        if (method === "PUT") { await store.saveMessages(JSON.parse(String(init.body)).messages); return response({ saved: true }); }
      }
      if (url === "/api/ai/config") return response(config());
      if (url === "/api/ai/key") {
        if (method === "DELETE") { apiKey = ""; return response(config()); }
        if (method === "PUT") {
          const key = JSON.parse(String(init.body)).key;
          if (typeof key !== "string" || !/^sk-[A-Za-z0-9_-]{10,500}$/.test(key.trim())) return response({ error: "OpenAI API Key 형식을 확인해줘." }, 400);
          apiKey = key.trim(); return response(config());
        }
      }
      if (url === "/api/ai/responses" || url === "/api/ai/check") {
        if (!apiKey) return response({ error: "API Key를 먼저 연결해줘." }, 401);
        const body = JSON.parse(String(init.body));
        if (body.authMode !== "apiKey") return response({ error: "공개 웹 버전의 API 사용량 결제를 선택해줘. 로컬 OAuth로 자동 전환하지 않아." }, 400);
        const headers = new Headers(init.headers); headers.set("Authorization", "Bearer " + apiKey);
        return await request(STUDIO_BASE + url, { ...init, headers, cache: "no-store", credentials: "omit", redirect: "error" });
      }
      if (url.startsWith("/api/ai/oauth/")) return response({ error: "ChatGPT 플랜 OAuth는 로컬 앱용이야. 이 공개 웹 버전에서는 API Key로 연결할 수 있어." }, 501);
      return await request(input, init);
    } catch (error) {
      if (init.signal?.aborted) throw error;
      const failure = error as Error & { status?: number };
      return response({ error: failure.status ? failure.message : "브라우저 저장 또는 서버 요청에 실패했어. 기록 백업과 연결 상태를 확인해줘." }, failure.status || 500);
    }
  };
  return studioRequest;
}
export const studioFetch = createStudioRequest();
