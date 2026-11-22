import { useState } from "react";
import { BuzzWireToggle, PasswordBoss, passwordStrength, SafeDial } from "rogue-components";
import { useI18n } from "../i18n";
import { Modal } from "../ui/Modal";
import { bossName, passwordRules, passwordTierFor } from "./paymentTiers";
import type { Gate, GateProps } from "./types";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface SetupViewProps extends GateProps {
  tier: number;
  /** 最初に出す説明 (初回・強さ不足での設定し直し・忘れたときの再設定で変わる) */
  lead: string;
}

/**
 * 初回 (または欲張ったとき): ボスを倒せる強さのパスワードを決め、逆回転ダイヤルで確認入力する。
 * ボスの強さは購入数で決まる。
 */
function SetupView({ onPass, tier, lead }: SetupViewProps) {
  const { t } = useI18n();
  const rules = passwordRules(tier, t);
  const [step, setStep] = useState<"set" | "confirm">("set");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  if (step === "set") {
    return (
      <div className="gate">
        <p className="gate__lead">{lead}</p>
        <SafeDial label={t.payment.label} value={password} onChange={setPassword} />
        <PasswordBoss password={password} rules={rules} name={bossName(tier, t)} />
        <button
          type="button"
          className="btn btn--primary"
          disabled={passwordStrength(password, rules) < 100}
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
    onPass({ passwordHash: await sha256(password), passwordTier: tier });
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

/** 忘れたとき: イライラ棒トグルをオンにできたら、パスワードを再設定できる */
function ForgotModal({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(false);

  return (
    <Modal title={t.payment.forgotTitle} onClose={onClose}>
      <div className="gate">
        <p className="gate__lead">{t.payment.forgotLead}</p>
        <BuzzWireToggle label={t.payment.forgotToggle} checked={unlocked} onChange={setUnlocked} />
        <button type="button" className="btn btn--primary" disabled={!unlocked} onClick={onReset}>
          {t.payment.forgotReset}
        </button>
      </div>
    </Modal>
  );
}

/** 2 回目以降: 設定したパスワードを入れる */
function VerifyView({ state, onPass, onForgot }: GateProps & { onForgot: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

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
      <button type="button" className="gate__link" onClick={() => setForgotOpen(true)}>
        {t.payment.forgot}
      </button>
      {forgotOpen && <ForgotModal onClose={() => setForgotOpen(false)} onReset={onForgot} />}
    </div>
  );
}

function PaymentGateView(props: GateProps) {
  const { t } = useI18n();
  const [forgot, setForgot] = useState(false);
  const tier = passwordTierFor(props.request.quantity ?? 0);
  const { passwordHash, passwordTier } = props.state;
  if (forgot) return <SetupView {...props} tier={tier} lead={t.payment.forgotSetLead} />;
  // いまのパスワードより強い段階のチャージなら、パスワードを設定し直させる
  if (passwordHash && tier <= passwordTier) return <VerifyView {...props} onForgot={() => setForgot(true)} />;
  return <SetupView {...props} tier={tier} lead={passwordHash ? t.payment.resetLead : t.payment.setLead} />;
}

export const paymentGate: Gate = {
  id: "payment",
  title: (t) => t.payment.title,
  actions: ["charge"],
  isNeeded: () => true,
  Component: PaymentGateView,
};
