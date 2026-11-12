import { useEffect, useState } from "react";
import { MousePointer2, Plus, Trash2, Pencil } from "lucide-react";
import { atPath, pathOf } from "./document";
import { ACTIONS, type ActionKind, type Interaction } from "./interactions";
import type { CommandName } from "./commands";

export function InteractionPanel({
  doc,
  selected,
  rules,
  error,
  command,
  onSelect,
  onRun,
}: {
  doc: Document;
  selected: string | null;
  rules: Interaction[];
  error?: string;
  command: (
    name: CommandName,
    args: Record<string, unknown>,
  ) => { ok: boolean };
  onSelect: (path: string) => void;
  onRun: () => void;
}) {
  const [target, setTarget] = useState("");
  const [action, setAction] = useState<ActionKind>("toggle");
  const [className, setClassName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setTarget("");
    setEditing(null);
    setMessage("");
  }, [selected, doc]);
  const elements = Array.from(doc.body.querySelectorAll("*")).filter(
    (el) => !["SCRIPT", "STYLE", "LINK", "META"].includes(el.tagName),
  );
  const source = selected === null ? null : atPath(doc, selected);
  const label = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : el.classList[0] ? "." + el.classList[0] : ""} · ${(el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 22)}`;
  const matches = (id: string) => elements.filter((el) => el.id === id);
  const resolve = (id: string) =>
    matches(id).length === 1 ? matches(id)[0] : null;
  return (
    <div className="interaction-panel">
      <div className="interaction-intro">
        <MousePointer2 size={18} />
        <h2>동작 연결</h2>
        <p>어떤 요소를 클릭하면 무엇이 바뀔지 연결해.</p>
      </div>
      {error && (
        <p className="interaction-error" role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!source || !target || error) return;
          const result = command("saveInteraction", {
            nodeId: "node:" + selected,
            targetNodeId: "node:" + target,
            action,
            ...(action === "toggleClass" ? { className } : {}),
            ...(editing ? { ruleId: editing } : {}),
          });
          if (result.ok) {
            setTarget("");
            setEditing(null);
            setMessage("연결했어. 실행 모드에서 클릭해봐!");
          }
        }}
      >
        <h3>{editing ? "연결 수정" : "새 연결"}</h3>
        <div className="interaction-source">
          <span>클릭할 요소</span>
          <strong>
            {source ? label(source) : "캔버스나 레이어에서 먼저 선택해"}
          </strong>
        </div>
        <label>
          바뀔 대상
          <select
            aria-label="동작 대상"
            value={target}
            disabled={!source || !!error}
            required
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">대상 요소 선택</option>
            {elements.map((el) => (
              <option key={pathOf(el)} value={pathOf(el)}>
                {label(el)}
              </option>
            ))}
          </select>
        </label>
        <label>
          할 일
          <select
            aria-label="클릭 동작"
            value={action}
            disabled={!!error}
            onChange={(e) => setAction(e.target.value as ActionKind)}
          >
            {Object.entries(ACTIONS).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {action === "toggleClass" && (
          <label>
            전환할 클래스
            <input
              aria-label="전환할 클래스"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="예: is-active"
              required
              pattern="[^\s]+"
            />
            <small>CSS에 정의한 클래스 이름 하나를 입력해.</small>
          </label>
        )}
        <button
          className="interaction-save"
          disabled={!source || !target || !!error}
        >
          <Plus size={13} />
          {editing ? "변경 저장" : "연결 추가"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setTarget("");
            }}
          >
            수정 취소
          </button>
        )}
        {message && <p role="status">{message}</p>}
      </form>
      <div className="interaction-list">
        <h3>
          연결된 동작 <span>{rules.length} / 50</span>
        </h3>
        {!rules.length && (
          <p className="interaction-empty">
            아직 연결된 동작이 없어.
            <br />
            버튼과 콘텐츠를 연결해봐.
          </p>
        )}
        {rules.map((rule) => {
          const from = resolve(rule.sourceId),
            to = resolve(rule.targetId);
          return (
            <article className="interaction-rule" key={rule.id}>
              <div className="interaction-rule-heading">
                <strong>{ACTIONS[rule.action]}</strong>
                <button
                  aria-label={`동작 연결 삭제 ${rule.id}`}
                  title="연결 삭제"
                  disabled={!!error}
                  onClick={() =>
                    command("removeInteraction", { ruleId: rule.id })
                  }
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <button
                className="interaction-element"
                disabled={!from}
                onClick={() => from && onSelect(pathOf(from))}
              >
                {from ? label(from) : `찾을 수 없음: #${rule.sourceId}`}
              </button>
              <div className="interaction-arrow">클릭 ↓</div>
              <button
                className="interaction-element"
                disabled={!to}
                onClick={() => to && onSelect(pathOf(to))}
              >
                {to ? label(to) : `찾을 수 없음: #${rule.targetId}`}
              </button>
              {rule.className && <code>.{rule.className}</code>}
              {(!from || !to) && (
                <p className="interaction-error">
                  요소 삭제·ID 변경 또는 중복을 확인해줘. 이 연결은 실행되지
                  않아.
                </p>
              )}
              {from === source && to && (
                <button
                  className="interaction-edit"
                  disabled={!!error}
                  onClick={() => {
                    setEditing(rule.id);
                    setTarget(pathOf(to));
                    setAction(rule.action);
                    setClassName(rule.className || "");
                    setMessage("");
                  }}
                >
                  <Pencil size={11} />
                  수정
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="interaction-help">
        <p>
          편집 모드에서는 요소를 선택해.
          <br />
          실행 모드에서는 연결된 동작이 작동해.
          <br />
          실행을 끝내면 처음 상태로 돌아와.
        </p>
        <button onClick={onRun}>
          <MousePointer2 size={13} />
          실행 모드에서 확인
        </button>
      </div>
    </div>
  );
}
