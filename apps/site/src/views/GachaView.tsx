import { useEffect, useState, type CSSProperties } from "react";
import { DvdModal } from "rogue-components";
import { highestRarity, RARITY_ORDER, RARITY_RATE, type Item } from "../gacha/items";
import { PULL_COST } from "../gacha/state";
import { useI18n } from "../i18n";
import { ItemCard } from "../ui/ItemCard";

type Phase = "idle" | "spinning" | "capsule" | "result";

interface GachaViewProps {
  gems: number;
  /** 関門を通過して引けたら結果を、やめたら null を返す */
  onPull: (count: number) => Promise<Item[] | null>;
  onGoShop: () => void;
}

const SPIN_MS = 1400;

export function GachaView({ gems, onPull, onGoShop }: GachaViewProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (phase !== "spinning") return;
    const id = setTimeout(() => setPhase(results.length === 1 ? "capsule" : "result"), SPIN_MS);
    return () => clearTimeout(id);
  }, [phase, results.length]);

  const pull = async (count: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const got = await onPull(count);
      if (!got) return;
      setResults(got);
      setPhase("spinning");
    } finally {
      setBusy(false);
    }
  };

  const top = results.length > 0 ? highestRarity(results) : "N";
  const locked = busy || phase === "spinning" || phase === "capsule";

  return (
    <section className="gacha">
      <div className="gacha__banner">
        <p className="gacha__eyebrow">{t.gacha.eyebrow}</p>
        <h1 className="gacha__title">{t.siteName}</h1>
        <p className="gacha__lead">{t.gacha.lead}</p>
      </div>

      <div className="machine" data-phase={phase} data-rarity={top}>
        <div className="machine__globe">
          {Array.from({ length: 9 }, (_, i) => (
            <span
              key={i}
              className="machine__ball"
              style={
                {
                  "--i": i,
                  left: `${14 + (i % 3) * 26 + (Math.floor(i / 3) % 2) * 12}%`,
                  top: `${36 + Math.floor(i / 3) * 18}%`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div className="machine__body">
          <div className="machine__handle" />
          <div className="machine__outlet">
            {phase === "capsule" && (
              <button type="button" className="capsule" onClick={() => setPhase("result")}>
                <span className="visually-hidden">{t.gacha.openCapsule}</span>
              </button>
            )}
          </div>
        </div>
        {phase === "capsule" && <p className="machine__hint">{t.gacha.capsuleHint}</p>}
      </div>

      <DvdModal open={phase === "result"} title={t.gacha.resultTitle} onClose={() => setPhase("idle")}>
        <div className={results.length === 1 ? "result-single" : "result-grid"}>
          {results.map((item, i) => (
            <ItemCard key={i} item={item} delay={i * 80} />
          ))}
        </div>
      </DvdModal>

      <div className="gacha__actions">
        <button
          type="button"
          className="btn btn--primary btn--big"
          disabled={locked || gems < PULL_COST}
          onClick={() => pull(1)}
        >
          {t.gacha.pull1}
          <small>✦ {PULL_COST}</small>
        </button>
        <button
          type="button"
          className="btn btn--primary btn--big"
          disabled={locked || gems < PULL_COST * 10}
          onClick={() => pull(10)}
        >
          {t.gacha.pull10}
          <small>✦ {PULL_COST * 10}</small>
        </button>
      </div>

      {gems < PULL_COST && (
        <p className="gacha__short">
          {t.gacha.short}
          <button type="button" className="link" onClick={onGoShop}>
            {t.gacha.goShop}
          </button>
        </p>
      )}

      <details className="gacha__rates">
        <summary>{t.gacha.rates}</summary>
        <ul>
          {[...RARITY_ORDER].reverse().map((r) => (
            <li key={r}>
              <span className={`rarity rarity--${r}`}>{r}</span> {RARITY_RATE[r]}%
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
