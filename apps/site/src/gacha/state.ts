import { useEffect, useState } from "react";

export const PULL_COST = 100;
const INITIAL_GEMS = 500;
const STORAGE_KEY = "monster-gacha:v1";

export interface GameState {
  /** 所持しているジェム (ガチャ用の通貨) */
  gems: number;
  owned: Record<string, number>;
  agreedTerms: boolean;
  pulls: number;
  /** Coookie 同意バナー大戦の勝者 */
  consentChoice: "accept" | "reject" | null;
  /** 決済パスワードの SHA-256 (平文は保存しない) */
  passwordHash: string | null;
  /** 年齢確認で入力した生年月日 (YYYY-MM-DD) */
  birthdate: string | null;
  /** 突破した CAPTCHA の数。質問はこれに応じて哲学的になる */
  captchaLevel: number;
  /** 前回の CAPTCHA から何回ガチャを引こうとしたか */
  pullsSinceCaptcha: number;
}

/** CAPTCHA は何回のガチャ操作ごとに出すか */
export const CAPTCHA_EVERY = 3;

const INITIAL_STATE: GameState = {
  gems: INITIAL_GEMS,
  owned: {},
  agreedTerms: false,
  pulls: 0,
  consentChoice: null,
  passwordHash: null,
  birthdate: null,
  captchaLevel: 0,
  pullsSinceCaptcha: CAPTCHA_EVERY,
};

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    return { ...INITIAL_STATE, ...(JSON.parse(raw) as Partial<GameState>) };
  } catch {
    return INITIAL_STATE;
  }
}

/** ゲームの進行状況。ブラウザの localStorage に保存する (保存できない環境でも動く)。 */
export function useGameState() {
  const [state, setState] = useState<GameState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // プライベートブラウズなどで保存できなくても遊べるようにする
    }
  }, [state]);

  return [state, setState] as const;
}
