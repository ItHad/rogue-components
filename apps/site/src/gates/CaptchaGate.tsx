import { useState } from "react";
import { PhilosophicalCaptcha } from "rogue-components";
import { CAPTCHA_EVERY } from "../gacha/state";
import { useI18n } from "../i18n";
import type { Gate, GateProps } from "./types";

function CaptchaGateView({ state, onPass }: GateProps) {
  const { t } = useI18n();
  const [verified, setVerified] = useState(false);

  return (
    <div className="gate">
      <p className="gate__lead">{t.captcha.lead}</p>
      <PhilosophicalCaptcha level={state.captchaLevel} value={verified} onChange={setVerified} />
      <button
        type="button"
        className="btn btn--primary"
        disabled={!verified}
        onClick={() => onPass({ captchaLevel: state.captchaLevel + 1, pullsSinceCaptcha: 0 })}
      >
        {t.captcha.proceed}
      </button>
    </div>
  );
}

export const captchaGate: Gate = {
  id: "captcha",
  title: (t) => t.captcha.title,
  actions: ["pull"],
  isNeeded: (s) => s.pullsSinceCaptcha >= CAPTCHA_EVERY,
  Component: CaptchaGateView,
};
