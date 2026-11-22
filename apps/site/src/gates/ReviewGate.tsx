import { useState } from "react";
import { RiggedRating } from "rogue-components";
import { useI18n } from "../i18n";
import type { Gate, GateProps } from "./types";

function ReviewGateView({ onPass }: GateProps) {
  const { t } = useI18n();
  const [stars, setStars] = useState(0);

  return (
    <div className="gate">
      <p className="gate__lead">{t.review.lead}</p>
      <RiggedRating label={t.review.label} value={stars} onChange={setStars} />
      <button type="button" className="btn btn--primary" disabled={stars < 5} onClick={() => onPass({ rated: true })}>
        {t.review.proceed}
      </button>
    </div>
  );
}

export const reviewGate: Gate = {
  id: "review",
  title: (t) => t.review.title,
  actions: ["collection"],
  isNeeded: (s) => !s.rated,
  Component: ReviewGateView,
};
