import { useState } from "react";
import { GaugeCheckbox } from "rogue-components";
import { useI18n } from "../i18n";
import type { Gate, GateProps } from "./types";

function TermsGateView({ onPass }: GateProps) {
  const { t } = useI18n();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="gate">
      <div className="gate__doc" tabIndex={0} aria-label={t.terms.docLabel}>
        {t.terms.articles.map((a) => (
          <p key={a}>{a}</p>
        ))}
      </div>
      <GaugeCheckbox label={t.terms.agree} checked={agreed} onChange={setAgreed} />
      <button
        type="button"
        className="btn btn--primary"
        disabled={!agreed}
        onClick={() => onPass({ agreedTerms: true })}
      >
        {t.terms.proceed}
      </button>
    </div>
  );
}

export const termsGate: Gate = {
  id: "terms",
  title: (t) => t.terms.title,
  actions: ["pull"],
  isNeeded: (s) => !s.agreedTerms,
  Component: TermsGateView,
};
