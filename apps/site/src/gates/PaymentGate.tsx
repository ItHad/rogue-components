import { useState } from "react";
import { PasswordBoss, passwordStrength, SafeDial } from "rogue-components";
import { useI18n } from "../i18n";
import type { Gate, GateProps } from "./types";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 初回: ボスを倒せる強さのパスワードを決め、逆回転ダイヤルで確認入力する */
function SetupView({ onPass }: GateProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<"set" | "confirm">("set");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  if (step === "set") {
    return (
      <div className="gate">
        <p className="gate__lead">{t.payment.setLead}</p>
        <SafeDial label={t.payment.label} value={password} onChange={setPassword} />
        <PasswordBoss password={password} />
        <button
          type="button"
          className="btn btn--primary"
          disabled={passwordStrength(password) < 100}
          onClick={() => setStep("confirm")}
        >
          {t.payment.next}
        </button>
      </div>
    );
  }

  const submit = async () => {
    if (confirm !== password) {
      setMismatch(true);
      setConfirm("");
      return;
    }
    onPass({ passwordHash: await sha256(password) });
  };

  return (
    <div className="gate">
      <p className="gate__lead">{t.payment.confirmLead}</p>
      <SafeDial label={t.payment.confirmLabel} value={confirm} onChange={setConfirm} reverse />
      {mismatch && (
        <p className="gate__error" role="alert">
          {t.payment.mismatch}
        </p>
      )}
      <button
        type="button"
        className="btn btn--primary"
        disabled={confirm.length !== password.length}
        onClick={submit}
      >
        {t.payment.setAndPay}
      </button>
    </div>
  );
}

/** 2 回目以降: 設定したパスワードを入れる */
function VerifyView({ state, onPass }: GateProps) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);

  const submit = async () => {
    if ((await sha256(password)) !== state.passwordHash) {
      setWrong(true);
      setPassword("");
      return;
    }
    onPass();
  };

  return (
    <div className="gate">
      <SafeDial label={t.payment.label} value={password} onChange={setPassword} />
      {wrong && (
        <p className="gate__error" role="alert">
          {t.payment.wrong}
        </p>
      )}
      <button type="button" className="btn btn--primary" disabled={password.length === 0} onClick={submit}>
        {t.payment.pay}
      </button>
    </div>
  );
}

function PaymentGateView(props: GateProps) {
  return props.state.passwordHash ? <VerifyView {...props} /> : <SetupView {...props} />;
}

export const paymentGate: Gate = {
  id: "payment",
  title: (t) => t.payment.title,
  actions: ["charge"],
  isNeeded: () => true,
  Component: PaymentGateView,
};
