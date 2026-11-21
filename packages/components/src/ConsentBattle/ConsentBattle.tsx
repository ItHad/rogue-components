import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { useMessages } from "../locale";
import "./ConsentBattle.css";

export type ConsentChoice = "accept" | "reject";

/** 同意は異様に強い。拒否を勝たせるには、同意の HP を削りきる必要がある。 */
const MAX_HP: Record<ConsentChoice, number> = { accept: 600, reject: 80 };
/** クリック 1 回のダメージ */
const CLICK_DAMAGE = 12;
const CRIT_RATE = 0.15;
const CRIT_MULTIPLIER = 3;
/** 同意は 1 秒あたりこれだけ回復する */
const ACCEPT_REGEN_PER_SEC = 8;
/** 自動攻撃の間隔と威力 */
const AUTO_ATTACK_MS = 1000;
const AUTO_DAMAGE: Record<ConsentChoice, number> = { accept: 4, reject: 2 };
/** 自動攻撃で同意が攻撃する確率 */
const ACCEPT_ATTACK_RATE = 0.6;
/** 同意は定期的に防御の構えを取り、その間は攻撃が効かない */
const GUARD_EVERY_MS = 5000;
const GUARD_DURATION_MS = 1500;

type Log =
  | { type: "none" }
  | { type: "attack"; attacker: ConsentChoice; target: ConsentChoice; dmg: number; crit: boolean }
  | { type: "guard" }
  | { type: "ko"; loser: ConsentChoice };

const MESSAGES = {
  ja: {
    name: { accept: "同意", reject: "拒否" } as Record<ConsentChoice, string>,
    button: { accept: "同意する", reject: "拒否する" } as Record<ConsentChoice, string>,
    message: "当サイトでは、サービス向上のためにデータを使用します。",
    details: "詳細",
    attack: (a: string, t: string, d: number) => `${a} の こうげき！ ${t} に ${d} のダメージ`,
    crit: (a: string, t: string, d: number) => `${a} の 会心の一撃！ ${t} に ${d} のダメージ！`,
    guard: (t: string) => `${t} は 身を守っている！`,
    ko: (loser: string, winner: string) => `${loser} は たおれた！ ${winner} の勝利！`,
  },
  en: {
    name: { accept: "Accept", reject: "Reject" } as Record<ConsentChoice, string>,
    button: { accept: "Accept", reject: "Reject" } as Record<ConsentChoice, string>,
    message: "We use data to improve our services.",
    details: "Learn more",
    attack: (a: string, t: string, d: number) => `${a} attacks! ${t} takes ${d} damage.`,
    crit: (a: string, t: string, d: number) => `Critical hit by ${a}! ${t} takes ${d} damage!`,
    guard: (t: string) => `${t} is guarding!`,
    ko: (loser: string, winner: string) => `${loser} has fallen! ${winner} wins!`,
  },
};
const other = (side: ConsentChoice): ConsentChoice => (side === "accept" ? "reject" : "accept");

interface Pop {
  id: number;
  side: ConsentChoice;
  text: string;
  kind: "hit" | "crit" | "guard";
}

interface BattleState {
  started: boolean;
  hp: Record<ConsentChoice, number>;
  lastTick: number;
  lastAttack: number;
  guardFrom: number;
  pops: Pop[];
  nextPopId: number;
  log: Log;
  winner: ConsentChoice | null;
  shake: Record<ConsentChoice, number>;
}

type BattleAction =
  | { type: "tick"; now: number }
  | { type: "attack"; attacker: ConsentChoice; now: number; roll: number };

function isGuarding(s: BattleState, now: number) {
  return now >= s.guardFrom && now < s.guardFrom + GUARD_DURATION_MS;
}

function addPop(s: BattleState, side: ConsentChoice, text: string, kind: Pop["kind"]): BattleState {
  const pop = { id: s.nextPopId, side, text, kind };
  return { ...s, pops: [...s.pops.slice(-7), pop], nextPopId: s.nextPopId + 1 };
}

function judge(s: BattleState): BattleState {
  if (s.winner) return s;
  if (s.hp.accept <= 0) return { ...s, winner: "reject", log: { type: "ko", loser: "accept" } };
  if (s.hp.reject <= 0) return { ...s, winner: "accept", log: { type: "ko", loser: "reject" } };
  return s;
}

function reducer(s: BattleState, a: BattleAction): BattleState {
  if (s.winner) return s;

  if (a.type === "attack") {
    // 最初のクリックで、普通のボタンだったものが戦い始める
    let base = s;
    if (!s.started) {
      base = { ...s, started: true, lastTick: a.now, lastAttack: a.now, guardFrom: a.now + 2000 };
    }
    const target = other(a.attacker);
    if (target === "accept" && isGuarding(base, a.now)) {
      return { ...addPop(base, "accept", "GUARD", "guard"), log: { type: "guard" } };
    }
    const crit = a.roll < CRIT_RATE;
    const dmg = crit ? CLICK_DAMAGE * CRIT_MULTIPLIER : CLICK_DAMAGE;
    const next = addPop(base, target, String(dmg), crit ? "crit" : "hit");
    return judge({
      ...next,
      hp: { ...base.hp, [target]: Math.max(0, base.hp[target] - dmg) },
      shake: { ...base.shake, [target]: base.shake[target] + 1 },
      log: { type: "attack", attacker: a.attacker, target, dmg, crit },
    });
  }

  if (!s.started) return s;

  // tick: 同意の自然回復、両者の自動攻撃、防御の構え
  const dt = (a.now - s.lastTick) / 1000;
  let next: BattleState = {
    ...s,
    lastTick: a.now,
    hp: { ...s.hp, accept: Math.min(MAX_HP.accept, s.hp.accept + ACCEPT_REGEN_PER_SEC * dt) },
  };
  if (a.now - s.lastAttack >= AUTO_ATTACK_MS) {
    const attacker: ConsentChoice = Math.random() < ACCEPT_ATTACK_RATE ? "accept" : "reject";
    const target = other(attacker);
    const dmg = AUTO_DAMAGE[attacker];
    next = addPop(next, target, String(dmg), "hit");
    next = {
      ...next,
      lastAttack: a.now,
      hp: { ...next.hp, [target]: Math.max(0, next.hp[target] - dmg) },
      shake: { ...next.shake, [target]: next.shake[target] + 1 },
      log: { type: "attack", attacker, target, dmg, crit: false },
    };
  }
  if (a.now >= s.guardFrom + GUARD_EVERY_MS) next = { ...next, guardFrom: a.now };
  return judge(next);
}

const INITIAL: BattleState = {
  started: false,
  hp: { ...MAX_HP },
  lastTick: 0,
  lastAttack: 0,
  guardFrom: Number.POSITIVE_INFINITY,
  pops: [],
  nextPopId: 0,
  log: { type: "none" },
  winner: null,
  shake: { accept: 0, reject: 0 },
};

export interface ConsentBattleProps {
  /** 決着がついたときに勝った側を受け取る */
  onChange?: (choice: ConsentChoice) => void;
  /** バナーの説明文 */
  message?: ReactNode;
  /** 指定すると「詳細」リンクを出す (新しいタブで開く) */
  detailsHref?: string;
  detailsLabel?: string;
  className?: string;
}

/**
 * 一見ふつうの同意バナー。ボタンを押すと「同意」と「拒否」が戦い始め、押した側が相手を攻撃する。
 * 同意は異様に強く、拒否を勝たせるのは大変。
 */
export function ConsentBattle({
  onChange,
  message,
  detailsHref,
  detailsLabel,
  className,
}: ConsentBattleProps) {
  const t = useMessages(MESSAGES);
  const [s, dispatch] = useReducer(reducer, INITIAL);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!s.started || s.winner) return;
    const id = setInterval(() => dispatch({ type: "tick", now: performance.now() }), 100);
    return () => clearInterval(id);
  }, [s.started, s.winner]);

  useEffect(() => {
    if (s.winner) onChangeRef.current?.(s.winner);
  }, [s.winner]);

  const guarding = isGuarding(s, s.lastTick);

  const logText = (log: Log) => {
    switch (log.type) {
      case "attack":
        return (log.crit ? t.crit : t.attack)(t.name[log.attacker], t.name[log.target], log.dmg);
      case "guard":
        return t.guard(t.name.accept);
      case "ko":
        return t.ko(t.name[log.loser], t.name[other(log.loser)]);
      default:
        return "";
    }
  };

  const fighter = (side: ConsentChoice) => (
    <button
      type="button"
      className="rc-cb__fighter"
      data-side={side}
      data-guard={(s.started && side === "accept" && guarding) || undefined}
      data-ko={s.winner === other(side) || undefined}
      data-win={s.winner === side || undefined}
      disabled={s.winner !== null}
      onClick={() => dispatch({ type: "attack", attacker: side, now: performance.now(), roll: Math.random() })}
    >
      {s.started && (
        <span key={s.shake[side]} className="rc-cb__avatar" data-shake={s.shake[side] > 0 || undefined} aria-hidden="true">
          {side === "accept" ? "🙆" : "🙅"}
        </span>
      )}
      <span className="rc-cb__name">{t.button[side]}</span>
      {s.started && (
        <>
          <span className="rc-cb__hp" aria-hidden="true">
            <span className="rc-cb__hp-fill" style={{ transform: `scaleX(${s.hp[side] / MAX_HP[side]})` }} />
          </span>
          <span className="rc-cb__hp-text">
            HP {Math.ceil(s.hp[side])} / {MAX_HP[side]}
          </span>
        </>
      )}
      {s.pops
        .filter((p) => p.side === side)
        .map((p) => (
          <span key={p.id} className="rc-cb__pop" data-kind={p.kind} aria-hidden="true">
            {p.text}
          </span>
        ))}
    </button>
  );

  return (
    <div className={["rc-cb", className].filter(Boolean).join(" ")} data-started={s.started || undefined}>
      <p className="rc-cb__message">
        {message ?? t.message}
        {detailsHref && (
          <>
            {" "}
            <a className="rc-cb__details" href={detailsHref} target="_blank" rel="noopener">
              {detailsLabel ?? t.details}
            </a>
          </>
        )}
      </p>
      <div className="rc-cb__arena">
        {fighter("accept")}
        {s.started && (
          <span className="rc-cb__vs" aria-hidden="true">
            VS
          </span>
        )}
        {fighter("reject")}
      </div>
      {s.started && (
        <p className="rc-cb__log" aria-live="polite">
          {logText(s.log)}
        </p>
      )}
    </div>
  );
}
