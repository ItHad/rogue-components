import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { capturePointer } from "../capturePointer";
import { useMessages } from "../locale";
import { useControllable } from "../useControllable";
import "./EpochDatePicker.css";

const DAY_MS = 86_400_000;
/** 長押しの最高速度の既定値 (日/秒) */
const MAX_SPEED = 365;
/** 長押しを始めてから加速が始まるまで (ms) */
const HOLD_DELAY_MS = 300;
/** 最高速度で回し続けたときの 1 秒あたりの温度上昇 (%) */
const HEAT_PER_SEC_AT_MAX = 45;
/** 1 日ずつ送ったときの温度上昇 (%) */
const HEAT_PER_STEP = 1.5;
/** 冷却速度 (%/秒) */
const COOL_PER_SEC = 25;

const MESSAGES = {
  ja: {
    weekdays: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
    yearMonth: (y: number, m: number) => `${y}年 ${m}月`,
    field: (iso: string) => iso.replaceAll("-", "/"),
    next: "1 日進める",
    prev: "1 日戻す",
    overheated: "オーバーヒートしました。冷却中…",
  },
  en: {
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    yearMonth: (y: number, m: number) =>
      `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${y}`,
    field: (iso: string) => {
      const [y, m, d] = iso.split("-");
      return `${m}/${d}/${y}`;
    },
    next: "Next day",
    prev: "Previous day",
    overheated: "Overheated. Cooling down…",
  },
};

function toDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y!, m! - 1, d!) / DAY_MS);
}

function toIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** 加速カーブ: 押し続けた秒数 → 日/秒 */
function speedAt(heldSec: number, maxSpeed: number) {
  return Math.min(maxSpeed, 3 * 2 ** (heldSec * 1.5));
}

interface Hold {
  dir: 1 | -1;
  start: number;
  carry: number;
}

export interface EpochDatePickerProps {
  /** YYYY-MM-DD */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: ReactNode;
  /** 長押しの最高速度 (日/秒)。最高速度で回し続けたときの過熱の速さは変わらない */
  maxSpeed?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * 一見ふつうの日付欄。開くと 1970 年 1 月 1 日から始まり、矢印で 1 日ずつしか動かせない。
 * 長押しで加速するが、速すぎるとカレンダーが過熱して冷却時間が必要になる。
 */
export function EpochDatePicker({
  value: valueProp,
  defaultValue = "1970-01-01",
  onChange,
  label,
  maxSpeed = MAX_SPEED,
  disabled = false,
  className,
}: EpochDatePickerProps) {
  const t = useMessages(MESSAGES);
  const [value, setValue] = useControllable(valueProp, defaultValue, onChange);
  const [heat, setHeat] = useState(0);
  const [overheated, setOverheated] = useState(false);
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const labelId = useId();

  const dayRef = useRef(toDay(value));
  const heatRef = useRef(0);
  const overheatedRef = useRef(false);
  const holdRef = useRef<Hold | null>(null);
  const setValueRef = useRef(setValue);
  useEffect(() => {
    setValueRef.current = setValue;
    dayRef.current = toDay(value);
  }, [setValue, value]);

  const addHeat = (amount: number) => {
    heatRef.current = Math.min(100, heatRef.current + amount);
    if (heatRef.current >= 100 && !overheatedRef.current) {
      overheatedRef.current = true;
      holdRef.current = null;
      setOverheated(true);
      setHolding(false);
    }
    setHeat(heatRef.current);
  };

  const move = (days: number) => {
    if (days === 0) return;
    dayRef.current += days;
    setValueRef.current(toIso(dayRef.current));
  };

  // 長押し中の加速と、温度の上昇・冷却
  const looping = holding || heat > 0;
  useEffect(() => {
    if (!looping) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const hold = holdRef.current;
      if (hold && !overheatedRef.current) {
        const held = (now - hold.start) / 1000;
        const v = held > 0 ? speedAt(held, maxSpeed) : 0;
        hold.carry += v * dt;
        const steps = Math.floor(hold.carry);
        hold.carry -= steps;
        move(steps * hold.dir);
        addHeat((v / maxSpeed) * HEAT_PER_SEC_AT_MAX * dt);
      } else {
        heatRef.current = Math.max(0, heatRef.current - COOL_PER_SEC * dt);
        if (heatRef.current === 0 && overheatedRef.current) {
          overheatedRef.current = false;
          setOverheated(false);
        }
        setHeat(heatRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // move / addHeat は ref だけを触るので依存に含めない
  }, [looping, maxSpeed]);

  const step = (dir: 1 | -1) => {
    if (disabled || overheatedRef.current) return;
    move(dir);
    addHeat(HEAT_PER_STEP);
  };

  const startHold = (dir: 1 | -1) => {
    if (disabled || overheatedRef.current) return;
    step(dir);
    holdRef.current = { dir, start: performance.now() + HOLD_DELAY_MS, carry: 0 };
    setHolding(true);
  };

  const endHold = () => {
    holdRef.current = null;
    setHolding(false);
  };

  const onKeyDown = (dir: 1 | -1) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      step(dir);
    }
  };

  const date = new Date(toDay(value) * DAY_MS);
  const locked = disabled || overheated;

  const arrow = (dir: 1 | -1) => (
    <button
      type="button"
      className="rc-edp__arrow"
      disabled={locked}
      aria-label={dir === 1 ? t.next : t.prev}
      onPointerDown={(e) => {
        capturePointer(e);
        startHold(dir);
      }}
      onPointerUp={endHold}
      onPointerCancel={endHold}
      onLostPointerCapture={endHold}
      onKeyDown={onKeyDown(dir)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {dir === 1 ? "▶" : "◀"}
    </button>
  );

  return (
    <div
      className={["rc-edp", className].filter(Boolean).join(" ")}
      data-overheated={overheated || undefined}
      role="group"
      aria-labelledby={label ? labelId : undefined}
      style={{ "--rc-edp-heat": heat / 100 } as CSSProperties}
    >
      {label && (
        <span id={labelId} className="rc-edp__label">
          {label}
        </span>
      )}
      {/* 見た目はただの日付欄。開くと 1 日ずつしか動かせないカレンダーが出てくる */}
      <button
        type="button"
        className="rc-edp__field"
        aria-expanded={open}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{t.field(value)}</span>
        <span aria-hidden="true">📅</span>
      </button>
      {open && (
        <div className="rc-edp__row">
          {arrow(-1)}
          <time className="rc-edp__page" dateTime={value} aria-live={holding ? "off" : "polite"}>
            <span className="rc-edp__ym">
              {t.yearMonth(date.getUTCFullYear(), date.getUTCMonth() + 1)}
            </span>
            <span className="rc-edp__day">{date.getUTCDate()}</span>
            <span className="rc-edp__wd">{t.weekdays[date.getUTCDay()]}</span>
            {overheated && (
              <span className="rc-edp__steam" aria-hidden="true">
                💨
              </span>
            )}
          </time>
          {arrow(1)}
        </div>
      )}
      {/* 説明は出さない。過熱したときだけ何が起きたかを告げる */}
      <p className="rc-edp__status" role="status">
        {overheated ? t.overheated : ""}
      </p>
    </div>
  );
}
