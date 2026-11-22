import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { capturePointer } from "../capturePointer";
import { useMessages } from "../locale";
import { useControllable } from "../useControllable";
import "./BuzzWireToggle.css";

const MESSAGES = {
  ja: {
    playing: "丸をゴールまで運んでください。壁に触れるとやり直しです。",
    failed: "壁に触れてしまいました。トグルが縮んでしまった……",
    done: "ゴール！",
    goal: "ゴール",
  },
  en: {
    playing: "Carry the knob to the goal. Touch a wall and you start over.",
    failed: "You touched a wall. The toggle shrank back...",
    done: "Goal!",
    goal: "Goal",
  },
};

type Point = { x: number; y: number };

/** 通路の中心線。最初の TRACK ぶんだけを見せると、ふつうのトグルの溝に見える */
const COURSE: readonly Point[] = [
  { x: 25, y: 22 },
  { x: 180, y: 22 },
  { x: 180, y: 70 },
  { x: 60, y: 70 },
  { x: 60, y: 118 },
  { x: 270, y: 118 },
  { x: 270, y: 166 },
  { x: 130, y: 166 },
  { x: 130, y: 208 },
  { x: 275, y: 208 },
];
const VIEW_W = 300;
const FULL_H = 230;
const COLLAPSED_H = 44;
/** 通路の幅 */
const WIDTH = 30;
/** 丸の半径。通路の中心から WIDTH / 2 - KNOB_R より離れると壁に触れたことになる */
const KNOB_R = 10;
const SLACK = WIDTH / 2 - KNOB_R;
/** トグルに見えているときの溝の長さ (中心線の長さ) */
const TRACK = 24;
/** ゴールの判定半径 */
const GOAL_R = 8;
/** 矢印キー 1 回で動く距離 */
const KEY_STEP = 3;
const GROW_MS = 700;
const SHRINK_MS = 500;
const WIN_MS = 600;

const START = COURSE[0]!;
const GOAL = COURSE[COURSE.length - 1]!;
const ON_POS: Point = { x: START.x + TRACK, y: START.y };
const POINTS = COURSE.map((p) => `${p.x},${p.y}`).join(" ");
const TOTAL = COURSE.slice(1).reduce(
  (sum, p, i) => sum + Math.hypot(p.x - COURSE[i]!.x, p.y - COURSE[i]!.y),
  0,
);

/** 点から通路の中心線までの距離 */
function distToCourse(p: Point): number {
  let best = Infinity;
  for (let i = 1; i < COURSE.length; i++) {
    const a = COURSE[i - 1]!;
    const b = COURSE[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

/** from から to へ動かす途中で壁に触れるか。速く動かしても壁をすり抜けないよう細かく調べる */
function hitsWall(from: Point, to: Point): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 2));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (distToCourse({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }) > SLACK) return true;
  }
  return false;
}

/** idle: トグルの形 / growing: 伸びている途中 / playing: イライラ棒 / winning: ゴールした直後 / shrinking: トグルの形へ縮んでいる途中 */
type Phase = "idle" | "growing" | "playing" | "winning" | "shrinking";

export interface BuzzWireToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * ふつうのトグルスイッチ。ただしオンにしようとすると溝が迷路のように伸び、
 * スイッチの丸を壁に触れずにゴールまで運ばないとオンにならない (イライラ棒)。
 * 壁に触れると縮んで元のトグルに戻る。オフにするのは 1 回押すだけ。
 */
export function BuzzWireToggle({
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  className,
}: BuzzWireToggleProps) {
  const t = useMessages(MESSAGES);
  const [checked, setChecked] = useControllable(checkedProp, defaultChecked, onChange);
  const [phase, setPhase] = useState<Phase>("idle");
  const [knob, setKnob] = useState<Point>(START);
  const [dragging, setDragging] = useState(false);
  const [failed, setFailed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const knobRef = useRef<Point>(START);
  const grabOffset = useRef<Point>({ x: 0, y: 0 });
  const timer = useRef<number>(0);
  const labelId = useId();
  const statusId = useId();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const moveKnob = (p: Point) => {
    knobRef.current = p;
    setKnob(p);
  };

  const after = (ms: number, fn: () => void) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  };

  const start = () => {
    setFailed(false);
    moveKnob(START);
    setPhase("growing");
    after(GROW_MS, () => setPhase("playing"));
  };

  const fail = () => {
    setDragging(false);
    setFailed(true);
    moveKnob(START);
    setPhase("shrinking");
    after(SHRINK_MS, () => setPhase("idle"));
  };

  const win = () => {
    setDragging(false);
    moveKnob(GOAL);
    setPhase("winning");
    after(WIN_MS, () => {
      moveKnob(ON_POS);
      setChecked(true);
      setPhase("shrinking");
      after(SHRINK_MS, () => setPhase("idle"));
    });
  };

  /** 丸を動かす。壁に触れたら失敗、ゴールに着いたら成功 */
  const tryMove = (to: Point) => {
    if (hitsWall(knobRef.current, to)) return fail();
    moveKnob(to);
    if (Math.hypot(to.x - GOAL.x, to.y - GOAL.y) <= GOAL_R) win();
  };

  const toggle = () => {
    if (disabled || phase !== "idle") return;
    if (checked) {
      moveKnob(START);
      setChecked(false);
    } else {
      start();
    }
  };

  const toSvg = (e: PointerEvent): Point | null => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled || phase !== "playing") return;
    const p = toSvg(e);
    if (!p) return;
    const k = knobRef.current;
    // 丸のあたりをつかんだときだけ動かせる
    if (Math.hypot(p.x - k.x, p.y - k.y) > KNOB_R + 8) return;
    grabOffset.current = { x: p.x - k.x, y: p.y - k.y };
    capturePointer(e);
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging || phase !== "playing") return;
    const p = toSvg(e);
    if (!p) return;
    tryMove({ x: p.x - grabOffset.current.x, y: p.y - grabOffset.current.y });
  };

  const onPointerUp = () => setDragging(false);

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
      return;
    }
    const dir: Record<string, Point> = {
      ArrowRight: { x: KEY_STEP, y: 0 },
      ArrowLeft: { x: -KEY_STEP, y: 0 },
      ArrowDown: { x: 0, y: KEY_STEP },
      ArrowUp: { x: 0, y: -KEY_STEP },
    };
    const d = dir[e.key];
    if (!d || phase !== "playing") return;
    e.preventDefault();
    tryMove({ x: knobRef.current.x + d.x, y: knobRef.current.y + d.y });
  };

  const expanded = phase !== "idle";
  // 通路のうち見せている長さ。伸びるときと縮むときは CSS の transition で動く
  const shown = phase === "growing" || phase === "playing" || phase === "winning" ? TOTAL : TRACK;
  const knobPos = phase === "idle" && checked ? ON_POS : knob;
  const status =
    phase === "playing" ? t.playing : phase === "winning" ? t.done : failed && !checked ? t.failed : "";

  return (
    <div
      className={["rc-bw", className].filter(Boolean).join(" ")}
      data-phase={phase}
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
    >
      {label && (
        <span id={labelId} className="rc-bw__label">
          {label}
        </span>
      )}
      <svg
        ref={svgRef}
        className="rc-bw__board"
        viewBox={`0 0 ${VIEW_W} ${expanded ? FULL_H : COLLAPSED_H}`}
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={status ? statusId : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        data-dragging={dragging || undefined}
        onClick={() => phase === "idle" && toggle()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <polyline
          className="rc-bw__track"
          points={POINTS}
          strokeWidth={WIDTH}
          style={{ strokeDasharray: `${shown} ${TOTAL + WIDTH}` }}
        />
        {expanded && (
          <g className="rc-bw__goal" transform={`translate(${GOAL.x} ${GOAL.y})`}>
            <circle r={GOAL_R + 2} />
            <text y={-20} textAnchor="middle">
              {t.goal}
            </text>
          </g>
        )}
        <circle
          className="rc-bw__knob"
          r={KNOB_R}
          style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
        />
      </svg>
      <p id={statusId} className="rc-bw__status" role="status">
        {status}
      </p>
    </div>
  );
}
