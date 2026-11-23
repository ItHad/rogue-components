import type { PasswordRule } from "rogue-components";
import type { Messages } from "../i18n";

/** 購入数がこれを超えるごとに、決済パスワードのボスが一段強くなる */
const TIER_THRESHOLDS = [10, 30, 60, 100, 998] as const;

/** 購入数から強さの段階 (0〜5) を決める。5 は上限いっぱい (999) まで欲張ったときだけ */
export function passwordTierFor(quantity: number): number {
  return TIER_THRESHOLDS.filter((n) => quantity > n).length;
}

/** 段階ごとの最低文字数 */
const MIN_LENGTH = [8, 10, 12, 14, 16, 24];

const countSymbolKinds = (pw: string) => new Set(pw.match(/[^a-zA-Z0-9]/g) ?? []).size;

/** その段階のボスを倒すための条件。段階が上がるほど条件が増える。 */
export function passwordRules(tier: number, t: Messages): PasswordRule[] {
  const r = t.payment.rules;
  const minLength = MIN_LENGTH[Math.min(tier, MIN_LENGTH.length - 1)];
  const rules: PasswordRule[] = [
    { label: r.minLength(minLength), test: (pw) => pw.length >= minLength },
    // a 連打のような同じ文字の繰り返しでは倒せない
    { label: r.noRepeat, test: (pw) => !/(.)\1\1/.test(pw) },
  ];
  if (tier >= 2) rules.push({ label: r.digit, test: (pw) => /[0-9]/.test(pw) });
  if (tier === 3) rules.push({ label: r.symbol, test: (pw) => countSymbolKinds(pw) >= 1 });
  if (tier === 4) rules.push({ label: r.symbols(3), test: (pw) => countSymbolKinds(pw) >= 3 });
  if (tier >= 5) {
    // 欲張りすぎた人への罰。ダイヤルで入れられる 40 文字のうち 24 文字を 1 回ずつ使うことになる。
    // さらに英字と数字・記号を交互に並べさせ、ダイヤルを abcdef... と一方向に回すだけでは倒せないようにする
    rules.push(
      { label: r.digits(3), test: (pw) => new Set(pw.match(/[0-9]/g) ?? []).size >= 3 },
      { label: r.allSymbols, test: (pw) => countSymbolKinds(pw) >= 4 },
      { label: r.noReuse, test: (pw) => new Set(pw).size === pw.length },
      { label: r.alternate, test: (pw) => /^[a-z]?([^a-z][a-z])*[^a-z]?$/i.test(pw) },
    );
  }
  return rules;
}

export function bossName(tier: number, t: Messages): string {
  const names = t.payment.bosses;
  return names[Math.min(tier, names.length - 1)];
}
