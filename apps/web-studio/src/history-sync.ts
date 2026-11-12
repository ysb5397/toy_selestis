import type { Files } from "./document";
import { studioFetch } from "./studio-fetch";
export type WorkspaceHistory = {
  files: Files;
  past: Files[];
  future: Files[];
  projectName: string;
};
export type SaveStatus =
  "loading" | "saving" | "saved" | "offline" | "conflict";
const CACHE = "toy-web-studio-history-v1";
const RECOVERY = "toy-web-studio-history-recovery";
type Cache = {
  state: WorkspaceHistory;
  baseRevision: number;
  pending: boolean;
};
type Remote = {
  revision: number;
  state: WorkspaceHistory | null;
  savedAt: string | null;
  recovered: boolean;
};
const validFiles = (f: unknown): f is Files =>
  !!f &&
  typeof f === "object" &&
  ["html", "css", "js"].every(
    (k) => typeof (f as Record<string, unknown>)[k] === "string",
  );
export function validWorkspace(s: unknown): s is WorkspaceHistory {
  if (!s || typeof s !== "object") return false;
  const v = s as WorkspaceHistory;
  return (
    validFiles(v.files) &&
    typeof v.projectName === "string" &&
    v.projectName.length <= 200 &&
    Array.isArray(v.past) &&
    Array.isArray(v.future) &&
    v.past.length <= 80 &&
    v.future.length <= 80 &&
    v.past.every(validFiles) &&
    v.future.every(validFiles)
  );
}
export class HistorySync {
  private revision = 0;
  private pending: WorkspaceHistory | null = null;
  private last: WorkspaceHistory | null = null;
  private blocked = false;
  private active: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  constructor(
    private status: (s: SaveStatus, message?: string) => void,
    private storage: Storage,
    private request: typeof fetch = (input, init) =>
      studioFetch(input, init),
  ) {}
  private cache(value: Cache) {
    try {
      this.storage.setItem(CACHE, JSON.stringify(value));
    } catch {
      /* A successful disk write is still valid when browser storage is full. */
    }
  }
  private readCache(): Cache | null {
    try {
      const c = JSON.parse(this.storage.getItem(CACHE) || "null");
      return c &&
        validWorkspace(c.state) &&
        Number.isSafeInteger(c.baseRevision) &&
        typeof c.pending === "boolean"
        ? c
        : null;
    } catch {
      return null;
    }
  }
  private async remote(): Promise<Remote> {
    const response = await this.request("/api/workspace-history", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "기록을 읽지 못했어.");
    if (
      !Number.isSafeInteger(result.revision) ||
      (result.state !== null && !validWorkspace(result.state))
    )
      throw new Error("기록 응답 형식이 올바르지 않아.");
    return result;
  }
  async boot(fallback: WorkspaceHistory): Promise<WorkspaceHistory> {
    this.status("loading");
    const cached = this.readCache();
    try {
      const remote = await this.remote();
      this.revision = remote.revision;
      if (
        cached?.pending &&
        cached.baseRevision !== remote.revision &&
        JSON.stringify(cached.state) !== JSON.stringify(remote.state)
      ) {
        this.revision = cached.baseRevision;
        this.last = cached.state;
        this.pending = cached.state;
        this.blocked = true;
        this.status(
          "conflict",
          "다른 창에서 기록이 바뀌었어. 현재 복구본은 브라우저에 보관했어.",
        );
        return cached.state;
      }
      const state = cached?.pending
        ? cached.state
        : remote.state || cached?.state || fallback;
      this.last = state;
      if (cached?.pending || !remote.state) {
        this.pending = state;
        this.cache({ state, baseRevision: this.revision, pending: true });
        this.status("saving");
        void this.flush();
      } else {
        this.cache({ state, baseRevision: this.revision, pending: false });
        this.status(
          "saved",
          remote.recovered ? "이전 백업 파일에서 기록을 복원했어." : undefined,
        );
      }
      return state;
    } catch (error) {
      this.last = cached?.state || fallback;
      this.pending = this.last;
      this.blocked = true;
      this.status(
        "offline",
        error instanceof Error ? error.message : "브라우저 기록에 연결하지 못했어.",
      );
      return this.last;
    }
  }
  schedule(state: WorkspaceHistory) {
    if (this.stopped) return;
    if (JSON.stringify(this.last) === JSON.stringify(state)) return;
    this.last = state;
    this.pending = state;
    this.cache({ state, baseRevision: this.revision, pending: true });
    if (this.blocked) return;
    this.status("saving");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 250);
  }
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.active) return this.active;
    if (this.blocked || this.stopped || !this.pending) return;
    this.active = (async () => {
      while (this.pending && !this.blocked && !this.stopped) {
        const state = this.pending;
        this.pending = null;
        try {
          const body = JSON.stringify({ revision: this.revision, state });
          const response = await this.request("/api/workspace-history", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: new TextEncoder().encode(body).length < 60000,
            signal: AbortSignal.timeout(10000),
          });
          const result = await response.json();
          if (!response.ok) {
            if (response.status === 409) {
              this.blocked = true;
              this.status("conflict", result.error);
            }
            throw new Error(result.error || "기록 브라우저 저장에 실패했어.");
          }
          this.revision = result.revision;
          this.cache({
            state: this.pending || state,
            baseRevision: this.revision,
            pending: !!this.pending,
          });
          if (!this.pending) this.status("saved");
        } catch (error) {
          this.pending = this.pending || state;
          this.cache({
            state: this.pending,
            baseRevision: this.revision,
            pending: true,
          });
          if (!this.blocked) {
            this.blocked = true;
            this.status(
              "offline",
              error instanceof Error ? error.message : "브라우저 저장에 실패했어.",
            );
          }
          break;
        }
      }
    })();
    try {
      await this.active;
    } finally {
      this.active = null;
    }
  }
  async retry() {
    try {
      const remote = await this.remote();
      if (remote.revision !== this.revision) {
        this.status(
          "conflict",
          "다른 창에서 기록이 바뀌었어. 저장된 브라우저 기록을 불러와줘.",
        );
        return;
      }
      this.blocked = false;
      this.status("saving");
      await this.flush();
    } catch (error) {
      this.status(
        "offline",
        error instanceof Error ? error.message : "다시 연결하지 못했어.",
      );
    }
  }
  async restoreRemote(): Promise<WorkspaceHistory | null> {
    const remote = await this.remote();
    if (!remote.state) return null;
    if (this.last)
      this.storage.setItem(
        RECOVERY,
        JSON.stringify({ version: 1, state: this.last }),
      );
    this.blocked = false;
    this.revision = remote.revision;
    this.pending = null;
    this.last = remote.state;
    this.cache({
      state: remote.state,
      baseRevision: this.revision,
      pending: false,
    });
    this.status("saved");
    return remote.state;
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }
}
