import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HoardSelect } from "rogue-components";
import { SECRET_ITEMS } from "../gacha/items";
import { useI18n } from "../i18n";
import { ItemCard } from "../ui/ItemCard";
import { ALL_TREASURES, HOARD_TREASURES, distinctTreasures, randomTreasure, treasureName, treasureOptions } from "./treasures";

const REWARD = SECRET_ITEMS[0]!;
/** 降りてくるまで */
const APPROACH_MS = 1600;
/** 見限られてから飛び去るまで */
const GIVE_UP_MS = 2600;

type Phase = "intro" | "trial" | "reward" | "gone";

/** 試練は 3 つ。3 択 → 宝物庫の 360 点 → 息を吹かれながら 1000 点 */
const ROUNDS = 3;
const FIRST_CHOICES = 3;

/** その試練で探させる財宝 */
const poolFor = (round: number, firstPool: readonly string[]) =>
  round === 0 ? firstPool : round === 1 ? HOARD_TREASURES : ALL_TREASURES;

interface DragonTrialProps {
  /** 背景のドラゴンがいた位置。ここから大きくなりながら降りてくる */
  from: DOMRect;
  /** シークレットをすでに持っているか (台詞が変わる) */
  owned: boolean;
  onReward: (itemId: string) => void;
  onClose: () => void;
}

/** 背景のドラゴンが降りてきて、宝物庫から財宝を 3 つ持ってくるよう命じる。どの試練も間違えられるのは 1 回まで。 */
export function DragonTrial({ from, owned, onReward, onClose }: DragonTrialProps) {
  const { locale, t } = useI18n();
  const [phase, setPhase] = useState<Phase>("intro");
  const [arrived, setArrived] = useState(false);
  const [round, setRound] = useState(0);
  const [firstPool] = useState(() => distinctTreasures(FIRST_CHOICES));
  const pool = poolFor(round, firstPool);
  const [target, setTarget] = useState(() => randomTreasure(undefined, firstPool));
  const [choice, setChoice] = useState<string | null>(null);
  const [mistake, setMistake] = useState<{ got: string; roar: number } | null>(null);
  /** 前の試練を越えたところ (台詞をほめ言葉から始める) */
  const [passed, setPassed] = useState(false);
  const dragonRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => treasureOptions(locale, pool), [locale, pool]);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 背景にいた位置から、画面上部の定位置まで大きくなりながら降りてくる
  useLayoutEffect(() => {
    const el = dragonRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce) {
      setArrived(true);
      return;
    }
    const r = el.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (r.left + r.width / 2);
    const dy = from.top + from.height / 2 - (r.top + r.height / 2);
    const s = from.width / r.width;
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.85 },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.15 - 40}px) scale(${s + (1 - s) * 0.45})`, opacity: 1, offset: 0.55 },
        { transform: "none", opacity: 1 },
      ],
      { duration: APPROACH_MS, easing: "cubic-bezier(0.45, 0, 0.3, 1)" },
    );
    anim.onfinish = () => setArrived(true);
    return () => anim.cancel();
    // 降りてくるのは最初の 1 回だけ
  }, []);

  useEffect(() => {
    if (arrived) dialogRef.current?.focus();
  }, [arrived]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (phase !== "gone") return;
    const timer = window.setTimeout(() => onCloseRef.current(), GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const offer = () => {
    if (!choice) return;
    if (choice === target) {
      if (round === ROUNDS - 1) {
        onReward(REWARD.id);
        setPhase("reward");
        return;
      }
      setRound(round + 1);
      setTarget(randomTreasure(target, poolFor(round + 1, firstPool)));
      setChoice(null);
      setMistake(null);
      setPassed(true);
      return;
    }
    if (mistake) {
      setPhase("gone");
      return;
    }
    setMistake({ got: choice, roar: Date.now() });
    setTarget(randomTreasure(target, pool));
    setChoice(null);
    setPassed(false);
  };

  let speech: string;
  if (phase === "intro") speech = owned ? t.dragon.introAgain : t.dragon.intro;
  else if (phase === "reward") speech = t.dragon.reward;
  else if (phase === "gone") speech = t.dragon.giveUp;
  else if (mistake) speech = t.dragon.wrong(treasureName(mistake.got, locale), treasureName(target, locale));
  else speech = (passed ? `${t.dragon.passed} ` : "") + t.dragon.order[round]!(treasureName(target, locale));

  return createPortal(
    <div className="dragon-trial" data-arrived={arrived || undefined} data-phase={phase}>
      <div ref={dragonRef} className="dragon-trial__dragon" aria-hidden="true">
        {/* 間違えるたびに吠える (key を変えてアニメーションをやり直す) */}
        <div
          key={mistake?.roar ?? 0}
          className="dragon-trial__roar"
          data-roar={(mistake && phase === "trial") || phase === "gone" || undefined}
        >
          <svg viewBox="-4 -8 122 64" className="dragon-trial__body">
            <path
              className="dragon-trial__wing dragon-trial__wing--far"
              d="M74 30 C 70 18, 60 6, 40 0 C 45 7, 47 11, 47 15 C 51 13, 55 15, 55 19 C 59 17, 62 21, 62 25 C 65 25, 66 28, 64 30 Z"
            />
            <path d="M4 44 C 14 46, 22 41, 28 37 C 42 43, 64 43, 82 36 C 90 33, 95 30, 100 29 L 106 32 L 114 31 L 109 27 L 114 25 L 104 23 L 101 18 L 98 23 C 92 24, 86 25, 80 27 C 62 23, 40 25, 26 31 C 18 34, 11 40, 4 44 Z M5 44 L -3 39 L -1 48 Z" />
            <path d="M42 39 C 40 43, 36 45, 31 45 L 36 41 Z M66 38 C 64 42, 60 44, 55 44 L 60 40 Z" />
            <circle className="dragon-trial__eye" cx="104.5" cy="26" r="1.1" />
            <path
              className="dragon-trial__wing dragon-trial__wing--near"
              d="M68 31 C 64 16, 50 2, 22 -6 C 30 4, 32 10, 32 14 C 37 12, 42 15, 42 19 C 47 17, 51 21, 51 26 C 54 26, 57 29, 55 31 Z"
            />
          </svg>
        </div>
      </div>

      {arrived && (
        <div
          ref={dialogRef}
          className="dragon-trial__dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t.dragon.name}
          tabIndex={-1}
        >
          <button type="button" className="modal__close dragon-trial__close" aria-label={t.dragon.leave} onClick={onClose}>
            ×
          </button>
          <p className="dragon-trial__name">{t.dragon.name}</p>
          <p className="dragon-trial__speech" key={speech} aria-live="polite">
            {speech}
          </p>

          {phase === "intro" && (
            <div className="dragon-trial__actions">
              <button type="button" className="btn" onClick={onClose}>
                {t.dragon.decline}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setPhase("trial")}>
                {t.dragon.accept}
              </button>
            </div>
          )}

          {phase === "trial" && (
            <>
              <p className="dragon-trial__round">{t.dragon.round(round + 1, ROUNDS)}</p>
              <HoardSelect
                key={round}
                label={t.dragon.hoard}
                options={options}
                value={choice}
                onChange={setChoice}
                calm={round < ROUNDS - 1}
                shuffle={round > 0}
              />
              <button type="button" className="btn btn--primary" disabled={!choice} onClick={offer}>
                {t.dragon.offer}
              </button>
            </>
          )}

          {phase === "reward" && (
            <>
              <div className="dragon-trial__reward">
                <ItemCard item={REWARD} />
              </div>
              <button type="button" className="btn btn--primary" onClick={onClose}>
                {t.dragon.receive}
              </button>
            </>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
