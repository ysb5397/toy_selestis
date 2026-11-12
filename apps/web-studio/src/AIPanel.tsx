import { useEffect, useRef, useState } from "react";
import {
  Check,
  KeyRound,
  MousePointer2,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { runGPT, type AIUsage, type ChatMessage } from "./ai-agent";
import { revisionOf, type CommandInput, type CommandResult } from "./commands";
import type { Files } from "./document";
import "./ai.css";
import { studioFetch } from "./studio-fetch";

type Config = {
  configured: boolean;
  source: string;
  defaultModel: string;
  models: string[];
  hosted?: boolean;
  oauth?: {
    available?: boolean;
    connected: boolean;
    activeId: string | null;
    accounts: {
      id: string;
      email: string;
      label: string;
      signedIn: boolean;
      planEnabled: boolean;
    }[];
    pending: boolean;
    attempt: { state: string; message: string };
  };
};
type Log = {
  name: string;
  status: "working" | "done" | "error";
  message?: string;
};
async function api(path: string, method = "GET", body?: unknown) {
  const response = await studioFetch("/api/ai/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Error(result.error || "로컬 AI 서버에 연결하지 못했어.");
  return result;
}
const TOOL_LABELS: Record<string, string> = {
  getDocument: "문서 읽기",
  addElement: "블록 추가",
  setText: "텍스트 수정",
  setStyles: "스타일 편집",
  setAttribute: "속성 수정",
  moveElement: "구조 이동",
  removeElement: "요소 삭제",
  replaceCode: "코드 작성",
  setTimeline: "타임라인 편집",
  addAnimationTrack: "애니메이션 추가",
  saveInteraction: "클릭 동작 연결",
  removeInteraction: "동작 연결 삭제",
};
export function AIPanel(props: {
  open: boolean;
  onClose: () => void;
  getFiles: () => Files;
  selected: string | null;
  run: (input: CommandInput) => CommandResult;
  restore: (files: Files, revision: string) => boolean;
  onBusy: (value: boolean) => void;
  prepare: () => void;
}) {
  const [config, setConfig] = useState<Config | null>(null),
    [settings, setSettings] = useState(true),
    [key, setKey] = useState("");
  const [model, setModel] = useState(
    () => localStorage.getItem("toy-web-studio-gpt-model") || "gpt-6.1-sol",
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [ready, setReady] = useState(false),
    [prompt, setPrompt] = useState("");
  const [authMode, setAuthMode] = useState<"plan" | "apiKey">(() =>
      localStorage.getItem("toy-web-studio-gpt-auth") === "plan"
        ? "plan"
        : "apiKey",
  );
  const [accountChoice, setAccountChoice] = useState("");
  const [planModels, setPlanModels] = useState<{ id: string; name: string }[]>(
      [],
    ),
    [planModel, setPlanModel] = useState(""),
    [modelsLoading, setModelsLoading] = useState(false),
    [loginUrl, setLoginUrl] = useState("");
  const configured =
    authMode === "apiKey"
      ? !!config?.configured
      : !!(
          config?.oauth?.connected &&
          config.oauth.activeId === accountChoice &&
          planModels.some((m) => m.id === planModel)
        );
  const effectiveModel = authMode === "plan" ? planModel : model;
  const [busy, setBusy] = useState(false),
    [connecting, setConnecting] = useState(false),
    [error, setError] = useState(""),
    [saveError, setSaveError] = useState("");
  const [connection, setConnection] = useState(""),
    [stream, setStream] = useState(""),
    [logs, setLogs] = useState<Log[]>([]),
    [usage, setUsage] = useState<AIUsage | null>(null),
    [status, setStatus] = useState("");
  const [animate, setAnimate] = useState(true),
    [cursor, setCursor] = useState<{
      x: number;
      y: number;
      label: string;
      click: boolean;
    } | null>(null);
  const [canRestore, setCanRestore] = useState(false);
  const current = useRef(props),
    controller = useRef<AbortController | null>(null),
    messageRef = useRef<ChatMessage[]>([]),
    snapshot = useRef<Files | null>(null),
    lastRevision = useRef(""),
    scroll = useRef<HTMLDivElement>(null);
  current.current = props;
  const persist = async (next: ChatMessage[]) => {
    messageRef.current = next.slice(-40);
    setMessages(messageRef.current);
    try {
      await api("history", "PUT", { messages: messageRef.current });
      setSaveError("");
    } catch {
      setSaveError("브라우저 대화 기록 저장에 실패했어. 문서 저장과는 별개야.");
    }
  };
  useEffect(() => {
    let disposed = false;
    void Promise.allSettled([api("config"), api("history")]).then(
      ([cfg, history]) => {
        if (disposed) return;
        if (cfg.status === "fulfilled") {
          setConfig(cfg.value);
          setAccountChoice(cfg.value.oauth?.activeId || "");
          if (cfg.value.oauth?.attempt.state === "error")
            setConnection(cfg.value.oauth.attempt.message);
        } else
          setError(
            "웹 작업실을 준비하지 못했어. 새로고침하고 저장소 설정을 확인해줘.",
          );
        if (history.status === "fulfilled") {
          messageRef.current = history.value.messages;
          setMessages(history.value.messages);
          setReady(true);
        } else
          setSaveError(
            "브라우저 대화 기록을 불러오지 못했어. 저장소 설정을 확인한 뒤 새로고침해줘.",
          );
      },
    );
    return () => {
      disposed = true;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, stream, logs, props.open]);
  useEffect(() => {
    if (!props.open || !config?.oauth?.pending) return;
    let disposed = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next: Config = await api("config");
        if (disposed) return;
        setConfig(next);
        if (!next.oauth?.pending) {
          setLoginUrl("");
          setConnection(next.oauth?.attempt.message || "");
          if (next.oauth?.attempt.state === "done")
            setAccountChoice(next.oauth.activeId || "");
          return;
        }
      } catch {
        if (!disposed)
          setConnection(
            "로그인 상태를 확인하지 못했어. 잠시 후 다시 확인할게.",
          );
      }
      if (!disposed) timer = setTimeout(poll, 1200);
    };
    timer = setTimeout(poll, 600);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [props.open, config?.oauth?.pending]);
  useEffect(() => {
    if (authMode !== "plan" || !config?.oauth?.connected) {
      setPlanModels([]);
      setPlanModel("");
      return;
    }
    let disposed = false;
    setModelsLoading(true);
    setPlanModels([]);
    setPlanModel("");
    void api("oauth/models")
      .then((result) => {
        if (!disposed) {
          setPlanModels(result.models);
          setPlanModel(result.models[0]?.id || "");
        }
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      })
      .finally(() => {
        if (!disposed) setModelsLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [
    authMode,
    config?.oauth?.activeId,
    config?.oauth?.connected,
    config?.oauth?.attempt.state,
  ]);
  const oauthAction = async (
    operation: "start" | "select" | "logout" | "cancel",
    id = accountChoice,
  ) => {
    const popup =
      operation === "start"
        ? window.open(
            "about:blank",
            "web-studio-chatgpt-login",
            "width=620,height=780",
          )
        : null;
    if (popup) popup.opener = null;
    setConnecting(true);
    setError("");
    setConnection("");
    try {
      const result = await api("oauth/" + operation, "POST", {
        accountId: id || null,
      });
      if (operation === "start") {
        setLoginUrl(popup ? "" : result.url);
        if (popup) popup.location.href = result.url;
        setConfig(await api("config"));
      } else {
        setConfig(result);
        setAccountChoice(result.oauth?.activeId || "");
        setLoginUrl("");
        setConnection(result.message || result.oauth?.attempt.message || "");
      }
    } catch (e) {
      popup?.close();
      setError(e instanceof Error ? e.message : "로그인하지 못했어.");
    } finally {
      setConnecting(false);
    }
  };
  const configure = async (operation: "connect" | "disconnect" | "check") => {
    setConnecting(true);
    setError("");
    setConnection("");
    try {
      if (operation === "connect") {
        setConfig(await api("key", "PUT", { key }));
        setKey("");
        setConnection("이 탭에 Key를 연결했어.");
      }
      if (operation === "disconnect") {
        setConfig(await api("key", "DELETE"));
        setConnection("Key 연결을 해제했어.");
      }
      if (operation === "check") {
        await api("check", "POST", {
          model: effectiveModel,
          authMode,
          accountId: config?.oauth?.activeId,
        });
        setConnection("인증·모델 조회 성공. 실제 생성은 요청을 보내면 시작해.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "연결하지 못했어.");
    } finally {
      setConnecting(false);
    }
  };
  const submit = async () => {
    if (
      busy ||
      controller.current ||
      !ready ||
      !configured ||
      modelsLoading ||
      connecting ||
      !prompt.trim()
    )
      return;
    const abort = new AbortController();
    controller.current = abort;
    const text = prompt.trim(),
      next: ChatMessage[] = [
        ...messageRef.current,
        {
          id: crypto.randomUUID(),
          role: "user",
          text,
          at: new Date().toISOString(),
        },
      ];
    snapshot.current = { ...current.current.getFiles() };
    lastRevision.current = revisionOf(snapshot.current);
    setCanRestore(false);
    setPrompt("");
    setStream("");
    setLogs([]);
    setUsage(null);
    setError("");
    setStatus("GPT가 문서를 살펴보는 중…");
    setBusy(true);
    current.current.onBusy(true);
    current.current.prepare();
    let answer = "",
      finalNote = "",
      edited = false;
    try {
      await persist(next);
      abort.signal.throwIfAborted();
      await runGPT({
        model: effectiveModel,
        authMode,
        ...(authMode === "plan"
          ? { accountId: config?.oauth?.activeId || undefined }
          : {}),
        messages: next,
        selected: current.current.selected,
        signal: abort.signal,
        run: (input) => {
          const result = current.current.run(input);
          if (result.ok) {
            lastRevision.current = result.revision;
            if (
              input.name !== "getDocument" &&
              revisionOf(snapshot.current!) !== result.revision
            )
              edited = true;
          }
          return result;
        },
        beforeTool: async (input) => {
          if (!animate) return;
          const nodeId = input.args.nodeId || input.args.parentId;
          const node =
            typeof nodeId === "string"
              ? document.querySelector(
                  `[data-node-path="${CSS.escape(nodeId.replace(/^node:/, ""))}"]`,
                )
              : null;
          const element =
            node ||
            document.querySelector(".canvas-shell") ||
            document.querySelector("iframe");
          const rect = element?.getBoundingClientRect();
          if (!rect) return;
          const x = Math.max(
            16,
            Math.min(
              innerWidth - 460,
              rect.left + Math.min(rect.width / 2, 170),
            ),
          );
          const y = Math.max(
            90,
            Math.min(
              innerHeight - 70,
              rect.top + Math.min(rect.height / 2, 100),
            ),
          );
          setCursor({
            x,
            y,
            click: false,
            label: TOOL_LABELS[input.name] || input.name,
          });
          await new Promise<void>((resolve, reject) => {
            const stop = () => {
              clearTimeout(timer);
              reject(abort.signal.reason);
            };
            const timer = setTimeout(() => {
              abort.signal.removeEventListener("abort", stop);
              resolve();
            }, 450);
            abort.signal.addEventListener("abort", stop, { once: true });
            if (abort.signal.aborted) stop();
          });
          setCursor((value) => (value ? { ...value, click: true } : null));
        },
        onEvent: (event) => {
          if (event.type === "text") {
            answer += event.text;
            setStream(answer);
          }
          if (event.type === "usage") setUsage(event.usage);
          if (event.type === "tool-start") {
            setStatus((TOOL_LABELS[event.name] || event.name) + " 중…");
            setLogs((items) => [
              ...items.slice(-47),
              { name: event.name, status: "working" },
            ]);
          }
          if (event.type === "tool-end") {
            setLogs((items) =>
              items.map((item, i) =>
                i === items.length - 1
                  ? {
                      ...item,
                      status: event.ok ? "done" : "error",
                      message: event.message,
                    }
                  : item,
              ),
            );
            setCursor((value) => (value ? { ...value, click: false } : null));
          }
        },
      });
      setStatus("GPT 작업이 끝났어");
      finalNote =
        answer || "요청 처리가 끝났어. 작업 명령 기록과 캔버스를 확인해줘.";
    } catch (e) {
      if (abort.signal.aborted) {
        setStatus("중단했어 · 적용된 작업은 유지돼");
        finalNote = "[작업 중단 · 적용된 변경은 유지됨]";
      } else {
        const message =
          e instanceof Error ? e.message : "GPT 작업을 완료하지 못했어.";
        setError(message);
        setStatus("작업이 멈췄어");
        finalNote = "[작업 중 오류] " + message;
      }
      if (answer) finalNote = answer + "\n\n" + finalNote;
    } finally {
      setCursor(null);
      setStream("");
      setBusy(false);
      current.current.onBusy(false);
      controller.current = null;
      setCanRestore(edited);
      await persist([
        ...next,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: finalNote.slice(0, 30000),
          at: new Date().toISOString(),
        },
      ]);
    }
  };
  if (!props.open) return null;
  return (
    <>
      <section className="ai-panel" aria-label="GPT 작업실">
        <header className="ai-heading">
          <div>
            <Sparkles size={18} />
            <strong>GPT 작업실</strong>
            <span className={configured ? "ai-connected" : ""}>
              {configured
                ? authMode === "plan"
                  ? "ChatGPT 플랜"
                  : "API 결제"
                : "연결 필요"}
            </span>
          </div>
          <button
            disabled={busy}
            aria-label="GPT 패널 닫기"
            onClick={props.onClose}
          >
            <X size={16} />
          </button>
        </header>
        <div className="ai-auth-modes" role="group" aria-label="GPT 사용 방식">
          <button
            disabled={busy || connecting}
            aria-pressed={authMode === "plan"}
            onClick={() => {
              setAuthMode("plan");
              localStorage.setItem("toy-web-studio-gpt-auth", "plan");
              setError("");
              setConnection("");
              setSettings(true);
            }}
          >
            <strong>ChatGPT 플랜</strong>
            <small>계정 로그인 · OAuth</small>
          </button>
          <button
            disabled={busy || connecting}
            aria-pressed={authMode === "apiKey"}
            onClick={() => {
              setAuthMode("apiKey");
              localStorage.setItem("toy-web-studio-gpt-auth", "apiKey");
              setError("");
              setConnection("");
              setSettings(true);
            }}
          >
            <strong>API 사용량 결제</strong>
            <small>API Key 연결</small>
          </button>
        </div>
        <div className="ai-model">
          <label>
            모델
            {authMode === "plan" ? (
              <select
                aria-label="ChatGPT 플랜 모델"
                value={planModel}
                disabled={busy || modelsLoading || !planModels.length}
                onChange={(e) => setPlanModel(e.target.value)}
              >
                <option value="">
                  {modelsLoading
                    ? "모델을 불러오는 중…"
                    : "ChatGPT 로그인 후 선택"}
                </option>
                {planModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label="GPT 모델"
                list="gpt-models"
                value={model}
                disabled={busy || connecting}
                onChange={(e) => {
                  setModel(e.target.value);
                  localStorage.setItem("toy-web-studio-gpt-model", e.target.value);
                  setConnection("");
                }}
              />
            )}
          </label>
          <datalist id="gpt-models">
            {(config?.models || ["gpt-6.1-sol"]).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <button
            aria-label="GPT 연결 설정"
            aria-expanded={settings}
            disabled={busy}
            onClick={() => setSettings(!settings)}
          >
            <Settings2 size={15} />
          </button>
        </div>
        {settings && (
          <div className="ai-settings">
            {authMode === "plan" ? (
              <>
                <label>
                  ChatGPT 계정
                  <select
                    aria-label="ChatGPT 계정"
                    value={accountChoice}
                    disabled={busy || connecting || config?.oauth?.pending}
                    onChange={(e) => {
                      const id = e.target.value;
                      setAccountChoice(id);
                      if (id) void oauthAction("select", id);
                    }}
                  >
                    <option value="">새 ChatGPT 계정으로 로그인</option>
                    {config?.oauth?.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                        {!a.signedIn ? " · 로그아웃됨" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <p>ChatGPT 플랜 OAuth는 로컬 앱용 인증이야. 이 공개 웹 버전에는 아직 연결하지 않았어. 여기서는 API 사용량 결제를 선택해서 사용할 수 있어.</p>
                <div>
                  <button
                    className="ai-siwc"
                    data-oai-siwc-button
                    disabled={busy || connecting || config?.oauth?.pending || config?.oauth?.available === false}
                    onClick={() => void oauthAction("start")}
                  >
                    Continue with ChatGPT
                  </button>
                  <button
                    disabled={
                      busy ||
                      connecting ||
                      !config?.oauth?.accounts.some(
                        (a) => a.id === config.oauth?.activeId && a.signedIn,
                      )
                    }
                    onClick={() => void oauthAction("logout")}
                  >
                    로그아웃
                  </button>
                  {config?.oauth?.pending && (
                    <button
                      disabled={connecting}
                      onClick={() => void oauthAction("cancel")}
                    >
                      로그인 취소
                    </button>
                  )}
                </div>
                {config?.oauth?.pending && (
                  <p role="status">
                    브라우저에서 로그인과 플랜 사용 동의를 완료해줘.
                  </p>
                )}
                {loginUrl && config?.oauth?.pending && (
                  <a href={loginUrl} target="_blank" rel="noreferrer">
                    로그인 창 열기 ↗
                  </a>
                )}
                <a
                  href="https://chatgpt.com/settings/usage"
                  target="_blank"
                  rel="noreferrer"
                >
                  ChatGPT 사용량·연결·크레딧 설정 ↗
                </a>
              </>
            ) : (
              <>
                <label>
                  <KeyRound size={13} />
                  OpenAI API Key
                  <input
                    type="password"
                    autoComplete="off"
                    aria-label="OpenAI API Key"
                    placeholder="sk-…"
                    value={key}
                    disabled={busy || connecting}
                    onChange={(e) => setKey(e.target.value)}
                  />
                </label>
                <p>
                  Key는 이 탭의 메모리에만 보관하고 새로고침하면 지워져. 요청할 때만 이 사이트의 Worker를 거쳐 OpenAI로 전달해.{" "}
                  {config?.source === "environment"
                    ? "현재 OPENAI_API_KEY 환경변수를 사용 중이야."
                    : ""}
                </p>
                <div>
                  <button
                    disabled={!key || busy || connecting}
                    onClick={() => void configure("connect")}
                  >
                    Key 연결
                  </button>
                  <button
                    disabled={!config?.configured || busy || connecting}
                    onClick={() => void configure("check")}
                  >
                    모델 연결 확인
                  </button>
                  <button
                    disabled={!config?.configured || busy || connecting}
                    onClick={() => void configure("disconnect")}
                  >
                    연결 해제
                  </button>
                </div>
                {connecting && <p role="status">연결 확인 중…</p>}
                {connection && <p role="status">{connection}</p>}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenAI에서 API Key 관리 ↗
                </a>
              </>
            )}
            {authMode === "plan" && connection && (
              <p role="status">{connection}</p>
            )}
          </div>
        )}
        <div className="ai-chat" ref={scroll}>
          {!messages.length && (
            <div className="ai-welcome">
              <Sparkles size={26} />
              <h2>같이 웹을 만들어보자.</h2>
              <p>
                현재 페이지를 다듬거나 새로운 초안을 요청해.
                <br />
                GPT가 블록·스타일·동작 명령을 실행해.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  setPrompt(
                    "기존 내용은 유지하면서 모바일에서도 보기 좋게 여백과 글자 크기를 다듬어줘.",
                  )
                }
              >
                모바일 레이아웃 다듬기
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  setPrompt(
                    "현재 페이지 아래에 자주 묻는 질문 섹션을 추가하고 클릭하면 답변이 열리고 닫히게 만들어줘.",
                  )
                }
              >
                클릭으로 열리는 FAQ 추가
              </button>
            </div>
          )}
          {messages.map((message) => (
            <article key={message.id} className={`ai-message ${message.role}`}>
              <span>{message.role === "user" ? "나" : "GPT"}</span>
              <p>{message.text}</p>
            </article>
          ))}
          {stream && (
            <article className="ai-message assistant">
              <span>GPT · 작성 중</span>
              <p>{stream}</p>
            </article>
          )}
        </div>
        {logs.length > 0 && (
          <details className="ai-logs" open={busy}>
            <summary>
              작업 명령 {logs.filter((l) => l.status === "done").length}개 완료
            </summary>
            <ol>
              {logs.map((log, i) => (
                <li key={i} className={log.status}>
                  {log.status === "done" ? <Check size={12} /> : <span>·</span>}
                  <span>
                    {TOOL_LABELS[log.name] || log.name}
                    <code>{log.name}</code>
                    {log.status === "error" && <small>{log.message}</small>}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
        {(error || saveError) && (
          <div className="ai-error" role="alert">
            {error}
            {error && saveError && <br />}
            {saveError}
          </div>
        )}
        <div className="ai-state" role="status">
          {status ||
            (ready ? "요청을 입력해줘" : "설정·대화 기록을 불러오는 중…")}
          {usage && (
            <small>
              완료 응답 {usage.requests}회 · 입력 {usage.input.toLocaleString()}{" "}
              / 출력 {usage.output.toLocaleString()} 토큰
            </small>
          )}
        </div>
        {canRestore && !busy && (
          <button
            className="ai-restore"
            onClick={() => {
              if (
                snapshot.current &&
                current.current.restore(snapshot.current, lastRevision.current)
              ) {
                setCanRestore(false);
                setStatus("이 GPT 작업 시작 전 상태로 되돌렸어");
              } else
                setError(
                  "이후 편집한 내용이 있어서 자동 복원을 멈췄어. 상단 실행 취소를 사용해줘.",
                );
            }}
          >
            <RotateCcw size={13} />
            이번 작업 되돌리기
          </button>
        )}
        <form
          className="ai-compose"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <textarea
            aria-label="GPT 작업 요청"
            placeholder="예: 아래에 가격 안내 카드 3개를 추가해줘"
            maxLength={6000}
            value={prompt}
            disabled={busy || !ready}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <div>
            <label>
              <input
                type="checkbox"
                checked={animate}
                disabled={busy}
                onChange={(e) => setAnimate(e.target.checked)}
              />
              커서로 작업 표시
            </label>
            {busy ? (
              <button
                type="button"
                className="ai-stop"
                onClick={() => {
                  controller.current?.abort();
                  setStatus("중단하는 중…");
                }}
              >
                <Square size={12} />
                중단
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  !configured ||
                  modelsLoading ||
                  !prompt.trim() ||
                  !ready ||
                  connecting
                }
              >
                <Send size={13} />
                요청 보내기
              </button>
            )}
          </div>
          <p>
            현재 HTML·CSS·JS와 최근 대화를 OpenAI로 전송해.{" "}
            {authMode === "plan"
              ? "ChatGPT 플랜 사용량으로 요청해. 추가 크레딧 허용 여부는 ChatGPT 설정을 따라."
              : "API 사용량에 따라 별도 비용이 발생해."}
          </p>
        </form>
      </section>
      {cursor && busy && (
        <div
          aria-hidden="true"
          className={`ai-cursor ${cursor.click ? "clicking" : ""}`}
          style={{ left: cursor.x, top: cursor.y }}
        >
          <MousePointer2 size={25} fill="#b4eed1" />
          <span>GPT · {cursor.label}</span>
        </div>
      )}
    </>
  );
}
