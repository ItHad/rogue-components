import { useState } from "react";
import { EpochDatePicker } from "rogue-components";
import { useI18n } from "../i18n";
import type { Gate, GateProps } from "./types";

function ageOf(birthdate: string, today = new Date()): number {
  const [y, m, d] = birthdate.split("-").map(Number);
  let age = today.getFullYear() - y!;
  if (today.getMonth() + 1 < m! || (today.getMonth() + 1 === m! && today.getDate() < d!)) age--;
  return age;
}

function AgeGateView({ onPass }: GateProps) {
  const { t } = useI18n();
  const [birthdate, setBirthdate] = useState("1970-01-01");
  const age = ageOf(birthdate);
  const future = age < 0;

  return (
    <div className="gate">
      <p className="gate__lead">{t.age.lead}</p>
      <EpochDatePicker label={t.age.label} value={birthdate} onChange={setBirthdate} />
      <p className="gate__age" aria-live="polite">
        {future ? t.age.future : t.age.age(age)}
      </p>
      <button type="button" className="btn btn--primary" disabled={future} onClick={() => onPass({ birthdate })}>
        {t.age.confirm}
      </button>
    </div>
  );
}

export const ageGate: Gate = {
  id: "age",
  title: (t) => t.age.title,
  actions: ["pull"],
  isNeeded: (s) => s.birthdate === null,
  Component: AgeGateView,
};
