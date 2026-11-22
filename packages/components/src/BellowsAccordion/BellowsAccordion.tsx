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
    nag: "アコーディオンなんだから、ひっぱらないと",
    leaking: "空気が抜けていく…",
    puff: "プシュー",
  },
  en: {
    nag: "It's an accordion. You have to pull it.",
    leaking: "The air is leaking out…",
    puff: "Pfffff",
  },
};

export interface BellowsAccordionProps {
  /** 見出し */
  label: ReactNode;
  /** 蛇腹を広げると見える中身 */
  children: ReactNode;
  className?: string;
}

/** 持っている間に抜ける空気 (px/秒) */
const LEAK_HELD = 70;
/** 手を離したときに抜ける空気 (px/秒) */
const LEAK_FREE = 360;
const KEY_STEP = 28;
/** キーを押してから「持っている」と見なす時間 */
const KEY_HOLD_MS = 220;
/** これより動かさずに離したらクリックとみなす */
const CLICK_SLOP_PX = 6;
const NAG_MS = 2600;
const FOLDS = 12;

/**
 * 見た目は普通のアコーディオン (› の付いた見出し)。押しても開かず、› をつかんで右へ引っぱると、見出しとの間に蛇腹が広がって中身が見える。
 * 蛇腹からは空気が抜け続けるので、引っぱり続けないと閉じてしまう。
 */
export function BellowsAccordion({ label, children, className }: BellowsAccordionProps) {
  const m = useMessages(MESSAGES);
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLButtonElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(240);
  const [offset, setOffset] = useState(0);
  const [width, setWidth] = useState(0);
  const [held, setHeld] = useState(false);
  const [puffs, setPuffs] = useState(0);
  const [nag, setNag] = useState(0);
  const widthRef = useRef(0);
  const maxRef = useRef(max);
  const grip = useRef<{ id: number; x: number; travel: number } | null>(null);
  const keyHeldUntil = useRef(0);

  maxRef.current = max;

  const setStretch = (next: number) => {
    const clamped = Math.min(maxRef.current, Math.max(0, next));
    widthRef.current = clamped;
    setWidth(clamped);
  };

  // 蛇腹は中身がちょうど収まる幅まで広がる。全開にしたとき全体が真ん中に来るよう、閉じているときの見出しは左に寄せておく
  useLayoutEffect(() => {
    const root = rootRef.current;
    const summary = summaryRef.current;
    const handle = handleRef.current;
    const content = contentRef.current;
    if (!root || !summary || !handle || !content) return;
    const measure = () => {
      const room = root.clientWidth - summary.offsetWidth - handle.offsetWidth;
      root.style.setProperty("--rc-acc-room", `${Math.max(60, room)}px`);
      const next = Math.max(60, Math.min(room, content.offsetWidth));
      setOffset(Math.max(0, (room - next) / 2));
      setMax(next);
      if (widthRef.current > next) setStretch(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(summary);
    ro.observe(content);
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
      const holding = grip.current !== null || now < keyHeldUntil.current;
      setStretch(widthRef.current - (holding ? LEAK_HELD : LEAK_FREE) * dt);
      if (widthRef.current > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!nag) return;
    const id = window.setTimeout(() => setNag(0), NAG_MS);
    return () => window.clearTimeout(id);
  }, [nag]);

  const scold = () => setNag((n) => n + 1);

  const onPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0 || grip.current) return;
    capturePointer(e);
    grip.current = { id: e.pointerId, x: e.clientX, travel: 0 };
    setHeld(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    g.x = e.clientX;
    g.travel += Math.abs(dx);
    if (g.travel >= CLICK_SLOP_PX) setNag(0);
    setStretch(widthRef.current + dx);
  };

  const release = (e: PointerEvent<HTMLSpanElement>) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    setHeld(false);
    if (e.type === "pointerup" && g.travel < CLICK_SLOP_PX) scold();
    if (widthRef.current > 0) setPuffs((n) => n + 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight") return;
    e.preventDefault();
    keyHeldUntil.current = performance.now() + KEY_HOLD_MS;
    setStretch(widthRef.current + KEY_STEP);
  };

  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight") return;
    keyHeldUntil.current = 0;
    if (widthRef.current > 0) setPuffs((n) => n + 1);
  };

  const ratio = width / max;
  const readable = ratio >= 0.6;
  const status = nag ? m.nag : open && held ? m.leaking : "";

  return (
    <div
      ref={rootRef}
      className={["rc-acc", className].filter(Boolean).join(" ")}
      data-open={open || undefined}
      data-held={held || undefined}
      style={
        {
          "--rc-acc-ratio": ratio,
          "--rc-acc-folds": FOLDS,
        } as CSSProperties
      }
    >
      <p className="rc-acc__status" aria-live="polite">
        {status && (
          <span key={nag} data-nag={nag ? "" : undefined}>
            {status}
          </span>
        )}
      </p>
      <div className="rc-acc__row" style={{ paddingInlineStart: offset }}>
        <button
          ref={summaryRef}
          type="button"
          className="rc-acc__summary"
          aria-expanded={readable}
          aria-controls={contentId}
          onClick={scold}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        >
          {label}
        </button>
        <div id={contentId} className="rc-acc__bellows" style={{ width }}>
          <div ref={contentRef} className="rc-acc__content" aria-hidden={!readable}>
            {children}
          </div>
          <span className="rc-acc__folds" aria-hidden="true" />
          {puffs > 0 && !held && (
            <span key={puffs} className="rc-acc__puff" aria-hidden="true">
              {m.puff}
            </span>
          )}
        </div>
        <span
          ref={handleRef}
          className="rc-acc__handle"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <span className="rc-acc__chevron" />
        </span>
      </div>
    </div>
  );
}
