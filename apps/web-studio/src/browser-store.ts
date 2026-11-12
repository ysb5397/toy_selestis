import type { WorkspaceHistory } from "./history-sync";
import type { ChatMessage } from "./ai-agent";
const failure = (message: string, status = 500) => Object.assign(Error(message), { status });
const validFiles = (f: unknown): boolean => !!f && typeof f === "object" && ["html", "css", "js"].every(k => typeof (f as Record<string, unknown>)[k] === "string");
export const validWorkspaceValue = (s: WorkspaceHistory) => s && validFiles(s.files) && typeof s.projectName === "string" && s.projectName.length <= 200 && Array.isArray(s.past) && s.past.length <= 80 && s.past.every(validFiles) && Array.isArray(s.future) && s.future.length <= 80 && s.future.every(validFiles);
export const validMessages = (messages: ChatMessage[]) => Array.isArray(messages) && messages.length <= 40 && messages.every(m => m && ["user", "assistant"].includes(m.role) && typeof m.text === "string" && m.text.length <= 30000 && typeof m.id === "string" && typeof m.at === "string" && Object.keys(m).every(k => ["role", "text", "id", "at"].includes(k)));
type RecordValue = { revision: number; state: WorkspaceHistory | null; savedAt: string | null; recovered: boolean };
const fresh = (): RecordValue => ({ revision: 0, state: null, savedAt: null, recovered: false });
export function createBrowserStore(factory: IDBFactory = globalThis.indexedDB, name = "toy-ysb5397-web-studio") {
  let connection: Promise<IDBDatabase> | null = null;
  function database() {
    if (!factory) return Promise.reject(failure("이 브라우저에서 작업 저장소를 열 수 없어. HTML·기록 백업을 내려받아 보관해줘."));
    return connection ||= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("records");
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = null; }; resolve(request.result); };
      request.onerror = () => { connection = null; reject(failure("브라우저 저장소를 열지 못했어. 저장 공간·브라우저 설정을 확인해줘.")); };
      request.onblocked = () => { reject(failure("다른 Web Studio 창을 닫고 다시 시도해줘.")); };
    });
  }
  async function get<T>(key: string): Promise<T | undefined> {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("records", "readonly"), request = tx.objectStore("records").get(key);
      let result: T | undefined;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(failure("브라우저 작업 기록을 읽지 못했어."));
    });
  }
  async function put(key: string, value: unknown) {
    const db = await database();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(failure("브라우저 저장 공간이 부족하거나 저장할 수 없어. 기록 백업을 내려받아줘."));
    });
  }
  return {
    async readHistory(): Promise<RecordValue> {
      const value = await get<RecordValue>("workspace");
      if (!value) return fresh();
      if (!Number.isSafeInteger(value.revision) || value.revision < 1 || !value.state || !validWorkspaceValue(value.state)) throw failure("저장된 기록 형식을 읽지 못했어. 기존 기록은 유지했어.");
      return value;
    },
    async saveHistory(state: WorkspaceHistory, expectedRevision: number): Promise<RecordValue> {
      if (!validWorkspaceValue(state)) throw failure("작업 기록 형식이 올바르지 않아.", 400);
      if (new TextEncoder().encode(JSON.stringify(state)).byteLength > 16 * 1024 * 1024) throw failure("작업 기록이 16MB를 넘었어. HTML을 내려받아 나눠서 작업해줘.", 413);
      const db = await database();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("records", "readwrite"), store = tx.objectStore("records"), request = store.get("workspace");
        let result: RecordValue, error: Error | undefined;
        request.onsuccess = () => {
          const previous = request.result || fresh();
          if (previous.revision !== expectedRevision) { error = failure("다른 창에서 기록을 변경했어. 덮어쓰지 않았어.", 409); tx.abort(); return; }
          result = { revision: expectedRevision + 1, state, savedAt: new Date().toISOString(), recovered: false };
          store.put(result, "workspace");
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(error || failure("브라우저 작업 저장에 실패했어. 기록 백업을 내려받아줘."));
      });
    },
    async readMessages(): Promise<ChatMessage[]> {
      const value = await get<ChatMessage[]>("messages");
      if (value === undefined) return [];
      if (!validMessages(value)) throw failure("저장된 대화 기록 형식을 읽지 못했어.");
      return value;
    },
    async saveMessages(messages: ChatMessage[]) {
      if (!validMessages(messages)) throw failure("대화 기록 형식이 올바르지 않아.", 400);
      await put("messages", messages);
    },
    async close() { (await connection)?.close(); connection = null; },
  };
}
