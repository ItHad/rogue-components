import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { capturePointer } from "../capturePointer";
import { useMessages } from "../locale";
import { useControllable } from "../useControllable";
import "./SafeDial.css";

export const DIAL_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789!?#$";
const STEP = 360 / DIAL_CHARS.length;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 中心から見たポインタの角度 (真上が 0、時計回りが正) */
function pointerAngle(e: PointerEvent, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

const MESSAGES = {
  ja: { show: "表示", hide: "隠す", backspace: "1 文字消す", current: "いまの文字" },
  en: { show: "Show", hide: "Hide", backspace: "Delete one character", current: "Current character" },
};

export interface SafeDialProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** true にすると、ドラッグやキー操作と逆向きにダイヤルが回る */
  reverse?: boolean;
  maxLength?: number;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * 一見ふつうのパスワード欄。触ると金庫のダイヤルが現れ、1 文字ずつ回して入力する。
 * ダイヤルをドラッグ (または ← → キー) で回し、真上の文字を中央のボタン (または Enter) で確定する。
 * reverse にすると逆向きに回る。
 */
export function SafeDial({
  value: valueProp,
  defaultValue = "",
  onChange,
  reverse = false,
  maxLength = 32,
  label,
  disabled = false,
  className,
}: SafeDialProps) {
  const t = useMessages(MESSAGES);
  const [value, setValue] = useControllable(valueProp, defaultValue, onChange);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [open, setOpen] = useState(false);
  const lastPointer = useRef(0);
  const dialRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const openDial = () => {
    setOpen(true);
    // 現れたダイヤルにフォーカスを移して、キーボードでもそのまま回せるようにする
    requestAnimationFrame(() => dialRef.current?.focus());
  };

  const current = DIAL_CHARS[mod(Math.round(-angle / STEP), DIAL_CHARS.length)]!;
  const dir = reverse ? -1 : 1;

  const commit = () => {
    if (disabled || value.length >= maxLength) return;
    setValue(value + current);
  };
  const backspace = () => {
    if (disabled) return;
    setValue(value.slice(0, -1));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    capturePointer(e);
    lastPointer.current = pointerAngle(e, e.currentTarget);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const a = pointerAngle(e, e.currentTarget);
    const delta = mod(a - lastPointer.current + 180, 360) - 180;
    lastPointer.current = a;
    setAngle((v) => v + delta * dir);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    setAngle((v) => Math.round(v / STEP) * STEP);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    // → で次の文字 (時計回りの隣) が真上に来るよう、ダイヤルは反時計回りに回る。reverse なら逆。
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      setAngle((v) => Math.round(v / STEP) * STEP - STEP * dir);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      setAngle((v) => Math.round(v / STEP) * STEP + STEP * dir);
    } else if (e.key === "Enter" || e.key === " ") {
      commit();
    } else if (e.key === "Backspace") {
      backspace();
    } else {
      return;
    }
    e.preventDefault();
  };

  return (
    <div
      className={["rc-sd", className].filter(Boolean).join(" ")}
      data-reverse={reverse || undefined}
      data-disabled={disabled || undefined}
    >
      {label && (
        <span id={labelId} className="rc-sd__label">
          {label}
        </span>
      )}
      {/* 見た目はただのパスワード欄。触るとダイヤルが現れる */}
      <div className="rc-sd__field" data-open={open || undefined}>
        <button
          type="button"
          className="rc-sd__input"
          aria-labelledby={label ? labelId : undefined}
          disabled={disabled}
          onClick={openDial}
        >
          <span className="rc-sd__text" aria-live="polite">
            {reveal ? value : "●".repeat(value.length)}
          </span>
        </button>
        <button
          type="button"
          className="rc-sd__mini"
          onClick={() => setReveal((r) => !r)}
          aria-pressed={reveal}
        >
          {reveal ? t.hide : t.show}
        </button>
      </div>

      {open && (
        <div className="rc-sd__safe">
          <button
            type="button"
            className="rc-sd__back"
            onClick={backspace}
            disabled={disabled || value.length === 0}
            aria-label={t.backspace}
          >
            ⌫
          </button>
          <span className="rc-sd__marker" aria-hidden="true" />
          <div
            ref={dialRef}
            className="rc-sd__dial"
            role="spinbutton"
            tabIndex={disabled ? -1 : 0}
            aria-labelledby={label ? labelId : undefined}
            aria-valuetext={`${t.current} ${current}`}
            aria-valuenow={DIAL_CHARS.indexOf(current)}
            aria-valuemin={0}
            aria-valuemax={DIAL_CHARS.length - 1}
            data-dragging={dragging || undefined}
            style={{ transform: `rotate(${angle}deg)` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
          >
            {[...DIAL_CHARS].map((c, i) => (
              <span
                key={c}
                className="rc-sd__char"
                data-current={c === current || undefined}
                style={{ transform: `rotate(${i * STEP}deg)` }}
              >
                <span>{c}</span>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="rc-sd__hub"
            onClick={commit}
            disabled={disabled || value.length >= maxLength}
          >
            <span className="rc-sd__hub-char">{current}</span>
          </button>
        </div>
      )}
    </div>
  );
}
