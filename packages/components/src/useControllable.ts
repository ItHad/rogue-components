import { useCallback, useRef, useState } from "react";

/**
 * 制御 / 非制御の両方に対応する state。
 * `value` が渡されていれば制御モード、そうでなければ内部 state を使う。
 */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : inner;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInner(next);
      onChangeRef.current?.(next);
    },
    [isControlled],
  );

  return [current, set];
}
