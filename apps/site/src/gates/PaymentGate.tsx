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
  onForgot: () => void;
}

/**
 * 初回 (または欲張ったとき): ボスを倒せる強さのパスワードを決め、逆回転ダイヤルで確認入力する。
 * ボスの強さは購入数で決まる。
 * パスワードは「次へ」を押した時点でもう保存してしまう (確認入力の画面でも「忘れた場合」が出る)。
 */
function SetupView({ onPass, save, tier, lead, onForgot }: SetupViewProps) {
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
          onClick={async () => {
            save({ passwordHash: await sha256(password), passwordTier: tier });
            setStep("confirm");
          }}
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
      <ForgotLink onReset={onForgot} />
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

/** 「パスワードを忘れた場合」の文字リンクと、その先の再設定ダイアログ */
function ForgotLink({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="gate__link" onClick={() => setOpen(true)}>
        {t.payment.forgot}
      </button>
      {open && <ForgotModal onClose={() => setOpen(false)} onReset={onReset} />}
    </>
  );
}

/** 2 回目以降: 設定したパスワードを入れる */
function VerifyView({ state, onPass, onForgot }: GateProps & { onForgot: () => void }) {
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
      <ForgotLink onReset={onForgot} />
    </div>
  );
}

function PaymentGateView(props: GateProps) {
  const { t } = useI18n();
  // 忘れて再設定した回数。再設定のたびに設定画面を最初からやり直させる
  const [resets, setResets] = useState(0);
  const onForgot = () => setResets((n) => n + 1);
  const tier = passwordTierFor(props.request.quantity ?? 0);
  // 設定画面の途中でパスワードを保存するので、どの画面を出すかは開いたときの状態で決めておく
  const [initial] = useState(() => {
    const { passwordHash, passwordTier } = props.state;
    // いまのパスワードより強い段階のチャージなら、パスワードを設定し直させる
    if (passwordHash && tier <= passwordTier) return "verify" as const;
    return passwordHash ? ("reset" as const) : ("set" as const);
  });
  if (resets > 0) {
    return <SetupView key={resets} {...props} tier={tier} lead={t.payment.forgotSetLead} onForgot={onForgot} />;
  }
  if (initial === "verify") return <VerifyView {...props} onForgot={onForgot} />;
  const lead = initial === "reset" ? t.payment.resetLead : t.payment.setLead;
  return <SetupView {...props} tier={tier} lead={lead} onForgot={onForgot} />;
}

export const paymentGate: Gate = {
  id: "payment",
  title: (t) => t.payment.title,
  actions: ["charge"],
  isNeeded: () => true,
  Component: PaymentGateView,
};
