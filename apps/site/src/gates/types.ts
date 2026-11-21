import type { ComponentType } from "react";
import type { GameState } from "../gacha/state";
import type { Messages } from "../i18n";

/** 操作の種類。関門はどの操作の前に割り込むかをこれで指定する。 */
export type Action = "visit" | "pull" | "charge";

export interface GateProps {
  /** いまのゲーム状態 (保存済みのパスワードや CAPTCHA の進み具合を見るため) */
  state: GameState;
  /** 関門を突破したときに呼ぶ。patch はゲーム状態に書き込まれる。 */
  onPass: (patch?: Partial<GameState>) => void;
}

/**
 * 操作の前に割り込む関門。
 */
export interface Gate {
  id: string;
  title: (t: Messages) => string;
  /** どの操作の前に出すか */
  actions: readonly Action[];
  /** いまの状態でこの関門が必要か */
  isNeeded: (state: GameState) => boolean;
  /** modal: 閉じればやめられるダイアログ / banner: 画面下に出て、突破するまで閉じられない */
  layout?: "modal" | "banner";
  Component: ComponentType<GateProps>;
}
