import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Box,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  FileCode2,
  FolderOpen,
  GripVertical,
  Layers,
  Maximize2,
  Monitor,
  MousePointer2,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  atPath,
  canContain,
  exportHtml,
  importHtml,
  initial,
  parse,
  pathOf,
  treeOf,
  type Files,
  type TreeNode,
} from "./document";
import { previewHtml } from "./preview";
import {
  executeCommand,
  revisionOf,
  type CommandInput,
  type CommandResult,
} from "./commands";
import { OperationDemo } from "./OperationDemo";
import { TimelinePanel } from "./TimelinePanel";
import { InteractionPanel } from "./InteractionPanel";
import { AIPanel } from "./AIPanel";
import { readInteractions } from "./interactions";
import {
  readMotion,
  writeMotion,
  createTrack,
  type MotionData,
  type Preset,
} from "./timeline";
import {
  HistorySync,
  validWorkspace,
  type WorkspaceHistory,
  type SaveStatus,
} from "./history-sync";
import "./style.css";
import "./toy-theme.css";

type Tab = keyof Files;
const STORE = "toy-web-studio-document-v1";
function load(): Files {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || "null");
    if (data && ["html", "css", "js"].every((k) => typeof data[k] === "string"))
      return data;
  } catch {}
  return initial;
}
const blocks = [
  {
    name: "컨테이너",
    tag: "section",
    html: '<section class="new-section" style="padding: 24px; min-height: 80px; background: #e9ece5;"></section>',
  },
  { name: "제목", tag: "h2", html: "<h2>새로운 이야기를 시작해보세요</h2>" },
  { name: "텍스트", tag: "p", html: "<p>여기에 내용을 입력하세요.</p>" },
  {
    name: "버튼",
    tag: "button",
    html: '<button style="padding: 12px 20px; border: 0; border-radius: 6px; background: #33483d; color: white;">버튼</button>',
  },
  {
    name: "카드",
    tag: "article",
    html: '<article style="padding: 24px; border: 1px solid #d0d6cd; border-radius: 10px;"><h3>새 카드</h3><p>카드 내용을 작성해보세요.</p></article>',
  },
  {
    name: "이미지",
    tag: "img",
    html: '<img alt="이미지 설명" src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27600%27 height=%27300%27%3E%3Crect width=%27600%27 height=%27300%27 fill=%27%23dce3d8%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 fill=%27%23798871%27 font-size=%2724%27%3EYour image%3C/text%3E%3C/svg%3E" style="width: 100%; height: auto;">',
  },
];
function App() {
  const [files, setFiles] = useState<Files>(load),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState<Tab>("html"),
    [panel, setPanel] = useState<"properties" | "code" | "interactions">(
      "properties",
    ),
    [leftTab, setLeftTab] = useState<"layers" | "blocks">("layers"),
    [running, setRunning] = useState(false),
    [device, setDevice] = useState("desktop"),
    [notice, setNotice] = useState(""),
    [runtimeError, setRuntimeError] = useState(""),
    [dirty, setDirty] = useState(false),
    [saveStatus, setSaveStatus] = useState<SaveStatus>("loading"),
    [saveMessage, setSaveMessage] = useState(""),
    [historyReady, setHistoryReady] = useState(false),
    [collapsed, setCollapsed] = useState<Set<string>>(new Set()),
    [drag, setDrag] = useState<string | null>(null),
    [rename, setRename] = useState("Untitled project");
  const iframe = useRef<HTMLIFrameElement>(null),
    input = useRef<HTMLInputElement>(null),
    history = useRef<Files[]>([]),
    future = useRef<Files[]>([]),
    typing = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filesRef = useRef(files);
  const historySync = useRef<HistorySync | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false),
    [aiBusy, setAiBusy] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const motionTime = useRef(0);
  const motionFocus = useRef<string | null>(null);
  const motion = useMemo(() => readMotion(files.js), [files.js]);
  const interactions = useMemo(() => readInteractions(files.js), [files.js]);
  const previewScroll = useRef({ x: 0, y: 0 });
  const doc = useMemo(() => parse(files.html), [files.html]),
    tree = useMemo(() => treeOf(doc), [doc]),
    element = selected === null ? null : atPath(doc, selected);
  const [previewFiles, setPreviewFiles] = useState(files);
  useEffect(() => {
    const id = setTimeout(() => {
      setPreviewFiles(files);
      setDirty(false);
    }, 350);
    return () => clearTimeout(id);
  }, [files]);
  function applyWorkspace(workspace: WorkspaceHistory) {
    history.current = [...workspace.past];
    future.current = [...workspace.future];
    filesRef.current = workspace.files;
    setFiles(workspace.files);
    setRename(workspace.projectName);
    setSelected(null);
    setRunning(false);
    typing.current = false;
  }
  const snapshot = (): WorkspaceHistory => ({
    files: filesRef.current,
    past: [...history.current],
    future: [...future.current],
    projectName: rename,
  });
  useEffect(() => {
    let disposed = false;
    const sync = new HistorySync((status, message = "") => {
      if (!disposed) {
        setSaveStatus(status);
        setSaveMessage(message);
      }
    }, localStorage);
    historySync.current = sync;
    void sync.boot(snapshot()).then((workspace) => {
      if (!disposed) {
        applyWorkspace(workspace);
        setHistoryReady(true);
      }
    });
    const flush = () => {
      void sync.flush();
    };
    const hide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hide);
    return () => {
      disposed = true;
      sync.stop();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    if (historyReady) historySync.current?.schedule(snapshot());
  }, [files, rename, historyReady]);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow || !e.data?.ion) return;
      if (e.data.type === "select" && typeof e.data.payload === "string") {
        setSelected(e.data.payload);
        setPanel((current) =>
          current === "interactions" ? current : "properties",
        );
      }
      if (e.data.type === "error") setRuntimeError(String(e.data.payload));
      if (
        e.data.type === "scroll" &&
        Number.isFinite(e.data.payload?.x) &&
        Number.isFinite(e.data.payload?.y)
      )
        previewScroll.current = e.data.payload;
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  useEffect(() => {
    if (notice) {
      const id = setTimeout(() => setNotice(""), 3000);
      return () => clearTimeout(id);
    }
  }, [notice]);
  useEffect(() => {
    setRuntimeError("");
  }, [files, running]);
  const commit = (next: Files, group = false) => {
    if (JSON.stringify(next) === JSON.stringify(filesRef.current)) return;
    if (!group || !typing.current) {
      history.current.push(filesRef.current);
      if (history.current.length > 80) history.current.shift();
    }
    future.current = [];
    filesRef.current = next;
    setFiles(next);
    setDirty(true);
    if (group) {
      typing.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => (typing.current = false), 650);
    } else typing.current = false;
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) {
      future.current.push(filesRef.current);
      filesRef.current = prev;
      setFiles(prev);
      setSelected(null);
      typing.current = false;
    }
  };
  const redo = () => {
    const next = future.current.pop();
    if (next) {
      history.current.push(filesRef.current);
      filesRef.current = next;
      setFiles(next);
      setSelected(null);
      typing.current = false;
    }
  };
  const runCommand = (input: CommandInput, group = false): CommandResult => {
    const result = executeCommand(filesRef.current, input);
    if (!result.ok) {
      setNotice(result.error.message);
      return result;
    }
    if (input.name !== "getDocument") {
      commit(result.files, group);
      if (result.nodeId) {
        setSelected(result.nodeId.slice(5));
        setPanel("properties");
      } else if (
        input.name === "removeElement" ||
        (input.name === "replaceCode" && input.args.file === "html")
      )
        setSelected(null);
    }
    return result;
  };
  const command = (
    name: CommandInput["name"],
    args: Record<string, unknown>,
    group = false,
  ) =>
    runCommand({ name, args, revision: revisionOf(filesRef.current) }, group);
  const setAttr = (name: string, value: string) =>
    selected !== null &&
    command("setAttribute", {
      nodeId: "node:" + selected,
      name,
      value: value || null,
    });
  const setStyle = (name: string, value: string) =>
    selected !== null &&
    command("setStyles", {
      nodeId: "node:" + selected,
      styles: { [name]: value },
    });
  const add = (html: string) => {
    const d = parse(filesRef.current.html);
    let parent = selected === null ? d.body : atPath(d, selected) || d.body;
    if (!canContain(parent)) parent = parent.parentElement || d.body;
    const result = command("addElement", {
      parentId: parent === d.body ? null : "node:" + pathOf(parent),
      html,
    });
    if (result.ok) setNotice("블록을 추가했어");
  };
  const move = (direction: "up" | "down" | "out") => {
    if (selected === null) return;
    const d = parse(filesRef.current.html),
      el = atPath(d, selected);
    if (!el || !el.parentElement) return;
    const parent = el.parentElement;
    let destination = parent,
      index = Array.from(parent.children).indexOf(el);
    if (direction === "up") {
      if (index === 0) return;
      index--;
    }
    if (direction === "down") {
      if (index === parent.children.length - 1) return;
      index++;
    }
    if (direction === "out") {
      if (parent === d.body || !parent.parentElement) return;
      destination = parent.parentElement;
      index = Array.from(destination.children).indexOf(parent) + 1;
    }
    command("moveElement", {
      nodeId: "node:" + selected,
      parentId: destination === d.body ? null : "node:" + pathOf(destination),
      index,
    });
  };
  const drop = (target: string) => {
    if (drag === null || drag === target) return;
    command("moveElement", {
      nodeId: "node:" + drag,
      parentId: "node:" + target,
    });
    setDrag(null);
  };
  const download = () => {
    const blob = new Blob([exportHtml(files)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rename.replace(/[^\p{L}\p{N} _-]/gu, "") || "website"}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("HTML·CSS·JS를 하나의 HTML로 내보냈어");
  };
  const downloadHistory = () => {
    const blob = new Blob(
      [JSON.stringify({ version: 1, state: snapshot() }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      (rename.replace(/[^\p{L}\p{N} _-]/gu, "") || "workspace") +
      ".history.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("현재 작업과 실행 취소 기록을 백업했어");
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".json")) {
      try {
        const data = JSON.parse(text);
        if (data.version !== 1 || !validWorkspace(data.state))
          throw new Error("Web Studio 기록 백업 파일이 아니야.");
        applyWorkspace(data.state);
        setNotice("작업과 실행 취소 기록을 함께 복원했어");
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "기록 파일을 읽지 못했어.",
        );
      }
      return;
    }
    commit(importHtml(text));
    setRename(file.name.replace(/\.html?$/i, ""));
    setSelected(null);
    setNotice("HTML 파일을 열었어");
  };
  const saveMotion = (data: MotionData) => {
    const result = command("setTimeline", { data });
    if (result.ok) {
      setPreviewFiles(result.files);
      setDirty(false);
    }
  };
  const addMotion = (
    preset: Preset,
    replaceExisting = false,
  ): string | null => {
    if (selected === null) {
      setNotice("캔버스에서 요소를 먼저 선택해.");
      return null;
    }
    const result = command("addAnimationTrack", {
      nodeId: "node:" + selected,
      preset,
      replaceExisting,
    });
    if (result.ok && result.trackId) {
      setPreviewFiles(result.files);
      setDirty(false);
      motionFocus.current =
        readMotion(result.files.js).data.tracks.find(
          (t) => t.id === result.trackId,
        )?.targetId || null;
    }
    return result.ok ? result.trackId || null : null;
  };
  const seekMotion = (seconds: number) => {
    motionTime.current = seconds;
    if (timelineOpen && !running)
      iframe.current?.contentWindow?.postMessage(
        { type: "studio-motion-seek", seconds },
        "*",
      );
  };
  useEffect(() => {
    if (!timelineOpen)
      iframe.current?.contentWindow?.postMessage(
        { type: "studio-motion-clear" },
        "*",
      );
  }, [timelineOpen]);
  const src = useMemo(
    () => previewHtml(previewFiles, running, null),
    [previewFiles, running],
  );
  const highlight = () =>
    iframe.current?.contentWindow?.postMessage(
      { type: "ion-highlight", path: running ? null : selected },
      "*",
    );
  useEffect(highlight, [selected, running, src]);
  const previewLoaded = () => {
    highlight();
    iframe.current?.contentWindow?.postMessage(
      { type: "ion-scroll", ...previewScroll.current },
      "*",
    );
    seekMotion(motionTime.current);
    if (timelineOpen && motionFocus.current)
      iframe.current?.contentWindow?.postMessage(
        { type: "studio-motion-focus", targetId: motionFocus.current },
        "*",
      );
  };
  const treeRow = (node: TreeNode, depth = 0): React.ReactNode => (
    <React.Fragment key={node.id}>
      <div
        className={`tree-row ${selected === node.id ? "active" : ""} ${drag === node.id ? "dragging" : ""}`}
        data-node-path={node.id}
        style={{ paddingLeft: 12 + depth * 15 }}
        draggable
        onDragStart={(e) => {
          setDrag(node.id);
          e.dataTransfer.setData("text/plain", node.id);
        }}
        onDragEnd={() => setDrag(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          drop(node.id);
        }}
      >
        <button
          className="tree-toggle"
          aria-label={`${node.label} ${collapsed.has(node.id) ? "펼치기" : "접기"}`}
          onClick={() =>
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.has(node.id) ? next.delete(node.id) : next.add(node.id);
              return next;
            })
          }
        >
          {node.children.length > 0 ? (
            collapsed.has(node.id) ? (
              <ChevronRight size={12} />
            ) : (
              <ChevronDown size={12} />
            )
          ) : (
            <span />
          )}
        </button>
        <button
          className="tree-label"
          onClick={() => {
            setSelected(node.id);
            setPanel((current) =>
              current === "interactions" ? current : "properties",
            );
          }}
        >
          <span className="tag-icon">
            {["p", "span", "h1", "h2", "h3", "a"].includes(node.tag) ? (
              "T"
            ) : (
              <Square size={11} />
            )}
          </span>
          <span>{node.label}</span>
          <small>{node.tag}</small>
        </button>
      </div>
      {!collapsed.has(node.id) &&
        node.children.map((n) => treeRow(n, depth + 1))}
    </React.Fragment>
  );
  const field = (label: string, key: string, placeholder = "") => (
    <label className="field">
      <span>{label}</span>
      <input
        key={`${selected}-${key}`}
        aria-label={label}
        data-demo={key}
        defaultValue={
          (element as HTMLElement | null)?.style.getPropertyValue(key) || ""
        }
        placeholder={placeholder}
        onBlur={(e) => setStyle(key, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
  return (
    <div className={`app-shell ${timelineOpen ? "with-timeline" : ""}`}>
      <header className="app-header" inert={aiBusy || !historyReady}>
        <a className="logo studio-home" href="/" aria-label="toy. 프로젝트 모음으로 돌아가기"><strong>toy<span>.</span></strong><span className="studio-brand">WEB STUDIO</span></a>
        <div className="project-title">
          <FolderOpen size={14} />
          <input
            aria-label="프로젝트 이름"
            maxLength={200}
            value={rename}
            onChange={(e) => setRename(e.target.value)}
          />
          <span className="local-badge">WEB</span>
        </div>
        <div className="header-actions" inert={demoBusy || !historyReady}>
          <span
            className="save-state"
            title={
              saveMessage ||
              "이 브라우저에 자동 저장 · 실행 취소/다시 실행 포함 · JSON 기록 백업으로 따로 보관할 수 있어"
            }
          >
            <span
              className={
                saveStatus === "saved" ? "status-dot" : "status-dot warning"
              }
            />
            {saveStatus === "saved"
              ? "브라우저에 저장됨"
              : saveStatus === "saving"
                ? "기록 저장 중…"
                : saveStatus === "loading"
                  ? "기록 복원 중…"
              : "저장 상태 확인 필요"}
          </span>
          <button
            className="button secondary"
            onClick={() => input.current?.click()}
          >
            <FolderOpen size={14} />
            열기
          </button>
          <button
            className="button secondary history-backup"
            onClick={downloadHistory}
            title="실행 취소 기록을 JSON 파일로 백업"
          >
            <Save size={14} />
            기록 백업
          </button>
          <button className="button export" onClick={download}>
            <Download size={14} />
            내보내기
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept=".html,.htm,.json,text/html,application/json"
          hidden
          onChange={(e) => {
            void importFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </header>
      {(saveStatus === "offline" || saveStatus === "conflict") && (
        <div className="history-banner" role="status" inert={aiBusy}>
          <span>{saveMessage} 현재 작업은 브라우저에 보관 중이야.</span>
          <button onClick={() => void historySync.current?.retry()}>
            다시 저장
          </button>
          {saveStatus === "conflict" && (
            <button
              onClick={async () => {
                try {
                  const workspace = await historySync.current?.restoreRemote();
                  if (workspace) {
                    applyWorkspace(workspace);
                    setNotice(
                      "브라우저 기록을 불러왔어. 이전 작업은 브라우저 복구본으로 보관했어.",
                    );
                  }
                } catch (error) {
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : "기록을 불러오지 못했어.",
                  );
                }
              }}
            >
              브라우저 기록 불러오기
            </button>
          )}
        </div>
      )}
      <div className="workspace" inert={demoBusy || aiBusy || !historyReady}>
        <aside className="left-panel">
          <div className="panel-tabs">
            <button
              className={leftTab === "layers" ? "selected" : ""}
              onClick={() => setLeftTab("layers")}
            >
              <Layers size={13} />
              레이어
            </button>
            <button
              className={leftTab === "blocks" ? "selected" : ""}
              onClick={() => setLeftTab("blocks")}
            >
              <Box size={13} />
              블록
            </button>
          </div>
          {leftTab === "layers" ? (
            <>
              <div className="sidebar-heading">
                <span>PAGE STRUCTURE</span>
                <button
                  className="icon-button"
                  title="블록 추가"
                  onClick={() => setLeftTab("blocks")}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="page-row">
                <FileCode2 size={14} />
                <span>index.html</span>
                <span className="tiny-dot" />
              </div>
              <div className="tree-scroll">
                {tree.map((n) => treeRow(n))}
                {tree.length === 0 && (
                  <div className="empty-small">블록을 추가해서 시작해봐.</div>
                )}
              </div>
              <div className="sidebar-tip">
                <GripVertical size={15} />
                <span>드래그해서 부모 블록 안으로 이동해.</span>
              </div>
            </>
          ) : (
            <>
              <div className="sidebar-heading">
                <span>BUILDING BLOCKS</span>
                <span>{blocks.length}</span>
              </div>
              <p className="block-help">
                선택한 요소 안에 추가돼.
                <br />
                선택이 없으면 페이지 끝에 추가돼.
              </p>
              <div className="block-grid">
                {blocks.map((b) => (
                  <button
                    key={b.tag}
                    data-demo={"block-" + b.tag}
                    onClick={() => add(b.html)}
                  >
                    <Code2 size={21} />
                    <strong>{b.name}</strong>
                    <span>&lt;{b.tag}&gt;</span>
                    <Plus className="block-plus" size={12} />
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="local-card">
            <span className="local-card-icon">
              <Braces size={17} />
            </span>
            <div>
              <strong>Your web workspace</strong>
              <span>아이디어부터 웹까지, 한곳에서.</span>
            </div>
          </div>
        </aside>
        <main className="canvas-panel" data-demo="canvas">
          <div className="canvas-toolbar">
            <div className="canvas-label">
              <span className="status-dot" />
              <strong>캔버스</strong>
              <span className="toolbar-divider" />
              <span>{running ? "INTERACTIVE PREVIEW" : "LIVE PREVIEW"}</span>
            </div>
            <div className="devices">
              <button
                aria-label="데스크톱 보기"
                className={device === "desktop" ? "active" : ""}
                onClick={() => setDevice("desktop")}
              >
                <Monitor size={15} />
              </button>
              <button
                aria-label="태블릿 보기"
                className={device === "tablet" ? "active" : ""}
                onClick={() => setDevice("tablet")}
              >
                <Square size={14} />
              </button>
              <button
                aria-label="모바일 보기"
                className={device === "mobile" ? "active" : ""}
                onClick={() => setDevice("mobile")}
              >
                <Smartphone size={14} />
              </button>
            </div>
            <div className="canvas-tools">
              <button
                className={`timeline-toggle ${timelineOpen ? "active" : ""}`}
                aria-pressed={timelineOpen}
                onClick={() => {
                  setTimelineOpen(!timelineOpen);
                  setRunning(false);
                }}
              >
                ◇ 타임라인
              </button>
              <button
                className="icon-button"
                title="실행 취소"
                aria-label="실행 취소"
                disabled={!history.current.length}
                onClick={undo}
              >
                <Undo2 size={15} />
              </button>
              <button
                className="icon-button"
                title="다시 실행"
                aria-label="다시 실행"
                disabled={!future.current.length}
                onClick={redo}
              >
                <Redo2 size={15} />
              </button>
              <span className="toolbar-divider" />
              <button
                className={`run-button ${running ? "running" : ""}`}
                onClick={() => setRunning(!running)}
              >
                {running ? <MousePointer2 size={13} /> : <Play size={13} />}{" "}
                {running ? "편집하기" : "실행"}
              </button>
            </div>
          </div>
          <div className="canvas-context">
            <span>
              <FileCode2 size={12} />
              index.html
            </span>
            <span>
              {device === "desktop"
                ? "반응형"
                : device === "tablet"
                  ? "768 px"
                  : "390 px"}
              <ChevronDown size={11} />
            </span>
          </div>
          <div className={`canvas-scroll ${device}`}>
            <div className="preview-frame">
              <div className="browser-bar">
                <div className="browser-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <span>
                  <span className="browser-lock">◇</span> preview /{" "}
                  {rename.toLowerCase().replaceAll(" ", "-")}
                </span>
                <RotateCcw size={11} />
              </div>
              <iframe
                ref={iframe}
                title="웹 실시간 미리보기"
                sandbox="allow-scripts"
                srcDoc={src}
                onLoad={previewLoaded}
              />
            </div>
            <div className="canvas-caption">
              <MousePointer2 size={12} />
              {running
                ? "실제 웹 동작을 확인하는 중 · JS 실행됨"
                : "요소를 클릭해서 선택하고 편집해봐"}
            </div>
          </div>
          <div className="breadcrumb">
            <span>body</span>
            {selected?.split(".").map((_, i, arr) => {
              const path = arr.slice(0, i + 1).join("."),
                el = atPath(doc, path);
              return (
                <React.Fragment key={path}>
                  <ChevronRight size={11} />
                  <button onClick={() => setSelected(path)}>
                    {el?.tagName.toLowerCase()}
                    {el?.classList[0] ? `.${el.classList[0]}` : ""}
                  </button>
                </React.Fragment>
              );
            })}
            <span className="sync-label">
              <Check size={12} />
              {dirty ? "반영 중…" : "동기화됨"}
            </span>
          </div>
        </main>
        <aside className="right-panel">
          <div className="panel-tabs">
            <button
              className={panel === "properties" ? "selected" : ""}
              onClick={() => setPanel("properties")}
            >
              <MousePointer2 size={13} />
              속성
            </button>
            <button
              className={panel === "code" ? "selected" : ""}
              onClick={() => setPanel("code")}
            >
              <Code2 size={14} />
              코드
            </button>
            <button
              className={panel === "interactions" ? "selected" : ""}
              onClick={() => setPanel("interactions")}
            >
              <MousePointer2 size={13} />
              동작
            </button>
          </div>
          {panel === "interactions" ? (
            <InteractionPanel
              doc={doc}
              selected={selected}
              rules={interactions.data.rules}
              error={interactions.error}
              command={command}
              onSelect={setSelected}
              onRun={() => setRunning(true)}
            />
          ) : panel === "properties" ? (
            element ? (
              <div
                className="properties"
                key={`${selected}-${revisionOf(files)}`}
              >
                <div className="selection-heading">
                  <span className="element-type">
                    &lt;{element.tagName.toLowerCase()}&gt;
                  </span>
                  <strong>
                    {element.id || element.classList[0] || "선택한 요소"}
                  </strong>
                </div>
                <section>
                  <h3>
                    ELEMENT <span>요소</span>
                  </h3>
                  <label className="field">
                    <span>ID</span>
                    <input
                      aria-label="요소 ID"
                      defaultValue={element.id}
                      placeholder="element-id"
                      onBlur={(e) => setAttr("id", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>클래스</span>
                    <input
                      aria-label="요소 클래스"
                      defaultValue={element.getAttribute("class") || ""}
                      placeholder="class-name"
                      onBlur={(e) => setAttr("class", e.target.value)}
                    />
                  </label>
                  {element.children.length === 0 &&
                    !["IMG", "INPUT", "BR", "HR", "SCRIPT", "STYLE"].includes(
                      element.tagName,
                    ) && (
                      <label className="field stacked">
                        <span>텍스트</span>
                        <textarea
                          aria-label="요소 텍스트"
                          data-demo="text"
                          defaultValue={element.textContent || ""}
                          onBlur={(e) =>
                            selected !== null &&
                            command("setText", {
                              nodeId: "node:" + selected,
                              text: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                  {element.tagName === "A" && (
                    <label className="field">
                      <span>링크</span>
                      <input
                        aria-label="링크 주소"
                        defaultValue={element.getAttribute("href") || ""}
                        onBlur={(e) => setAttr("href", e.target.value)}
                      />
                    </label>
                  )}
                  {element.tagName === "IMG" && (
                    <>
                      <label className="field stacked">
                        <span>이미지 URL</span>
                        <input
                          aria-label="이미지 URL"
                          defaultValue={element.getAttribute("src") || ""}
                          onBlur={(e) => setAttr("src", e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>대체 텍스트</span>
                        <input
                          aria-label="대체 텍스트"
                          defaultValue={element.getAttribute("alt") || ""}
                          onBlur={(e) => setAttr("alt", e.target.value)}
                        />
                      </label>
                    </>
                  )}
                </section>
                <section>
                  <h3>
                    LAYOUT <span>배치</span>
                  </h3>
                  <label className="field">
                    <span>Display</span>
                    <select
                      aria-label="Display"
                      value={(element as HTMLElement).style.display || ""}
                      onChange={(e) => setStyle("display", e.target.value)}
                    >
                      <option value="">스타일시트 기본값</option>{" "}
                      <option value="block">Block</option>
                      <option value="flex">Flex</option>
                      <option value="grid">Grid</option>
                      <option value="inline-block">Inline block</option>
                      <option value="none">숨기기</option>
                    </select>
                  </label>
                  <div className="two-fields">
                    {field("너비", "width", "auto")}
                    {field("높이", "height", "auto")}
                  </div>
                  {field("간격", "gap", "16px")}
                  {field("안쪽 여백", "padding", "24px")}
                  {field("바깥 여백", "margin", "0px")}
                </section>
                <section>
                  <h3>
                    APPEARANCE <span>스타일</span>
                  </h3>
                  {field("배경", "background", "#f5f4ef")}
                  {field("글자 색", "color", "#292c27")}
                  {field("글자 크기", "font-size", "16px")}
                  {field("모서리", "border-radius", "0px")}
                  <p className="property-note">
                    값을 입력하고 Enter 또는 다른 곳을 눌러 적용해. 입력값은
                    인라인 CSS로 저장돼.
                  </p>
                </section>
                <section>
                  <h3>
                    STRUCTURE <span>구조</span>
                  </h3>
                  <div className="structure-actions">
                    <button title="위로 이동" onClick={() => move("up")}>
                      <ArrowUp size={14} />
                      위로
                    </button>
                    <button title="아래로 이동" onClick={() => move("down")}>
                      <ArrowDown size={14} />
                      아래로
                    </button>
                    <button
                      title="부모 밖으로 이동"
                      onClick={() => move("out")}
                    >
                      <ArrowUpLeft size={14} />
                      밖으로
                    </button>
                  </div>
                  <button
                    className="delete-button"
                    onClick={() => {
                      selected !== null &&
                        command("removeElement", {
                          nodeId: "node:" + selected,
                        });
                      setSelected(null);
                    }}
                  >
                    <Trash2 size={13} />
                    요소 삭제
                  </button>
                </section>
              </div>
            ) : (
              <div className="empty-properties">
                <div className="empty-icon">
                  <MousePointer2 size={28} />
                  <span className="empty-orbit" />
                </div>
                <h2>
                  작은 선택에서
                  <br />
                  시작되는 변화.
                </h2>
                <p>
                  캔버스나 레이어에서 요소를 선택해봐.
                  <br />
                  디자인과 구조를 여기서 다듬을 수 있어.
                </p>
                <div className="empty-shortcuts">
                  <span>
                    <MousePointer2 size={13} />
                    선택해서 스타일 편집
                  </span>
                  <span>
                    <Layers size={13} />
                    부모·자식 구조 관리
                  </span>
                  <span>
                    <Code2 size={13} />
                    코드와 실시간 동기화
                  </span>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setLeftTab("blocks")}
                >
                  <Plus size={14} />첫 블록 추가하기
                </button>
              </div>
            )
          ) : (
            <div className="code-panel">
              <div className="code-tabs">
                {(["html", "css", "js"] as Tab[]).map((t) => (
                  <button
                    className={tab === t ? "active" : ""}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    <span className={`file-dot ${t}`} />
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="code-description">
                {tab === "html"
                  ? "body 내부 HTML · 입력하면 자동 반영돼"
                  : tab === "css"
                    ? "페이지 전체 스타일시트"
                    : "실행 버튼으로 JavaScript를 확인해"}
              </div>
              <div className="editor">
                <div className="line-numbers" aria-hidden="true">
                  {files[tab].split("\n").map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  aria-label={`${tab.toUpperCase()} 코드`}
                  spellCheck={false}
                  value={files[tab]}
                  onScroll={(e) => {
                    const gutter = e.currentTarget.previousElementSibling;
                    if (gutter) gutter.scrollTop = e.currentTarget.scrollTop;
                  }}
                  onChange={(e) => {
                    command(
                      "replaceCode",
                      { file: tab, code: e.target.value },
                      true,
                    );
                    if (tab === "html") setSelected(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const start = e.currentTarget.selectionStart,
                        end = e.currentTarget.selectionEnd;
                      commit(
                        {
                          ...files,
                          [tab]:
                            files[tab].slice(0, start) +
                            "  " +
                            files[tab].slice(end),
                        },
                        true,
                      );
                      const target = e.currentTarget;
                      requestAnimationFrame(() => {
                        target.selectionStart = target.selectionEnd = start + 2;
                      });
                    }
                  }}
                />
              </div>
              <div className="editor-footer">
                <span>UTF-8</span>
                <span>{files[tab].split("\n").length} lines</span>
              </div>
            </div>
          )}
          <button
            className="ai-later ai-launch"
            onClick={() => setAiOpen(true)}
          >
            <span className="ai-symbol">✳</span>
            <div>
              <strong>GPT 작업실 열기</strong>
              <span>요청하면 코드·블록·동작을 함께 편집해.</span>
            </div>
            <span className="soon">OPENAI</span>
          </button>
        </aside>
      </div>
      {timelineOpen && (
        <div
          className="timeline-container"
          inert={demoBusy || aiBusy || !historyReady}
        >
          <TimelinePanel
            data={motion.data}
            error={motion.error}
            selectedLabel={
              element
                ? element.id ||
                  element.classList[0] ||
                  element.tagName.toLowerCase()
                : null
            }
            missing={motion.data.tracks
              .filter((t) => !doc.getElementById(t.targetId))
              .map((t) => t.id)}
            disabled={running}
            onChange={saveMotion}
            onAdd={addMotion}
            onSeek={seekMotion}
            onSelect={(target) => {
              const el = doc.getElementById(target);
              if (el) setSelected(pathOf(el));
              motionFocus.current = target;
              iframe.current?.contentWindow?.postMessage(
                { type: "studio-motion-focus", targetId: target },
                "*",
              );
            }}
            onClose={() => setTimelineOpen(false)}
          />
        </div>
      )}
      <AIPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        getFiles={() => filesRef.current}
        selected={selected}
        run={runCommand}
        onBusy={setAiBusy}
        prepare={() => {
          setRunning(false);
          setTimelineOpen(false);
        }}
        restore={(snapshot, revision) => {
          if (revisionOf(filesRef.current) !== revision) return false;
          commit(snapshot);
          setSelected(null);
          return true;
        }}
      />
      <div inert={aiBusy || !historyReady}>
        <OperationDemo
          files={files}
          run={runCommand}
          restore={(snapshot, revision) => {
            if (revisionOf(filesRef.current) !== revision) {
              setNotice(
                "데모 이후 문서가 바뀌어서 복원을 멈췄어. 실행 취소를 사용해봐.",
              );
              return false;
            }
            commit(snapshot);
            setSelected(null);
            return true;
          }}
          onBusy={setDemoBusy}
          prepare={() => {
            setRunning(false);
            setTimelineOpen(false);
            setLeftTab("blocks");
            setPanel("properties");
            setDevice("desktop");
          }}
        />
      </div>
      <footer className="statusbar">
        <div>
          <span className="status-dot" />
          <span>Web Studio · ysb5397</span>
          <span className="status-separator">/</span>
          <span>{doc.body.querySelectorAll("*").length} elements</span>
        </div>
        <div>
          {runtimeError ? (
            <span className="runtime-error">JS 오류: {runtimeError}</span>
          ) : (
            <>
              <span>HTML · CSS · JavaScript</span>
              <span className="status-separator">/</span>
              <span>v0.1.0</span>
            </>
          )}
        </div>
      </footer>
      {notice && (
        <div role="status" className="toast">
          <Check size={15} />
          {notice}
          <button onClick={() => setNotice("")} aria-label="알림 닫기">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
