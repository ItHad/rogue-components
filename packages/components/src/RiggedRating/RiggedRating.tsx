import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useMessages } from "../locale";
import { useControllable } from "../useControllable";
import "./RiggedRating.css";

const MESSAGES = {
  ja: {
    label: "評価",
    rate5: "★5 で評価する",
    rated: "★5 ありがとうございます！",
    hints: ["", "", "★5 なら押せますよ", "★5 がおすすめです", "★5 以外は品切れです"],
    yelps: ["ひっ", "むり", "やだ", "こないで"],
  },
  en: {
    label: "Rating",
    rate5: "Rate 5 stars",
    rated: "5 stars! Thank you so much!",
    hints: ["", "", "5 stars is right there", "We recommend 5 stars", "Other ratings are sold out"],
    yelps: ["Eek", "Nope", "No way", "Go away"],
  },
};

export interface RiggedRatingProps {
  /** 0 (未評価) か 5 */
  value?: number;
  defaultValue?: number;
  onChange?: (stars: number) => void;
  /** 星の上に出す見出し */
  label?: string;
  className?: string;
}

interface Point {
  x: number;
  y: number;
}

const STAR_GAP = 48;
/** カーソルがこれより近づいたら逃げる */
const FLEE_RADIUS = 64;
const STAR_HALF = 18;
/** カーソルが離れてから元の位置へ戻り始めるまで */
const RETURN_DELAY_MS = 900;
const RETURN_RATE = 3;
const YELP_MS = 700;

function homeOf(index: number, width: number, height: number): Point {
  return { x: width / 2 + (index - 2) * STAR_GAP, y: height / 2 };
}

/**
 * 見た目はよくある「このアプリを評価してください ★★★★★」。★1〜★4 はカーソルや指が近づくと逃げ回り、絶対に押せない。押せるのは ★5 だけ。
 */
export function RiggedRating({ value, defaultValue = 0, onChange, label, className }: RiggedRatingProps) {
  const m = useMessages(MESSAGES);
  const [stars, setStars] = useControllable(value, defaultValue, onChange);
  const arenaRef = useRef<HTMLDivElement>(null);
  const size = useRef({ width: 320, height: 140 });
  const pointer = useRef<Point | null>(null);
  const lastNear = useRef(0);
  const pos = useRef<Point[]>([]);
  const [, setFrame] = useState(0);
  const [flees, setFlees] = useState(0);
  const [yelp, setYelp] = useState<{ index: number; text: string; key: number } | null>(null);
  const lastYelp = useRef<number[]>([0, 0, 0, 0]);
  const rated = stars >= 5;

  const resetHome = () => {
    const { width, height } = size.current;
    pos.current = [0, 1, 2, 3].map((i) => homeOf(i, width, height));
  };

  useLayoutEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const measure = () => {
      size.current = { width: el.clientWidth, height: el.clientHeight };
      resetHome();
      setFrame((f) => f + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = (p: Point): Point => {
    const { width, height } = size.current;
    return {
      x: Math.min(width - STAR_HALF, Math.max(STAR_HALF, p.x)),
      y: Math.min(height - STAR_HALF, Math.max(STAR_HALF, p.y)),
    };
  };

  /** 角に追い詰められたら、カーソルからいちばん遠い場所へ跳ぶ */
  const escapeFrom = (from: Point): Point => {
    const { width, height } = size.current;
    const corners = [
      { x: STAR_HALF, y: STAR_HALF },
      { x: width - STAR_HALF, y: STAR_HALF },
      { x: STAR_HALF, y: height - STAR_HALF },
      { x: width - STAR_HALF, y: height - STAR_HALF },
      { x: width / 2, y: STAR_HALF },
      { x: width / 2, y: height - STAR_HALF },
    ];
    let best = corners[0]!;
    let bestDist = -1;
    for (const c of corners) {
      const d = Math.hypot(c.x - from.x, c.y - from.y);
      if (d > bestDist) {
        best = c;
        bestDist = d;
      }
    }
    return best;
  };

  /** 逃げるたびに叫ぶ。同じ星が叫んでいる間は数えない */
  const scream = (index: number) => {
    const now = performance.now();
    if (now - lastYelp.current[index]! < YELP_MS) return;
    lastYelp.current[index] = now;
    setFlees((n) => n + 1);
    setYelp({ index, text: m.yelps[Math.floor(Math.random() * m.yelps.length)]!, key: now });
  };

  /** カーソルの位置から星を押しのける。逃げた星があれば true */
  const push = (p: Point) => {
    let moved = false;
    pos.current = pos.current.map((s, i) => {
      const dx = s.x - p.x;
      const dy = s.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= FLEE_RADIUS) return s;
      moved = true;
      if (dist < 0.5) return escapeFrom(p);
      const pushed = clamp({ x: p.x + (dx / dist) * FLEE_RADIUS, y: p.y + (dy / dist) * FLEE_RADIUS });
      const next = Math.hypot(pushed.x - p.x, pushed.y - p.y) < FLEE_RADIUS * 0.75 ? escapeFrom(p) : pushed;
      scream(i);
      return next;
    });
    return moved;
  };

  // カーソルが枠の外から近づいてきても逃げられるよう、画面全体で追う
  useEffect(() => {
    if (rated) return;
    const onMove = (e: globalThis.PointerEvent) => {
      const el = arenaRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      pointer.current = p;
      if (push(p)) {
        lastNear.current = performance.now();
        setFrame((f) => f + 1);
      }
    };
    const onLeave = () => {
      pointer.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onMove, true);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove, true);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  });

  // しばらく追われなければ、そろそろと元の位置へ戻ってくる
  useEffect(() => {
    if (rated) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (now - lastNear.current > RETURN_DELAY_MS) {
        const { width, height } = size.current;
        let changed = false;
        pos.current = pos.current.map((s, i) => {
          const home = homeOf(i, width, height);
          const k = Math.min(1, RETURN_RATE * dt);
          const next = { x: s.x + (home.x - s.x) * k, y: s.y + (home.y - s.y) * k };
          if (Math.abs(next.x - s.x) + Math.abs(next.y - s.y) > 0.05) changed = true;
          return next;
        });
        // 戻る途中でカーソルに近づいたらまた逃げる
        if (pointer.current) push(pointer.current);
        if (changed) setFrame((f) => f + 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rated]);

  useEffect(() => {
    if (!yelp) return;
    const id = window.setTimeout(() => setYelp(null), YELP_MS);
    return () => window.clearTimeout(id);
  }, [yelp]);

  // 評価が済んだら、逃げていた星も戻ってきて並ぶ
  useEffect(() => {
    if (!rated) return;
    resetHome();
    setYelp(null);
    setFrame((f) => f + 1);
  }, [rated]);

  /** 指で直接触れられたときは、押される前に跳んで逃げる */
  const dodge = (index: number) => (e: PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    const el = arenaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    pos.current = pos.current.map((s, i) => (i === index ? escapeFrom(p) : s));
    lastNear.current = performance.now();
    scream(index);
    setFrame((f) => f + 1);
  };

  const { width, height } = size.current;
  const five = homeOf(4, width, height);
  const hint = rated ? m.rated : m.hints[Math.min(m.hints.length - 1, Math.floor(flees / 3))] ?? "";

  return (
    <div className={["rc-rr", className].filter(Boolean).join(" ")} data-rated={rated || undefined}>
      <p className="rc-rr__label">{label ?? m.label}</p>
      <div ref={arenaRef} className="rc-rr__arena">
        {pos.current.map((p, i) => (
          <span
            key={i}
            className="rc-rr__star rc-rr__star--shy"
            style={{ left: p.x, top: p.y } as CSSProperties}
            aria-hidden="true"
            onPointerDown={dodge(i)}
          >
            ★
            {yelp?.index === i && (
              <span key={yelp.key} className="rc-rr__yelp">
                {yelp.text}
              </span>
            )}
          </span>
        ))}
        <button
          type="button"
          className="rc-rr__star rc-rr__star--five"
          style={{ left: five.x, top: five.y } as CSSProperties}
          aria-label={m.rate5}
          aria-pressed={rated}
          onClick={() => setStars(5)}
        >
          ★
        </button>
      </div>
      <p className="rc-rr__hint" aria-live="polite">
        {hint}
      </p>
    </div>
  );
}
