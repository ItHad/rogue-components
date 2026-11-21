import type { PointerEvent } from "react";

/** ポインタを要素に固定する。合成イベントなどで失敗しても操作は続けられるようにする。 */
export function capturePointer(e: PointerEvent<Element>) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    // 捕捉できなくても、pointerup までの操作はそのまま動く
  }
}
