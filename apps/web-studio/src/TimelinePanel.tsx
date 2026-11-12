import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Play,
  Pause,
  SkipBack,
  Repeat2,
  Diamond,
  Trash2,
  X,
  Film,
  ChevronDown,
} from "lucide-react";
import {
  EASINGS,
  applyTrackPreset,
  timelineTimeAt,
  sampleTrack,
  type Easing,
  type MotionData,
  type MotionFrame,
  type MotionTrack,
  type Preset,
} from "./timeline";
import "./timeline.css";
type Props = {
  data: MotionData;
  error?: string;
  selectedLabel: string | null;
  missing: string[];
  disabled: boolean;
  onChange: (data: MotionData) => void;
  onAdd: (preset: Preset, replaceExisting?: boolean) => string | null;
  onSeek: (seconds: number) => void;
  onSelect: (targetId: string) => void;
  onClose: () => void;
};
const round = (n: number) => Math.round(n * 1000) / 1000;
function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="tl-number">
      <span>{label}</span>
      <input
        key={value}
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        defaultValue={round(value)}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n))
            onChange(Math.max(min, Math.min(max, n)));
          else e.target.value = String(round(value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
export function TimelinePanel(p: Props) {
  const [selected, setSelected] = useState<string | null>(
      p.data.tracks[0]?.id || null,
    ),
    [frameId, setFrameId] = useState<string | null>(null),
    [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [playSession, setPlaySession] = useState(0),
    [viewportWidth, setViewportWidth] = useState(800),
    [preset, setPreset] = useState<Preset>("slide"),
    [zoom, setZoom] = useState(100),
    [ghost, setGhost] = useState<MotionTrack | null>(null),
    [hint, setHint] = useState("");
  const rulerRef = useRef<HTMLDivElement>(null),
    scrollRef = useRef<HTMLDivElement>(null),
    scrubPointer = useRef<number | null>(null),
    playbackRef = useRef(false);
  const timeRef = useRef(time),
    drag = useRef<{
      track: MotionTrack;
      type: "move" | "resize" | "frame";
      x: number;
      pointerId: number;
      frame?: string;
    } | null>(null),
    ghostRef = useRef<MotionTrack | null>(null);
  timeRef.current = time;
  playbackRef.current = playing;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setViewportWidth(el.clientWidth));
    observer.observe(el);
    setViewportWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);
  const end = Math.max(0, ...p.data.tracks.map((t) => t.start + t.duration)),
    length = Math.max(6, Math.ceil(end + 1), (viewportWidth - 190) / zoom),
    laneWidth = length * zoom;
  const track = p.data.tracks.find((t) => t.id === selected) || null,
    frame =
      track?.frames.find((f) => f.id === frameId) || track?.frames[0] || null;
  useEffect(() => {
    if (!p.data.tracks.some((t) => t.id === selected)) {
      setSelected(p.data.tracks[0]?.id || null);
      setFrameId(null);
    }
  }, [p.data, selected]);
  useEffect(() => {
    p.onSeek(time);
  }, [time, p.onSeek]);
  useEffect(() => {
    if (p.disabled) stopPlayback();
  }, [p.disabled]);
  useEffect(() => {
    if (!playing || !end) return;
    playbackRef.current = true;
    let handle = 0;
    const origin = performance.now() - timeRef.current * 1000;
    const tick = (now: number) => {
      if (!playbackRef.current) return;
      let t = (now - origin) / 1000;
      if (t >= end) {
        if (p.data.loop) t %= end;
        else {
          setTime(end);
          stopPlayback();
          return;
        }
      }
      setTime(t);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing, end, p.data.loop, playSession]);
  const stopPlayback = () => {
    playbackRef.current = false;
    setPlaying(false);
  };
  const restartPreview = () => {
    timeRef.current = 0;
    setTime(0);
    playbackRef.current = true;
    setPlaying(true);
    setPlaySession((n) => n + 1);
  };
  const update = (next: MotionTrack) => {
    if (p.disabled || p.error) return;
    p.onChange({
      ...p.data,
      tracks: p.data.tracks.map((t) => (t.id === next.id ? next : t)),
    });
  };
  const selectTrack = (t: MotionTrack) => {
    setSelected(t.id);
    setFrameId(null);
    p.onSelect(t.targetId);
  };
  const updateFrame = (patch: Partial<MotionFrame>) => {
    if (track && frame)
      update({
        ...track,
        preset: undefined,
        frames: track.frames.map((f) =>
          f.id === frame.id ? { ...f, ...patch } : f,
        ),
      });
  };
  const addKeyframe = () => {
    if (!track) return;
    const position = (time - track.start) / track.duration;
    if (position <= 0 || position >= 1) {
      setHint("클립 안쪽으로 재생 헤드를 옮긴 뒤 키프레임을 추가해.");
      return;
    }
    const existing = track.frames.find(
      (f) => Math.abs(f.offset - position) < 0.005,
    );
    if (existing) {
      setFrameId(existing.id);
      return;
    }
    if (track.frames.length >= 40) {
      setHint("트랙당 키프레임은 40개까지야.");
      return;
    }
    const next = { ...sampleTrack(track, time), id: crypto.randomUUID() };
    update({
      ...track,
      preset: undefined,
      frames: [...track.frames, next].sort((a, b) => a.offset - b.offset),
    });
    setFrameId(next.id);
    setHint("");
  };
  const applyChosenPreset = (value: Preset) => {
    if (p.disabled || p.error) return;
    setPreset(value);
    let id: string | null = null;
    if (p.selectedLabel) id = p.onAdd(value, true);
    else if (track) {
      update(applyTrackPreset(track, value));
      p.onSelect(track.targetId);
      id = track.id;
    }
    if (id) {
      setSelected(id);
      setFrameId(null);
      setHint("프리셋 적용 · 0초부터 미리보기");
      restartPreview();
    } else setHint("캔버스에서 적용할 요소를 선택해줘.");
  };
  const seekAt = (clientX: number) => {
    if (p.disabled) return;
    stopPlayback();
    const r = rulerRef.current?.getBoundingClientRect();
    if (r) setTime(timelineTimeAt(clientX, r.left, zoom, length));
  };
  const beginSeek = (e: React.PointerEvent<HTMLElement>) => {
    if (p.disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.focus({ preventScroll: true });
    scrubPointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekAt(e.clientX);
  };
  const moveSeek = (e: React.PointerEvent<HTMLElement>) => {
    if (scrubPointer.current === e.pointerId) seekAt(e.clientX);
  };
  const finishSeek = (e: React.PointerEvent<HTMLElement>) => {
    if (scrubPointer.current !== e.pointerId) return;
    seekAt(e.clientX);
    scrubPointer.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const cancelSeek = () => {
    scrubPointer.current = null;
  };
  const startDrag = (
    e: React.PointerEvent<HTMLElement>,
    t: MotionTrack,
    type: "move" | "resize" | "frame",
    f?: MotionFrame,
  ) => {
    if (p.disabled || p.error || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    stopPlayback();
    setSelected(t.id);
    p.onSelect(t.targetId);
    if (f) setFrameId(f.id);
    drag.current = {
      track: t,
      type,
      x: e.clientX,
      pointerId: e.pointerId,
      frame: f?.id,
    };
    ghostRef.current = null;
  };
  const moveDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    if (Math.abs(e.clientX - drag.current.x) < 3 && !ghostRef.current) return;
    const { track: t, type, x, frame: id } = drag.current;
    const delta = (e.clientX - x) / zoom;
    let next = { ...t };
    if (type === "move")
      next.start = round(
        Math.max(0, Math.min(60 - t.duration, t.start + delta)),
      );
    if (type === "resize")
      next.duration = round(
        Math.max(0.1, Math.min(60 - t.start, t.duration + delta)),
      );
    if (type === "frame") {
      const index = t.frames.findIndex((f) => f.id === id);
      if (index <= 0 || index === t.frames.length - 1) return;
      const low = t.frames[index - 1].offset + 0.001,
        high = t.frames[index + 1].offset - 0.001;
      next.preset = undefined;
      next.frames = t.frames.map((f) =>
        f.id === id
          ? {
              ...f,
              offset: Math.max(
                low,
                Math.min(high, f.offset + delta / t.duration),
              ),
            }
          : f,
      );
    }
    ghostRef.current = next;
    setGhost(next);
  };
  const finishDrag = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    if (ghostRef.current) update(ghostRef.current);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
    ghostRef.current = null;
    setGhost(null);
  };
  const cancelDrag = () => {
    drag.current = null;
    ghostRef.current = null;
    setGhost(null);
  };
  const curves: Record<Easing, string> = {
    linear: "M 0 40 L 80 0",
    ease: "M 0 40 C 20 36 20 0 80 0",
    "ease-in": "M 0 40 C 34 40 80 0 80 0",
    "ease-out": "M 0 40 C 0 40 46 0 80 0",
    "ease-in-out": "M 0 40 C 34 40 46 0 80 0",
  };
  return (
    <section className="timeline-dock" aria-label="애니메이션 타임라인">
      <header className="tl-header">
        <div className="tl-heading">
          <Film size={15} />
          <strong>모션 타임라인</strong>
          <span>ANIMATION EDITOR</span>
        </div>
        <div className="tl-transport">
          <button
            title="처음으로"
            aria-label="타임라인 처음으로"
            onClick={() => {
              stopPlayback();
              setTime(0);
            }}
          >
            <SkipBack size={14} />
          </button>
          <button
            className={playing ? "active" : ""}
            aria-label={playing ? "타임라인 일시정지" : "타임라인 재생"}
            disabled={!end || p.disabled}
            onClick={() => {
              if (time >= end) setTime(0);
              playbackRef.current = !playing;
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            className={p.data.loop ? "active" : ""}
            title="반복 재생"
            aria-label="타임라인 반복"
            aria-pressed={p.data.loop}
            disabled={p.disabled || !!p.error}
            onClick={() => p.onChange({ ...p.data, loop: !p.data.loop })}
          >
            <Repeat2 size={14} />
          </button>
          <span className="tl-time">
            {String(Math.floor(time / 60)).padStart(2, "0")}:
            {(time % 60).toFixed(3).padStart(6, "0")}
            <small>/ {end.toFixed(2)}s</small>
          </span>
        </div>
        <div className="tl-top-actions">
          <select
            aria-label="타임라인 확대"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            <option value={60}>60 px/s</option>
            <option value={100}>100 px/s</option>
            <option value={160}>160 px/s</option>
          </select>
          <button aria-label="타임라인 닫기" onClick={p.onClose}>
            <X size={15} />
          </button>
        </div>
      </header>
      <div className="tl-body">
        <div className="tl-left">
          <div className="tl-addbar">
            <span>{p.data.tracks.length} TRACKS</span>
            <div>
              <select
                aria-label="추가할 애니메이션"
                value={preset}
                disabled={p.disabled || !!p.error}
                onChange={(e) => applyChosenPreset(e.target.value as Preset)}
              >
                <option value="slide">위로 등장</option>
                <option value="fade">페이드</option>
                <option value="scale">확대 등장</option>
                <option value="rotate">회전 등장</option>
              </select>
              <button
                disabled={
                  !p.selectedLabel ||
                  p.disabled ||
                  !!p.error ||
                  p.data.tracks.length >= 20
                }
                title={p.selectedLabel || "캔버스에서 요소를 먼저 선택해"}
                onClick={() => {
                  const id = p.onAdd(preset, true);
                  if (id) {
                    setSelected(id);
                    setFrameId(null);
                    restartPreview();
                  }
                }}
              >
                <Plus size={13} />
                프리셋 적용
              </button>
            </div>
          </div>
          <div className="tl-scroll" ref={scrollRef}>
            <div className="tl-sheet" style={{ width: 190 + laneWidth }}>
              <div className="tl-ruler-row">
                <div className="tl-label tl-ruler-label">ELEMENT / CLIP</div>
                <div
                  className="tl-ruler"
                  ref={rulerRef}
                  role="slider"
                  tabIndex={0}
                  aria-label="재생 헤드"
                  aria-valuemin={0}
                  aria-valuemax={length}
                  aria-valuenow={round(time)}
                  onKeyDown={(e) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                    ) {
                      e.preventDefault();
                      stopPlayback();
                      setTime(
                        e.key === "Home"
                          ? 0
                          : e.key === "End"
                            ? end
                            : Math.max(
                                0,
                                Math.min(
                                  length,
                                  round(
                                    time +
                                      (e.key === "ArrowRight" ? 0.1 : -0.1),
                                  ),
                                ),
                              ),
                      );
                    }
                  }}
                  style={{ width: laneWidth }}
                  onPointerDown={beginSeek}
                  onPointerMove={moveSeek}
                  onPointerUp={finishSeek}
                  onPointerCancel={cancelSeek}
                  onLostPointerCapture={cancelSeek}
                >
                  {Array.from({ length: length * 2 + 1 }, (_, i) => (
                    <span
                      className={i % 2 === 0 ? "major" : ""}
                      key={i}
                      style={{ left: (i * zoom) / 2 }}
                    >
                      {i % 2 === 0 ? `${i / 2}s` : ""}
                    </span>
                  ))}
                </div>
              </div>
              {p.data.tracks.map((t, index) => {
                const view = ghost?.id === t.id ? ghost : t;
                const missing = p.missing.includes(t.id);
                return (
                  <div
                    className={`tl-row ${selected === t.id ? "selected" : ""}`}
                    key={t.id}
                  >
                    <button className="tl-label" onClick={() => selectTrack(t)}>
                      <span className={`tl-track-dot color-${index % 3}`} />
                      <span>
                        {t.label}
                        <small>
                          {missing
                            ? "대상 없음 · 다시 연결 필요"
                            : `${t.start.toFixed(2)}s → ${(t.start + t.duration).toFixed(2)}s`}
                        </small>
                      </span>
                    </button>
                    <div
                      className="tl-lane"
                      style={{
                        width: laneWidth,
                        backgroundSize: `${zoom}px 100%`,
                      }}
                      onPointerDown={beginSeek}
                      onPointerMove={moveSeek}
                      onPointerUp={finishSeek}
                      onPointerCancel={cancelSeek}
                      onLostPointerCapture={cancelSeek}
                    >
                      <div
                        className={`tl-clip color-${index % 3} ${missing ? "missing" : ""}`}
                        style={{
                          left: view.start * zoom,
                          width: Math.max(40, view.duration * zoom),
                        }}
                        role="group"
                        tabIndex={0}
                        aria-label={`${t.label} 클립 시작`}
                        aria-valuemin={0}
                        aria-valuemax={60 - t.duration}
                        aria-valuenow={view.start}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                            e.preventDefault();
                            update({
                              ...t,
                              start: round(
                                Math.max(
                                  0,
                                  Math.min(
                                    60 - t.duration,
                                    t.start +
                                      (e.key === "ArrowRight" ? 0.1 : -0.1),
                                  ),
                                ),
                              ),
                            });
                          }
                        }}
                        onPointerDown={(e) => startDrag(e, t, "move")}
                        onPointerMove={moveDrag}
                        onPointerUp={finishDrag}
                        onPointerCancel={cancelDrag}
                        onClick={() => selectTrack(t)}
                      >
                        <span className="tl-clip-name">{t.easing}</span>
                        {view.frames.map((f) => (
                          <button
                            className={`tl-keyframe ${f.offset === 1 ? "tl-resize" : ""} ${frame?.id === f.id && selected === t.id ? "selected" : ""}`}
                            key={f.id}
                            style={{
                              left:
                                f.offset === 0
                                  ? 9
                                  : f.offset === 1
                                    ? "100%"
                                    : `${f.offset * 100}%`,
                            }}
                            aria-label={`${t.label} 키프레임 ${(f.offset * view.duration).toFixed(2)}초${f.offset === 1 ? " · 클립 길이 조절" : ""}`}
                            title={
                              f.offset === 1
                                ? "클릭: 끝 키프레임 선택 · 드래그: 클립 길이 조절"
                                : "클릭: 키프레임 선택 · 드래그: 시점 이동"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(t.id);
                              setFrameId(f.id);
                              p.onSelect(t.targetId);
                              stopPlayback();
                              setTime(t.start + f.offset * t.duration);
                            }}
                            onKeyDown={(e) => {
                              if (
                                f.offset === 1 &&
                                (e.key === "ArrowLeft" ||
                                  e.key === "ArrowRight")
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                                update({
                                  ...t,
                                  duration: round(
                                    Math.max(
                                      0.1,
                                      Math.min(
                                        60 - t.start,
                                        t.duration +
                                          (e.key === "ArrowRight" ? 0.1 : -0.1),
                                      ),
                                    ),
                                  ),
                                });
                              }
                            }}
                            onPointerDown={(e) =>
                              startDrag(
                                e,
                                t,
                                f.offset === 1 ? "resize" : "frame",
                                f,
                              )
                            }
                            onPointerMove={moveDrag}
                            onPointerUp={finishDrag}
                            onPointerCancel={cancelDrag}
                          >
                            <Diamond
                              size={f.offset === 1 ? 12 : 10}
                              fill="currentColor"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div
                className="tl-playhead"
                style={{
                  left: 190 + time * zoom,
                  height: Math.max(110, 35 + p.data.tracks.length * 56),
                }}
              >
                <button
                  className="tl-playhead-grip"
                  aria-label="재생 헤드 손잡이"
                  title="드래그해서 시간 이동"
                  onPointerDown={beginSeek}
                  onPointerMove={moveSeek}
                  onPointerUp={finishSeek}
                  onPointerCancel={cancelSeek}
                  onLostPointerCapture={cancelSeek}
                >
                  <i />
                </button>
              </div>
              {p.data.tracks.length === 0 && (
                <div className="tl-empty">
                  <Film size={23} />
                  <strong>움직임을 시간 위에 놓아봐.</strong>
                  <span>
                    {p.error ||
                      "캔버스에서 요소를 선택하고 애니메이션을 추가해."}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="tl-footnote">
            {p.error ||
              hint ||
              (p.disabled
                ? "실행 모드 · 타임라인을 편집하려면 편집 모드로 돌아가줘."
                : "손잡이로 시간 이동 · 빈 트랙 드래그로 탐색 · 끝 마름모로 길이 조절")}
            <span>60s MAX</span>
          </div>
        </div>
        <aside className="tl-inspector">
          <fieldset disabled={p.disabled || !!p.error}>
            {track && frame ? (
              <>
                <div className="tl-inspector-title">
                  <strong>{track.label}</strong>
                  <button
                    aria-label="선택 트랙 삭제"
                    onClick={() =>
                      p.onChange({
                        ...p.data,
                        tracks: p.data.tracks.filter((t) => t.id !== track.id),
                      })
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {p.missing.includes(track.id) && (
                  <p className="tl-warning">
                    대상 요소가 없어. 트랙을 삭제한 뒤 원하는 요소를 다시
                    추가해줘.
                  </p>
                )}
                <label className="tl-clip-preset">
                  <span>프리셋</span>
                  <select
                    aria-label="선택 클립 프리셋"
                    value={track.preset || "custom"}
                    onChange={(e) => {
                      const next = e.target.value as Preset;
                      setPreset(next);
                      update(applyTrackPreset(track, next));
                      setFrameId(null);
                      p.onSelect(track.targetId);
                      restartPreview();
                    }}
                  >
                    <option value="custom" disabled>
                      사용자 설정
                    </option>
                    <option value="slide">위로 등장</option>
                    <option value="fade">페이드</option>
                    <option value="scale">확대 등장</option>
                    <option value="rotate">회전 등장</option>
                  </select>
                </label>
                <div className="tl-field-pair">
                  <NumberField
                    label="시작 (초)"
                    value={track.start}
                    min={0}
                    max={60 - track.duration}
                    step={0.1}
                    onChange={(n) => update({ ...track, start: n })}
                  />
                  <NumberField
                    label="길이 (초)"
                    value={track.duration}
                    min={0.1}
                    max={60 - track.start}
                    step={0.1}
                    onChange={(n) => update({ ...track, duration: n })}
                  />
                </div>
                <label className="tl-easing">
                  <span>클립 Easing</span>
                  <select
                    aria-label="클립 Easing"
                    value={track.easing}
                    onChange={(e) =>
                      update({ ...track, easing: e.target.value as Easing })
                    }
                  >
                    {EASINGS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 80 40" aria-hidden="true">
                    <path
                      d={curves[frame.easing || track.easing]}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </label>
                <div className="tl-frame-heading">
                  <span>
                    KEYFRAME · {(frame.offset * track.duration).toFixed(2)}s
                  </span>
                  <button
                    title="현재 시간에 키프레임 추가"
                    aria-label="현재 시간에 키프레임 추가"
                    onClick={addKeyframe}
                  >
                    <Plus size={12} />
                    <Diamond size={10} />
                  </button>
                  <button
                    aria-label="선택 키프레임 삭제"
                    disabled={frame.offset === 0 || frame.offset === 1}
                    onClick={() =>
                      update({
                        ...track,
                        frames: track.frames.filter((f) => f.id !== frame.id),
                      })
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="tl-keyframe-fields">
                  <NumberField
                    label="X (px)"
                    value={frame.x}
                    min={-2000}
                    max={2000}
                    onChange={(x) => updateFrame({ x })}
                  />
                  <NumberField
                    label="Y (px)"
                    value={frame.y}
                    min={-2000}
                    max={2000}
                    onChange={(y) => updateFrame({ y })}
                  />
                  <NumberField
                    label="크기 (%)"
                    value={frame.scale * 100}
                    min={5}
                    max={500}
                    onChange={(n) => updateFrame({ scale: n / 100 })}
                  />
                  <NumberField
                    label="회전 (°)"
                    value={frame.rotate}
                    min={-1080}
                    max={1080}
                    onChange={(rotate) => updateFrame({ rotate })}
                  />
                  <NumberField
                    label="불투명도 (%)"
                    value={frame.opacity * 100}
                    min={0}
                    max={100}
                    onChange={(n) => updateFrame({ opacity: n / 100 })}
                  />
                </div>
                <label className="tl-segment">
                  <span>다음 구간 Easing</span>
                  <select
                    aria-label="키프레임 구간 Easing"
                    value={frame.easing || ""}
                    disabled={frame.offset === 1}
                    onChange={(e) =>
                      updateFrame({
                        easing: (e.target.value || undefined) as
                          Easing | undefined,
                      })
                    }
                  >
                    <option value="">클립 설정 따르기</option>
                    {EASINGS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <div className="tl-inspector-empty">
                <Diamond size={22} />
                <span>
                  클립이나 키프레임을 선택해
                  <br />
                  움직임을 세밀하게 다듬어봐.
                </span>
              </div>
            )}
          </fieldset>
        </aside>
      </div>
    </section>
  );
}
