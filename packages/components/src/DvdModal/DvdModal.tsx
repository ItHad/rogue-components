import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useMessages } from "../locale";
import "./DvdModal.css";

const MESSAGES = { ja: { close: "閉じる" }, en: { close: "Close" } };

/**
 * 端から端まで移動する時間 (秒)。比が 3:2 なので、3 秒ごとにぴったり角に当たる。
 * x, y の位置は時刻だけで決まる三角波なので、ウィンドウの大きさが変わっても角に当たる周期は変わらない。
 */
const CROSS_X_SEC = 1.5;
const CROSS_Y_SEC = 1.0;
/** 角から何秒以内ならクリックを受け付けるか */
const CORNER_WINDOW_SEC = 0.2;
/** 角にいる間の当たり判定の余白 (px) */
const HIT_SLOP_PX = 28;
/**
 * 動き出した時刻 → 動き出してからの秒 (まだ右上でじっとしている間は null)。
 * x は CROSS_X_SEC ずらして右端から、y は上端から動き出すので、出発点は右上の角になる。
 */
function motionTime(movingSince: number | null, now: number): number | null {
  return movingSince === null ? null : Math.max(0, (now - movingSince) / 1000);
}

/** 出発直後の右上の角は数えない */
function canClose(t: number | null) {
  return t !== null && t > 1 && isAtCorner(t);
}

/** 0 → 1 → 0 → 1 … と往復する三角波 */
function bounce(t: number, cross: number) {
  const p = (t / cross) % 2;
  return p < 1 ? p : 2 - p;
}

/** 壁から何秒離れているか */
function secFromWall(t: number, cross: number) {
  const p = (t / cross) % 1;
  return Math.min(p, 1 - p) * cross;
}

function isAtCorner(t: number) {
  return secFromWall(t, CROSS_X_SEC) <= CORNER_WINDOW_SEC && secFromWall(t, CROSS_Y_SEC) <= CORNER_WINDOW_SEC;
}

export interface DvdModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Escape キーで閉じられるようにするか (既定は true) */
  closeOnEscape?: boolean;
  className?: string;
}

/**
 * 一見ふつうのモーダル。閉じるボタンにカーソルを合わせた瞬間、DVD ロゴのように跳ね回り始め、
 * 角に当たった瞬間だけ押せる。
 */
export function DvdModal({ open, title, onClose, children, closeOnEscape = true, className }: DvdModalProps) {
  const t = useMessages(MESSAGES);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** × が動き出した時刻。カーソルが乗るまでは null で、右上でじっとしている */
  const movingSinceRef = useRef<number | null>(null);
  const [misses, setMisses] = useState(0);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setMisses(0);
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    movingSinceRef.current = null;

    let raf = 0;
    const tick = (now: number) => {
      const dialog = dialogRef.current;
      const btn = buttonRef.current;
      if (dialog && btn) {
        const t = motionTime(movingSinceRef.current, now);
        const w = dialog.clientWidth - btn.offsetWidth;
        const h = dialog.clientHeight - btn.offsetHeight;
        const x = t === null ? 1 : bounce(t + CROSS_X_SEC, CROSS_X_SEC);
        const y = t === null ? 0 : bounce(t, CROSS_Y_SEC);
        btn.style.transform = `translate(${x * w}px, ${y * h}px)`;
        btn.toggleAttribute("data-moving", t !== null);
        // DVD ロゴのように、壁に当たるたびに色が変わる
        const hits = t === null ? 0 : Math.floor(t / CROSS_X_SEC) + Math.floor(t / CROSS_Y_SEC);
        btn.style.setProperty("--rc-dvd-hue", String((hits * 67) % 360));
        btn.toggleAttribute("data-corner", canClose(t));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, closeOnEscape]);

  if (!open) return null;

  /** ボタンの上か、角にいる間だけはその少し外側も当たりにする */
  const isNearButton = (x: number, y: number) => {
    const btn = buttonRef.current;
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    const slop = btn.hasAttribute("data-corner") ? HIT_SLOP_PX : 0;
    return x >= r.left - slop && x <= r.right + slop && y >= r.top - slop && y <= r.bottom + slop;
  };

  const tryClose = () => {
    const t = motionTime(movingSinceRef.current, performance.now());
    if (canClose(t)) onCloseRef.current();
    else setMisses((m) => m + 1);
  };

  return (
    <div className="rc-dvd-backdrop">
      <div
        ref={dialogRef}
        className={["rc-dvd", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onPointerDown={(e) => {
          // 動かしながら連打すると文字が選択され、選択した文字や画像のドラッグが始まると次のクリックが届かなくなる
          getSelection()?.removeAllRanges();
          if (!isNearButton(e.clientX, e.clientY)) return;
          e.preventDefault();
          tryClose();
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="rc-dvd__content">
          <h2 id={titleId} className="rc-dvd__title">
            {title}
          </h2>
          {children}
        </div>
        <button
          ref={buttonRef}
          type="button"
          className="rc-dvd__close"
          aria-label={t.close}
          onPointerEnter={() => {
            movingSinceRef.current ??= performance.now();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              tryClose();
            }
          }}
        >
          <span key={misses} className="rc-dvd__x" data-miss={misses > 0 || undefined}>
            ×
          </span>
        </button>
      </div>
    </div>
  );
}
