import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useMessages } from "../locale";
import { useControllable } from "../useControllable";
import "./GaugeCheckbox.css";

const MESSAGES = {
  ja: { bill: "お支払い期限が近づいています", pay: "支払う" },
  en: { bill: "Your payment is due soon", pay: "Pay" },
};

/** 切り替えに必要なクリック数 */
const CLICKS = 20;
/** 放置したときに 1 秒あたり減るクリック数 */
const DECAY_PER_SEC = 4;
/** チェックが入ってから維持費の請求が来るまでの間隔 (ms) */
const UPKEEP_EVERY_MS = 9000;
/** 維持費の支払いに必要なクリック数 */
const UPKEEP_PAY_CLICKS = 5;
/** 維持費の支払いの制限時間 (ms) */
const UPKEEP_WINDOW_MS = 4000;
/** ゲージ表示のカーブ (1 で等速、小さいほど最初に大きく伸びる) */
const DISPLAY_CURVE = 0.4;
/** 空の状態から押した最初の 1 回のあと、減り始めるまでの時間 (ms) */
const FIRST_HIT_HOLD_MS = 700;

interface Bill {
  remaining: number;
  deadline: number;
}

export interface GaugeCheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  /** 指定するとフォーム送信時に値が含まれる (ネイティブの checkbox と同じく、チェック時のみ) */
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 連打でゲージを満タンにしないと切り替わらないチェックボックス。
 * 放置するとゲージは減り、チェック後は定期的に「維持費」を払わないと外れる。
 */
export function GaugeCheckbox({
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  label,
  name,
  value = "on",
  disabled = false,
  className,
}: GaugeCheckboxProps) {
  const t = useMessages(MESSAGES);
  const [checked, setChecked] = useControllable(checkedProp, defaultChecked, onChange);

  const [gauge, setGauge] = useState(0);
  const gaugeRef = useRef(0);
  const decayFromRef = useRef(0);
  const [bill, setBill] = useState<Bill | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const [hits, setHits] = useState(0);
  const labelId = useId();

  // ゲージの自然減少と請求の残り時間表示のためのアニメーションループ
  const active = gauge > 0 || bill !== null;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      if (gaugeRef.current > 0 && t >= decayFromRef.current) {
        gaugeRef.current = Math.max(0, gaugeRef.current - DECAY_PER_SEC * dt);
        setGauge(gaugeRef.current);
      }
      setNow(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  // 維持費の請求サイクル
  useEffect(() => {
    if (!checked) {
      if (bill) setBill(null);
      return;
    }
    if (!bill) {
      const id = setTimeout(() => {
        setBill({ remaining: UPKEEP_PAY_CLICKS, deadline: performance.now() + UPKEEP_WINDOW_MS });
      }, UPKEEP_EVERY_MS);
      return () => clearTimeout(id);
    }
    const id = setTimeout(
      () => {
        setBill(null);
        setChecked(false);
      },
      Math.max(0, bill.deadline - performance.now()),
    );
    return () => clearTimeout(id);
  }, [checked, bill, setChecked]);

  const hit = () => {
    if (disabled) return;
    setHits((h) => h + 1);
    if (gaugeRef.current === 0) decayFromRef.current = performance.now() + FIRST_HIT_HOLD_MS;
    const next = gaugeRef.current + 1;
    if (next >= CLICKS) {
      gaugeRef.current = 0;
      setGauge(0);
      setChecked(!checked);
    } else {
      gaugeRef.current = next;
      setGauge(next);
    }
  };

  const pay = () => {
    setBill((b) => (b && b.remaining > 1 ? { ...b, remaining: b.remaining - 1 } : null));
  };

  // 表示上のゲージは最初ほど大きく伸びる (必要回数や減り方は変わらない)
  const ratio = Math.min(1, gauge / CLICKS) ** DISPLAY_CURVE;
  const billRatio = bill ? Math.max(0, (bill.deadline - now) / UPKEEP_WINDOW_MS) : 0;

  return (
    <div
      className={["rc-gcb", className].filter(Boolean).join(" ")}
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
    >
      {/* 見た目はただのチェックボックス。ゲージは箱の中にたまるだけで、回数などは一切出さない */}
      <div className="rc-gcb__row">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-labelledby={label ? labelId : undefined}
          disabled={disabled}
          className="rc-gcb__box"
          onClick={hit}
        >
          <span
            className="rc-gcb__fill"
            data-direction={checked ? "off" : "on"}
            style={{ transform: `scaleY(${ratio})` }}
            aria-hidden="true"
          />
          <span key={hits} className="rc-gcb__mark" data-hit={hits > 0 || undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </span>
        </button>
        {label && (
          <span id={labelId} className="rc-gcb__label" onClick={hit}>
            {label}
          </span>
        )}
      </div>

      {bill && (
        <div className="rc-gcb__bill" role="alert">
          <span>{t.bill}</span>
          <button type="button" className="rc-gcb__pay" onClick={pay}>
            <span key={bill.remaining} className="rc-gcb__pay-label">
              {t.pay}
            </span>
          </button>
          <div className="rc-gcb__timer" style={{ transform: `scaleX(${billRatio})` }} />
        </div>
      )}

      {name && checked && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
