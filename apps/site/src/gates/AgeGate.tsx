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

/** 最初に入っている生年月日。ここから 0〜120 歳の範囲まで送ってもらう */
const INITIAL_BIRTHDATE = "1000-01-01";
const MAX_AGE = 120;
/** 長押しの最高速度 (日/秒)。毎秒およそ 200 年。最高速度で離すと惰性で 290 年ほど進んでしまう */
const MAX_SPEED = 73_000;
/** 長押しのヒントを読まずに矢印をこれだけ連打した人には、カレンダーが説教する */
const SCOLD_AFTER_PRESSES = 20;

function AgeGateView({ onPass }: GateProps) {
  const { t } = useI18n();
  const [birthdate, setBirthdate] = useState(INITIAL_BIRTHDATE);
  const age = ageOf(birthdate);
  const ok = age >= 0 && age <= MAX_AGE;

  const message =
    birthdate === INITIAL_BIRTHDATE
      ? t.age.untouched
      : age < 0
        ? t.age.future
        : age > MAX_AGE
          ? t.age.tooOld(age)
          : t.age.age(age);

  return (
    <div className="gate">
      <p className="gate__lead">{t.age.lead}</p>
      <EpochDatePicker
        label={t.age.label}
        value={birthdate}
        onChange={setBirthdate}
        maxSpeed={MAX_SPEED}
        scoldAfterPresses={SCOLD_AFTER_PRESSES}
      />
      <p className="gate__hint">{t.age.hint}</p>
      <p className="gate__age" aria-live="polite">
        {message}
      </p>
      <button type="button" className="btn btn--primary" disabled={!ok} onClick={() => onPass({ birthdate })}>
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
