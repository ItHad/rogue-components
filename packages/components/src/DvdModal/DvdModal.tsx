import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useMessages } from "../locale";
import "./DvdModal.css";

const MESSAGES = {
  ja: { close: "閉じる", gearUp: "そろそろギア上げてくよ" },
  en: { close: "Close", gearUp: "Time to shift up a gear." },
};

/**
 * 端から端まで移動する時間 (秒)。比が 3:2 なので、3 秒ごとにぴったり角に当たる。
 * x, y の位置は時刻だけで決まる三角波なので、ウィンドウの大きさが変わっても角に当たる周期は変わらない。
 */
const CROSS_X_SEC = 1.5;
const CROSS_Y_SEC = 1.0;
/**
 * 動き出してからこの時間 (ミリ秒) は × に当たっても閉じない。
 * スマホでは指が触れた瞬間に pointerenter → pointerdown と続けて届くので、これがないと止まっている × をそのまま押せてしまう。
 */
const GRACE_MS = 200;
/**
 * 動き出した時刻 → 動き出してからの秒 (まだ右上でじっとしている間は null)。
 * x は CROSS_X_SEC ずらして右端から、y は上端から動き出すので、出発点は右上の角になる。
 */
function motionTime(movingSince: number | null, now: number): number | null {
  return movingSince === null ? null : Math.max(0, (now - movingSince) / 1000);
}

/** ギアを上げたあとの、端から端まで移動する時間 (秒)。比は同じ 3:2 */
const GEAR_CROSS_X_SEC = 0.6;
const GEAR_CROSS_Y_SEC = 0.4;
/** ギアを上げるときに、その場で「そろそろギア上げてくよ」と言っている時間 (ミリ秒)。この間は当てても閉じない */
const ANNOUNCE_MS = 1400;
/** ギアを上げたあとに × が動ける、画面の端からの余白 (px) */
const GEAR_MARGIN = 8;

/** 0 → 1 → 0 → 1 … と往復する三角波 */
function bounce(t: number, cross: number) {
  const p = (t / cross) % 2;
  return p < 1 ? p : 2 - p;
}


export interface DvdModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Escape キーで閉じられるようにするか (既定は true) */
  closeOnEscape?: boolean;
  /**
   * true にすると、× は動き出す前に「そろそろギア上げてくよ」と宣言し、
   * そのあと小さくなって、速く、モーダルの枠の外 (画面全体) まで跳ね回る。
   */
  gearUp?: boolean;
  className?: string;
}

/**
 * 一見ふつうのモーダル。閉じるボタンにカーソルを合わせた瞬間、DVD ロゴのように跳ね回り始める。
 * 跳ね回っている × に当てられれば閉じる。gearUp にすると、宣言してから小さく速く、枠の外まで跳ね回る。
 */
export function DvdModal({
  open,
  title,
  onClose,
  children,
  closeOnEscape = true,
  gearUp = false,
  className,
}: DvdModalProps) {
  const t = useMessages(MESSAGES);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** × が動き出した時刻。カーソルが乗るまでは null で、右上でじっとしている */
  const movingSinceRef = useRef<number | null>(null);
  /** ギアを上げて動き出したときの位相のずれ (秒)。そのときいた位置から続けて動かすため */
  const gearPhaseRef = useRef<{ x: number; y: number } | null>(null);
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
    gearPhaseRef.current = null;

    let raf = 0;
    const tick = (now: number) => {
      const dialog = dialogRef.current;
      const btn = buttonRef.current;
      if (dialog && btn) {
        const t = motionTime(movingSinceRef.current, now);
        const announcing = gearUp && t !== null && t * 1000 < ANNOUNCE_MS;
        const geared = gearUp && t !== null && !announcing;
        // 小さくなるのは CSS 側。大きさが変わるので、位置は毎フレームいまの大きさで計算する
        dialog.toggleAttribute("data-announce", announcing);
        dialog.toggleAttribute("data-gear", geared);
        btn.toggleAttribute("data-gear", geared);
        const bw = btn.offsetWidth;
        const bh = btn.offsetHeight;
        let px: number;
        let py: number;
        let hits = 0;
        if (t === null || announcing) {
          // 右上でじっとしている (宣言中も)
          px = dialog.clientWidth - bw;
          py = 0;
        } else if (!geared) {
          px = bounce(t + CROSS_X_SEC, CROSS_X_SEC) * (dialog.clientWidth - bw);
          py = bounce(t, CROSS_Y_SEC) * (dialog.clientHeight - bh);
          hits = Math.floor(t / CROSS_X_SEC) + Math.floor(t / CROSS_Y_SEC);
        } else {
          // 画面全体を、モーダルの左上を原点にした座標で跳ね回る
          const r = dialog.getBoundingClientRect();
          const ox = r.left + dialog.clientLeft;
          const oy = r.top + dialog.clientTop;
          const left = GEAR_MARGIN - ox;
          const top = GEAR_MARGIN - oy;
          const w = Math.max(1, window.innerWidth - GEAR_MARGIN * 2 - bw);
          const h = Math.max(1, window.innerHeight - GEAR_MARGIN * 2 - bh);
          // 宣言していた右上から、x は右へ、y は下へ向かって動き出す
          gearPhaseRef.current ??= {
            x: Math.min(1, Math.max(0, (dialog.clientWidth - bw - left) / w)) * GEAR_CROSS_X_SEC,
            y: Math.min(1, Math.max(0, -top / h)) * GEAR_CROSS_Y_SEC,
          };
          const g = t - ANNOUNCE_MS / 1000;
          const gx = g + gearPhaseRef.current.x;
          const gy = g + gearPhaseRef.current.y;
          px = left + bounce(gx, GEAR_CROSS_X_SEC) * w;
          py = top + bounce(gy, GEAR_CROSS_Y_SEC) * h;
          hits = Math.floor(gx / GEAR_CROSS_X_SEC) + Math.floor(gy / GEAR_CROSS_Y_SEC);
        }
        btn.style.transform = `translate(${px}px, ${py}px)`;
        btn.toggleAttribute("data-moving", t !== null);
        // DVD ロゴのように、壁に当たるたびに色が変わる
        btn.style.setProperty("--rc-dvd-hue", String((hits * 67) % 360));
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
  }, [open, closeOnEscape, gearUp]);

  if (!open) return null;

  /** 押した瞬間に × がそこにあったか (動いているので、ボタン自体のクリックではなく位置で調べる) */
  const isOnButton = (x: number, y: number) => {
    const btn = buttonRef.current;
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  return (
    <div
      className="rc-dvd-backdrop"
      // ギアを上げた × はモーダルの外にも出るので、当たり判定は背景ごと受ける
      onPointerDown={(e) => {
        // 動かしながら連打すると文字が選択され、選択した文字や画像のドラッグが始まると次のクリックが届かなくなる
        getSelection()?.removeAllRanges();
        if (isOnButton(e.clientX, e.clientY)) {
          e.preventDefault();
          movingSinceRef.current ??= performance.now();
          const elapsed = performance.now() - movingSinceRef.current;
          // 動き出した直後と、ギアを上げると宣言している間は判定なし (外れ扱いにもしない)
          if (elapsed < GRACE_MS || (gearUp && elapsed < ANNOUNCE_MS)) return;
          onCloseRef.current();
        } else if (movingSinceRef.current !== null) {
          setMisses((m) => m + 1);
        }
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        ref={dialogRef}
        className={["rc-dvd", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
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
              onCloseRef.current();
            }
          }}
        >
          <span key={misses} className="rc-dvd__x" data-miss={misses > 0 || undefined}>
            ×
          </span>
        </button>
        {gearUp && (
          <p className="rc-dvd__speech" aria-hidden="true">
            {t.gearUp}
          </p>
        )}
      </div>
    </div>
  );
}
