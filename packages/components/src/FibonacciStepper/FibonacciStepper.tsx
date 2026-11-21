import { useId, useState, type ReactNode } from "react";
import { useMessages } from "../locale";
import { useControllable } from "../useControllable";
import "./FibonacciStepper.css";

/** n 番目 (0 始まり) のフィボナッチ数: 1, 1, 2, 3, 5, 8, ... */
export function fibonacci(n: number): number {
  let a = 1;
  let b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

/** n 番目 (0 始まり) の素数: 2, 3, 5, 7, 11, ... */
export function nthPrime(n: number): number {
  let count = -1;
  for (let k = 2; ; k++) {
    let prime = true;
    for (let d = 2; d * d <= k; d++) {
      if (k % d === 0) {
        prime = false;
        break;
      }
    }
    if (prime && ++count === n) return k;
  }
}

const MESSAGES = {
  ja: { minus: "減らす", plus: "増やす", clear: "クリア" },
  en: { minus: "Decrease", plus: "Increase", clear: "Clear" },
};

export interface FibonacciStepperProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * 一見ふつうの数値ステッパー。ただし＋はフィボナッチ数列ぶん増え、－は素数ぶん減る。
 * 押すたびに次の増減量が大きくなる。クリアで最初からやり直せる。
 */
export function FibonacciStepper({
  value: valueProp,
  defaultValue = 0,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  label,
  disabled = false,
  className,
}: FibonacciStepperProps) {
  const t = useMessages(MESSAGES);
  const [value, setValue] = useControllable(valueProp, defaultValue, onChange);
  const [plusCount, setPlusCount] = useState(0);
  const [minusCount, setMinusCount] = useState(0);
  const [bump, setBump] = useState<{ n: number; dir: "up" | "down" } | null>(null);
  const labelId = useId();

  const nextPlus = fibonacci(plusCount);
  const nextMinus = nthPrime(minusCount);
  const canPlus = !disabled && value + nextPlus <= max;
  const canMinus = !disabled && value - nextMinus >= min;

  const plus = () => {
    if (!canPlus) return;
    setValue(value + nextPlus);
    setPlusCount((c) => c + 1);
    setBump({ n: (bump?.n ?? 0) + 1, dir: "up" });
  };

  const minus = () => {
    if (!canMinus) return;
    setValue(value - nextMinus);
    setMinusCount((c) => c + 1);
    setBump({ n: (bump?.n ?? 0) + 1, dir: "down" });
  };

  const reset = () => {
    setValue(Math.min(max, Math.max(min, defaultValue)));
    setPlusCount(0);
    setMinusCount(0);
  };

  return (
    <div
      className={["rc-fs", className].filter(Boolean).join(" ")}
      role="group"
      aria-labelledby={label ? labelId : undefined}
    >
      {label && (
        <span id={labelId} className="rc-fs__label">
          {label}
        </span>
      )}
      <div className="rc-fs__row">
        <button
          type="button"
          className="rc-fs__btn"
          disabled={!canMinus}
          onClick={minus}
          aria-label={t.minus}
        >
          <span className="rc-fs__sign">－</span>
        </button>
        <output
          key={bump?.n}
          className="rc-fs__value"
          data-bump={bump?.dir}
          aria-live="polite"
        >
          {value.toLocaleString()}
        </output>
        <button
          type="button"
          className="rc-fs__btn"
          disabled={!canPlus}
          onClick={plus}
          aria-label={t.plus}
        >
          <span className="rc-fs__sign">＋</span>
        </button>
      </div>
      <button type="button" className="rc-fs__reset" disabled={disabled} onClick={reset}>
        {t.clear}
      </button>
    </div>
  );
}
