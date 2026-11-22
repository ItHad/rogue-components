import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
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

type Side = "left" | "right";

const HANDLE_PX = 28;
/** 閉じきる直前に残る蛇腹の幅 */
const CLOSED_PX = 36;
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
 * 見た目は普通のアコーディオン (開閉する見出し)。押しても開かず、本物のアコーディオンのように見出しを左右に引っぱると蛇腹が広がる。
 * 蛇腹からは空気が抜け続けるので、引っぱり続けないと閉じてしまう。
 */
export function BellowsAccordion({ label, children, className }: BellowsAccordionProps) {
  const m = useMessages(MESSAGES);
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(240);
  const [width, setWidth] = useState(0);
  const [held, setHeld] = useState(false);
  const [puffs, setPuffs] = useState(0);
  const [nag, setNag] = useState(0);
  const widthRef = useRef(0);
  const maxRef = useRef(max);
  const pointers = useRef(new Map<number, { side: Side; x: number; travel: number }>());
  const keyHeldUntil = useRef(0);

  maxRef.current = max;

  const setStretch = (next: number) => {
    const clamped = Math.min(maxRef.current, Math.max(0, next));
    widthRef.current = clamped;
    setWidth(clamped);
  };

  useLayoutEffect(() => {
    const el = rootRef.current;
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

  useEffect(() => {
    if (!nag) return;
    const id = window.setTimeout(() => setNag(0), NAG_MS);
    return () => window.clearTimeout(id);
  }, [nag]);

  const scold = () => setNag((n) => n + 1);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // 真ん中より左をつかんだら左の持ち手、右なら右の持ち手
    const side: Side = e.clientX < rect.left + rect.width / 2 ? "left" : "right";
    capturePointer(e);
    pointers.current.set(e.pointerId, { side, x: e.clientX, travel: 0 });
    setHeld(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    p.x = e.clientX;
    p.travel += Math.abs(dx);
    if (p.travel >= CLICK_SLOP_PX) setNag(0);
    const outward = p.side === "right" ? dx : -dx;
    // 片手で引くときは反対側も同じだけ動いたことにする
    setStretch(widthRef.current + outward * (pointers.current.size === 1 ? 2 : 1));
  };

  const release = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    pointers.current.delete(e.pointerId);
    if (e.type === "pointerup" && p.travel < CLICK_SLOP_PX) scold();
    if (pointers.current.size === 0) {
      setHeld(false);
      if (widthRef.current > 0) setPuffs((n) => n + 1);
    }
  };

  // マウスやタッチは pointerup で叱るので、ここではキーボードで押したときだけ
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) scold();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    keyHeldUntil.current = performance.now() + KEY_HOLD_MS;
    setStretch(widthRef.current + KEY_STEP);
  };

  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
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
          "--rc-acc-full": `${max + CLOSED_PX}px`,
          "--rc-acc-folds": FOLDS,
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <button
        type="button"
        className="rc-acc__summary"
        aria-expanded={readable}
        aria-controls={contentId}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <span className="rc-acc__label">{label}</span>
        <span className="rc-acc__chevron" aria-hidden="true" />
      </button>
      <p className="rc-acc__status" aria-live="polite">
        {status && (
          <span key={nag} data-nag={nag ? "" : undefined}>
            {status}
          </span>
        )}
      </p>
      <div id={contentId} className="rc-acc__panel" hidden={!open}>
        <div className="rc-acc__instrument">
          <span className="rc-acc__handle rc-acc__handle--left" aria-hidden="true" />
          <div className="rc-acc__bellows" style={{ width: CLOSED_PX + width }}>
            <div className="rc-acc__content" aria-hidden={!readable}>
              {children}
            </div>
            <span className="rc-acc__folds" aria-hidden="true" />
            {puffs > 0 && !held && (
              <span key={puffs} className="rc-acc__puff" aria-hidden="true">
                {m.puff}
              </span>
            )}
          </div>
          <span className="rc-acc__handle rc-acc__handle--right" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
