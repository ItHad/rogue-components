import { useState } from "react";
import { ConsentBattle, type ConsentChoice } from "rogue-components";
import { POLICY_PATH } from "../views/PolicyView";
import { useI18n } from "../i18n";
import type { Gate, GateProps } from "./types";

function ConsentGateView({ onPass }: GateProps) {
  const { t } = useI18n();
  const [winner, setWinner] = useState<ConsentChoice | null>(null);

  return (
    <div className="gate gate--consent">
      <ConsentBattle
        message={t.consent.message}
        detailsHref={POLICY_PATH}
        detailsLabel={t.consent.details}
        onChange={setWinner}
      />
      {winner && (
        <div className="gate__done">
          <p>{t.consent[winner]}</p>
          <button type="button" className="btn btn--primary" onClick={() => onPass({ consentChoice: winner })}>
            {t.consent.proceed}
          </button>
        </div>
      )}
    </div>
  );
}

export const consentGate: Gate = {
  id: "consent",
  title: (t) => t.consent.title,
  actions: ["visit"],
  layout: "banner",
  isNeeded: (s) => s.consentChoice === null,
  Component: ConsentGateView,
};
