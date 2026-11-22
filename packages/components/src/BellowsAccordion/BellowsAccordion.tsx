import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { capturePointer } from "../capturePointer";
import { useMessages } from "../locale";
import "./BellowsAccordion.css";

const MESSAGES = {
  ja: {
    hint: "持ち手を左右に引っぱって開く",
    leaking: "空気が抜けていく…",
    puff: "プシュー",
    left: "左の持ち手",
    right: "右の持ち手",
  },
  en: {
    hint: "Pull the handles apart to open",
    leaking: "The air is leaking out…",
    puff: "Pfffff",
    left: "Left handle",
    right: "Right handle",
  },
};

export interface BellowsAccordionProps {
  /** 見出し */
  label: ReactNode;
  /** 蛇腹を広げると見える中身 */
  children: ReactNode;
  className?: string;
}

type Side = "left" | "right";

const HANDLE_PX = 28;
/** 閉じきっても残る蛇腹の幅 */
const CLOSED_PX = 36;
/** 持っている間に抜ける空気 (px/秒) */
const LEAK_HELD = 70;
/** 手を離したときに抜ける空気 (px/秒) */
const LEAK_FREE = 360;
const KEY_STEP = 28;
/** キーを押してから「持っている」と見なす時間 */
const KEY_HOLD_MS = 220;
const FOLDS = 12;

/**
 * 見た目は普通のアコーディオン (開閉する見出し)。開くには本物のアコーディオンのように左右の持ち手を引っぱる。
 * 蛇腹からは空気が抜け続けるので、引っぱり続けないと閉じてしまう。
 */
export function BellowsAccordion({ label, children, className }: BellowsAccordionProps) {
  const m = useMessages(MESSAGES);
  const contentId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(240);
  const [width, setWidth] = useState(0);
  const [held, setHeld] = useState(false);
  const [puffs, setPuffs] = useState(0);
  const widthRef = useRef(0);
  const maxRef = useRef(max);
  const pointers = useRef(new Map<number, { side: Side; x: number }>());
  const keyHeldUntil = useRef(0);

  maxRef.current = max;

  const setStretch = (next: number) => {
    const clamped = Math.min(maxRef.current, Math.max(0, next));
    widthRef.current = clamped;
    setWidth(clamped);
  };

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const next = Math.max(60, el.clientWidth - HANDLE_PX * 2 - CLOSED_PX);
      setMax(next);
      if (widthRef.current > next) setStretch(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const open = width > 0;

  // 開いている間は空気が抜け続ける
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const holding = pointers.current.size > 0 || now < keyHeldUntil.current;
      setStretch(widthRef.current - (holding ? LEAK_HELD : LEAK_FREE) * dt);
      if (widthRef.current > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const release = (id: number) => {
    if (!pointers.current.delete(id)) return;
    if (pointers.current.size === 0) {
      setHeld(false);
      if (widthRef.current > 0) setPuffs((n) => n + 1);
    }
  };

  const handlers = (side: Side) => ({
    onPointerDown: (e: PointerEvent<HTMLSpanElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.focus();
      capturePointer(e);
      pointers.current.set(e.pointerId, { side, x: e.clientX });
      setHeld(true);
    },
    onPointerMove: (e: PointerEvent<HTMLSpanElement>) => {
      const p = pointers.current.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      p.x = e.clientX;
      const outward = side === "right" ? dx : -dx;
      // 片手で引くときは反対側も同じだけ動いたことにする
      setStretch(widthRef.current + outward * (pointers.current.size === 1 ? 2 : 1));
    },
    onPointerUp: (e: PointerEvent<HTMLSpanElement>) => release(e.pointerId),
    onPointerCancel: (e: PointerEvent<HTMLSpanElement>) => release(e.pointerId),
    onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const outward = (e.key === "ArrowRight") === (side === "right");
      keyHeldUntil.current = performance.now() + KEY_HOLD_MS;
      setStretch(widthRef.current + (outward ? KEY_STEP : -KEY_STEP));
    },
    onKeyUp: (e: KeyboardEvent<HTMLSpanElement>) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      keyHeldUntil.current = 0;
      if (widthRef.current > 0) setPuffs((n) => n + 1);
    },
  });

  const ratio = width / max;
  const percent = Math.round(ratio * 100);
  const readable = ratio >= 0.6;
  const status = !open ? m.hint : held ? m.leaking : "";

  const handle = (side: Side) => (
    <span
      role="slider"
      tabIndex={0}
      className={`rc-acc__handle rc-acc__handle--${side}`}
      aria-label={side === "left" ? m.left : m.right}
      aria-controls={contentId}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%`}
      {...handlers(side)}
    />
  );

  return (
    <div
      className={["rc-acc", className].filter(Boolean).join(" ")}
      data-open={open || undefined}
      data-held={held || undefined}
      style={
        {
          "--rc-acc-ratio": ratio,
          "--rc-acc-full": `${max + CLOSED_PX}px`,
          "--rc-acc-folds": FOLDS,
        } as CSSProperties
      }
    >
      <p className="rc-acc__head">
        <span className="rc-acc__label">{label}</span>
        <span className="rc-acc__status" aria-live="polite">
          {status}
        </span>
      </p>
      <div ref={trackRef} className="rc-acc__track">
        <div className="rc-acc__instrument">
          {handle("left")}
          <div className="rc-acc__bellows" style={{ width: CLOSED_PX + width }}>
            <div id={contentId} className="rc-acc__content" aria-hidden={!readable}>
              {children}
            </div>
            <span className="rc-acc__folds" aria-hidden="true" />
            {puffs > 0 && open && !held && (
              <span key={puffs} className="rc-acc__puff" aria-hidden="true">
                {m.puff}
              </span>
            )}
          </div>
          {handle("right")}
        </div>
      </div>
    </div>
  );
}
