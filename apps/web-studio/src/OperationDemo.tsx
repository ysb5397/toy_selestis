import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  CircleAlert,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import { parse, pathOf, type Files } from "./document";
import { revisionOf, type CommandInput, type CommandResult } from "./commands";

type Props = {
  files: Files;
  run: (input: CommandInput) => CommandResult;
  restore: (files: Files, revision: string) => boolean;
  onBusy: (busy: boolean) => void;
  prepare: () => void;
};
type Status = "ready" | "playing" | "paused" | "done" | "cancelled" | "error";
const steps = [
  { label: "현재 페이지 구조 읽기", tool: "getDocument", target: "canvas" },
  { label: "안내 섹션 추가", tool: "addElement", target: "block-section" },
  { label: "배경과 여백 구성", tool: "setStyles", target: "background" },
  { label: "제목 블록 추가", tool: "addElement", target: "block-h2" },
  { label: "제목 텍스트 입력", tool: "setText", target: "text" },
  { label: "설명 블록 추가", tool: "addElement", target: "block-p" },
  { label: "버튼 블록 추가", tool: "addElement", target: "block-button" },
  { label: "마지막 간격 다듬기", tool: "setStyles", target: "gap" },
];
const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export function OperationDemo(props: Props) {
  const [open, setOpen] = useState(false),
    [status, setStatus] = useState<Status>("ready"),
    [step, setStep] = useState(-1),
    [completed, setCompleted] = useState(0),
    [error, setError] = useState(""),
    [cursor, setCursor] = useState<{
      x: number;
      y: number;
      click: boolean;
    } | null>(null),
    [speed, setSpeed] = useState(1);
  const current = useRef(props),
    control = useRef({ cancel: false, paused: false, generation: 0 }),
    snapshot = useRef<Files | null>(null),
    lastRevision = useRef(""),
    speedRef = useRef(speed);
  current.current = props;
  speedRef.current = speed;
  const busy = status === "playing" || status === "paused";
  useEffect(
    () => () => {
      control.current.cancel = true;
      control.current.generation++;
    },
    [],
  );
  useEffect(() => {
    if (!busy) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        control.current.cancel = true;
        control.current.paused = false;
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [busy]);
  const start = async () => {
    if (busy) return;
    snapshot.current = { ...current.current.files };
    lastRevision.current = revisionOf(snapshot.current);
    const generation = ++control.current.generation;
    control.current.cancel = false;
    control.current.paused = false;
    current.current.prepare();
    current.current.onBusy(true);
    setStatus("playing");
    setCompleted(0);
    setError("");
    setStep(0);
    let section = "",
      heading = "";
    const check = async () => {
      while (
        control.current.paused &&
        !control.current.cancel &&
        generation === control.current.generation
      )
        await delay(60);
      if (control.current.cancel || generation !== control.current.generation)
        throw new Error("CANCELLED");
    };
    const wait = async (ms: number) => {
      let elapsed = 0;
      while (elapsed < ms) {
        await check();
        await delay(50);
        elapsed += 50 * speedRef.current;
      }
      await check();
    };
    try {
      for (let i = 0; i < steps.length; i++) {
        await check();
        setStep(i);
        await wait(200);
        const el =
          document.querySelector(`[data-demo="${steps[i].target}"]`) ||
          document.querySelector('[data-demo="canvas"]');
        const r = el?.getBoundingClientRect();
        if (r)
          setCursor({
            x: Math.max(
              12,
              Math.min(innerWidth - 140, r.left + r.width * 0.58),
            ),
            y: Math.max(
              70,
              Math.min(innerHeight - 250, r.top + Math.min(r.height / 2, 140)),
            ),
            click: false,
          });
        await wait(650);
        setCursor((prev) => (prev ? { ...prev, click: true } : null));
        await wait(170);
        const args: Record<string, unknown> =
          i === 0
            ? {}
            : i === 1
              ? (() => {
                  const d = parse(current.current.files.html),
                    parent = d.querySelector("main");
                  return {
                    parentId: parent ? "node:" + pathOf(parent) : null,
                    index: parent ? Math.min(1, parent.children.length) : 0,
                    html: '<section class="studio-demo"></section>',
                  };
                })()
              : i === 2
                ? {
                    nodeId: section,
                    styles: {
                      background: "#dce8dc",
                      padding: "28px",
                      margin: "24px 0",
                      "border-radius": "12px",
                      display: "flex",
                      "flex-direction": "column",
                      gap: "8px",
                    },
                  }
                : i === 3
                  ? { parentId: section, html: "<h2></h2>" }
                  : i === 4
                    ? { nodeId: heading, text: "아이디어를 웹으로, 한 단계씩." }
                    : i === 5
                      ? {
                          parentId: section,
                          html: '<p style="margin: 0; font-size: 13px; line-height: 1.8; color: #586b58;">블록을 조립하고 스타일을 다듬는 동안, 코드와 캔버스가 함께 바뀝니다.</p>',
                        }
                      : i === 6
                        ? {
                            parentId: section,
                            html: '<button style="align-self: flex-start; padding: 11px 18px; border: 0; border-radius: 6px; background: #334d3f; color: white;">나만의 웹 만들기 ↗</button>',
                          }
                        : { nodeId: section, styles: { gap: "16px" } };
        const result = current.current.run({
          name: steps[i].tool as CommandInput["name"],
          args,
          revision: lastRevision.current,
        });
        if (!result.ok) throw new Error(result.error.message);
        lastRevision.current = result.revision;
        if (i === 1) section = result.nodeId!;
        if (i === 3) heading = result.nodeId!;
        setCompleted(i + 1);
        setCursor((prev) => (prev ? { ...prev, click: false } : null));
        await wait(750);
      }
      setStatus("done");
    } catch (e) {
      if (e instanceof Error && e.message === "CANCELLED")
        setStatus("cancelled");
      else {
        setStatus("error");
        setError(e instanceof Error ? e.message : "작업을 완료하지 못했어.");
      }
    } finally {
      if (generation === control.current.generation) {
        current.current.onBusy(false);
        setCursor(null);
      }
    }
  };
  const reset = () => {
    if (
      snapshot.current &&
      current.current.restore(snapshot.current, lastRevision.current)
    ) {
      snapshot.current = null;
      setStatus("ready");
      setCompleted(0);
      setStep(-1);
      setError("");
    }
  };
  const pause = () => {
    control.current.paused = !control.current.paused;
    setStatus(control.current.paused ? "paused" : "playing");
  };
  const changed =
    snapshot.current !== null &&
    revisionOf(props.files) !== lastRevision.current;
  return (
    <>
      <button
        className="demo-launch"
        disabled={busy}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <MousePointer2 size={14} />
        작업 데모<span>NEW</span>
      </button>
      {open && (
        <section className="demo-panel" aria-label="커서 작업 데모">
          <div className="demo-top">
            <div className="demo-title">
              <span className="demo-badge">DEMO</span>
              <strong>웹이 만들어지는 과정</strong>
            </div>
            <button
              className="icon-button"
              disabled={busy}
              onClick={() => setOpen(false)}
              aria-label="데모 패널 닫기"
            >
              <X size={15} />
            </button>
          </div>
          <p className="demo-description">
            정해진 편집 명령을 실행하는 커서 데모야. 실제 문서에 적용돼.
            자유로운 요청은 오른쪽 GPT 작업실에서 할 수 있어.
          </p>
          <div className="demo-progress">
            <span style={{ width: `${(completed / steps.length) * 100}%` }} />
          </div>
          <div className="demo-current" role="status">
            {status === "done" ? (
              <>
                <Check size={16} />
                8개 작업 완료 · 캔버스에 적용했어
              </>
            ) : status === "error" ? (
              <>
                <CircleAlert size={16} />
                {error}
              </>
            ) : status === "cancelled" ? (
              <>
                <Square size={13} />
                중단했어 · 적용된 작업은 남아 있어
              </>
            ) : busy ? (
              <>
                <span className="demo-working-dot" />
                {status === "paused" ? "일시정지 · " : ""}
                {steps[step]?.label}
                <code>{steps[step]?.tool}</code>
              </>
            ) : (
              <>
                <MousePointer2 size={15} />
                안내 섹션을 함께 조립해볼까?
              </>
            )}
          </div>
          <details className="demo-details">
            <summary>
              작업 순서 보기{" "}
              <span>
                {completed} / {steps.length}
              </span>
            </summary>
            <ol>
              {steps.map((s, i) => (
                <li
                  key={i}
                  className={
                    i < completed
                      ? "complete"
                      : i === step && busy
                        ? "current"
                        : ""
                  }
                >
                  <span>{i < completed ? <Check size={12} /> : i + 1}</span>
                  <div>
                    {s.label}
                    <code>{s.tool}</code>
                  </div>
                </li>
              ))}
            </ol>
          </details>
          <div className="demo-controls">
            <label>
              속도
              <select
                aria-label="데모 재생 속도"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={2}>2×</option>
              </select>
            </label>
            <div>
              {busy ? (
                <>
                  <button
                    className="button secondary"
                    onClick={() => {
                      control.current.cancel = true;
                      control.current.paused = false;
                    }}
                  >
                    <Square size={12} />
                    중단
                  </button>
                  <button className="button export" onClick={pause}>
                    {status === "paused" ? (
                      <Play size={12} />
                    ) : (
                      <Pause size={12} />
                    )}{" "}
                    {status === "paused" ? "계속" : "일시정지"}
                  </button>
                </>
              ) : (
                <>
                  {snapshot.current && (
                    <button
                      className="button secondary"
                      disabled={changed}
                      title={
                        changed
                          ? "이후 편집한 내용이 있어 복원할 수 없어"
                          : "데모 시작 전 문서로 복원"
                      }
                      onClick={reset}
                    >
                      <RotateCcw size={13} />
                      데모 되돌리기
                    </button>
                  )}
                  {!snapshot.current && (
                    <button
                      className="button export"
                      onClick={() => void start()}
                    >
                      <Play size={13} />
                      데모 시작
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {changed && !busy && (
            <p className="demo-note">
              데모 이후 편집한 내용이 있어. 상단 실행 취소로 필요한 작업만
              되돌려봐.
            </p>
          )}
        </section>
      )}
      {cursor && busy && (
        <div
          className={`demo-cursor ${cursor.click ? "clicking" : ""}`}
          style={{ left: cursor.x, top: cursor.y }}
          aria-hidden="true"
        >
          <div className="demo-click-ring" />
          <MousePointer2 size={23} fill="#9ee5cc" />
          <span>{status === "paused" ? "일시정지" : "작업 데모"}</span>
        </div>
      )}
    </>
  );
}
