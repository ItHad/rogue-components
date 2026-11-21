import { useEffect, useRef, useState } from "react";
import { useMessages } from "../locale";
import "./PasswordBoss.css";

const MESSAGES = {
  ja: {
    name: "弱パス大魔王",
    strength: "パスワード強度",
    bossHp: "パスワード強度 (ボスの残り体力)",
    defeatedLine: "ぐ、ぐわあああ……！",
    high: "そんなパスワードで わしが倒せるとでも？",
    mid: "ほう……少しはやるようだな",
    low: "ば、ばかな……！ 数字や記号まで……！",
    defeated: (name: string) => `${name} を倒した！ 強いパスワードです。`,
    quote: (line: string) => `「${line}」`,
  },
  en: {
    name: "Weak Password Overlord",
    strength: "Password strength",
    bossHp: "Password strength (boss HP remaining)",
    defeatedLine: "N-no... NOOOOO...!",
    high: "You think a password like that can defeat ME?",
    mid: "Hmph... not bad.",
    low: "Im-impossible...! Numbers AND symbols...?!",
    defeated: (name: string) => `You defeated the ${name}! That's a strong password.`,
    quote: (line: string) => `"${line}"`,
  },
};

/** パスワードの強度 (0〜100)。長さと文字の種類で決まる。 */
export function passwordStrength(password: string): number {
  if (password.length === 0) return 0;
  let score = password.length * 7;
  if (/[a-z]/.test(password)) score += 4;
  if (/[A-Z]/.test(password)) score += 8;
  if (/[0-9]/.test(password)) score += 12;
  if (/[^a-zA-Z0-9]/.test(password)) score += 18;
  // 同じ文字の連続は弱い
  if (/(.)\1\1/.test(password)) score -= 20;
  return Math.max(0, Math.min(100, score));
}

export interface PasswordBossProps {
  password: string;
  /** ボスを倒したとき (強度 100 に達したとき) に呼ばれる */
  onDefeat?: () => void;
  name?: string;
  className?: string;
}

/** パスワードの強度メーターがボスの体力ゲージになっている。強いパスワードほどボスが早く倒れる。 */
export function PasswordBoss({
  password,
  onDefeat,
  name: nameProp,
  className,
}: PasswordBossProps) {
  const t = useMessages(MESSAGES);
  const name = nameProp ?? t.name;
  const strength = passwordStrength(password);
  const hp = 100 - strength;
  const defeated = hp <= 0;

  const [hitKey, setHitKey] = useState(0);
  const prevHp = useRef(hp);
  useEffect(() => {
    if (hp < prevHp.current) setHitKey((k) => k + 1);
    prevHp.current = hp;
  }, [hp]);

  const onDefeatRef = useRef(onDefeat);
  useEffect(() => {
    onDefeatRef.current = onDefeat;
  }, [onDefeat]);
  useEffect(() => {
    if (defeated) onDefeatRef.current?.();
  }, [defeated]);

  const line = defeated
    ? t.defeatedLine
    : hp > 80
      ? t.high
      : hp > 40
        ? t.mid
        : t.low;

  // 入力を始めるまでは、ただの強度メーターのふりをする
  if (password.length === 0) {
    return (
      <div className={["rc-pb", className].filter(Boolean).join(" ")} data-dormant>
        <span className="rc-pb__plain-label">{t.strength}</span>
        <div
          className="rc-pb__hp"
          role="meter"
          aria-label={t.strength}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
        />
      </div>
    );
  }

  return (
    <div
      className={["rc-pb", className].filter(Boolean).join(" ")}
      data-defeated={defeated || undefined}
    >
      <div className="rc-pb__head">
        <span key={hitKey} className="rc-pb__boss" data-hit={hitKey > 0 || undefined} aria-hidden="true">
          {defeated ? "💥" : "👹"}
        </span>
        <div className="rc-pb__info">
          <span className="rc-pb__name">{name}</span>
          <div
            className="rc-pb__hp"
            role="meter"
            aria-label={t.bossHp}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hp}
          >
            <span className="rc-pb__hp-fill" style={{ transform: `scaleX(${hp / 100})` }} />
          </div>
        </div>
      </div>
      <p className="rc-pb__line">{defeated ? t.defeated(name) : t.quote(line)}</p>
    </div>
  );
}
