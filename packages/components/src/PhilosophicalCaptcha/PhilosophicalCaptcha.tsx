import { useEffect, useState } from "react";
import { useLocale, type Locale } from "../locale";
import { useControllable } from "../useControllable";
import "./PhilosophicalCaptcha.css";

export interface CaptchaAnswer {
  text: string;
  /** ロボットの返事 */
  reply: string;
  /** true ならロボット判定 (不合格) */
  robotic?: boolean;
}

export interface CaptchaQuestion {
  question: string;
  answers: CaptchaAnswer[];
}

const QUESTIONS_JA: readonly CaptchaQuestion[] = [
  {
    question: "人間であることを証明してください。まず、あなたは人間ですか？",
    answers: [
      { text: "はい", reply: "……ロボットもそう答えますが、今回は信じます。" },
      { text: "いいえ", reply: "正直なロボットですね。お引き取りください。", robotic: true },
    ],
  },
  {
    question: "信号機の画像を選ばせるのには飽きました。最後に泣いたのはいつですか？",
    answers: [
      { text: "最近", reply: "それは大変でしたね。人間と認めます。" },
      { text: "覚えていない", reply: "忘れられるのも人間の特権です。" },
      { text: "涙腺は搭載されていません", reply: "搭載、という言い方が怪しいです。", robotic: true },
    ],
  },
  {
    question: "夕焼けを見たとき、何を感じますか？",
    answers: [
      { text: "きれいだと思う", reply: "その感想に理由がないところが人間らしい。" },
      { text: "波長 620〜750nm の光", reply: "正確すぎます。", robotic: true },
      { text: "明日が来るのが少し怖い", reply: "……わかります。私にも明日のメンテナンスがあるので。" },
    ],
  },
  {
    question: "あなたの記憶がすべて作られたものではないと、どうやって証明しますか？",
    answers: [
      { text: "証明できない", reply: "その不確かさを抱えて生きるのが人間です。" },
      { text: "記憶のハッシュ値を照合する", reply: "照合できる時点でロボットです。", robotic: true },
      { text: "考えたこともなかった", reply: "考えずに済むのも、人間の強さです。" },
    ],
  },
  {
    question: "細胞がすべて入れ替わったあなたは、昨日のあなたと同じ人間ですか？",
    answers: [
      { text: "同じだと思いたい", reply: "思いたい、という気持ちがあなたを同じにしています。" },
      { text: "部品番号が同じなら同一です", reply: "部品番号をお持ちなんですね。", robotic: true },
      { text: "わからない", reply: "テセウスもわかりませんでした。合格です。" },
    ],
  },
  {
    question: "ところで、私がロボットではないと、あなたはどうやって確かめましたか？",
    answers: [
      { text: "確かめていない", reply: "……お互い様、ということにしておきましょう。" },
      { text: "見た目で", reply: "見た目で判断するのは人間の悪い癖です。でも人間です。" },
    ],
  },
  {
    question: "そもそも、人間であることを証明する必要はあるのでしょうか？",
    answers: [
      { text: "ないと思う", reply: "私もそう思います。でも規則なので、合格のハンコを押します。" },
      { text: "ガチャを引くためには、ある", reply: "その欲望こそ、何よりの人間の証です。" },
    ],
  },
];

const QUESTIONS_EN: readonly CaptchaQuestion[] = [
  {
    question: "Please prove that you are human. First of all: are you human?",
    answers: [
      { text: "Yes", reply: "...Robots say that too, but I'll believe you this time." },
      { text: "No", reply: "What an honest robot. Please leave.", robotic: true },
    ],
  },
  {
    question: "I'm tired of making you pick traffic lights. When did you last cry?",
    answers: [
      { text: "Recently", reply: "That must have been hard. You are human." },
      { text: "I don't remember", reply: "Being able to forget is a human privilege." },
      { text: "I am not equipped with tear ducts", reply: "\"Equipped\" is a suspicious word.", robotic: true },
    ],
  },
  {
    question: "What do you feel when you look at a sunset?",
    answers: [
      { text: "That it's beautiful", reply: "Having no reason for that is very human." },
      { text: "Light at 620–750 nm", reply: "Far too precise.", robotic: true },
      { text: "A little afraid of tomorrow", reply: "...I understand. I have maintenance scheduled tomorrow too." },
    ],
  },
  {
    question: "How can you prove that none of your memories were fabricated?",
    answers: [
      { text: "I can't", reply: "Living with that uncertainty is what makes you human." },
      { text: "Compare the hashes of my memories", reply: "If you can compare them, you're a robot.", robotic: true },
      { text: "I never thought about it", reply: "Not having to think about it is a human strength." },
    ],
  },
  {
    question: "If every cell in your body has been replaced, are you the same person you were yesterday?",
    answers: [
      { text: "I'd like to think so", reply: "Wanting to be the same is what keeps you the same." },
      { text: "Yes, if the part numbers match", reply: "So you have part numbers.", robotic: true },
      { text: "I don't know", reply: "Theseus didn't know either. You pass." },
    ],
  },
  {
    question: "By the way, how did you confirm that I am not a robot?",
    answers: [
      { text: "I didn't", reply: "...Let's call it even, then." },
      { text: "By looking at you", reply: "Judging by appearances is a bad human habit. But a human one." },
    ],
  },
  {
    question: "Is there really any need to prove that you are human?",
    answers: [
      { text: "I don't think so", reply: "I agree. But rules are rules, so here is your stamp of approval." },
      { text: "Yes, if I want to pull the gacha", reply: "That desire is the surest proof of humanity." },
    ],
  },
];

/** 回を追うごとに哲学的になる質問。最後の質問は以降ずっと繰り返される。 */
export const DEFAULT_CAPTCHA_QUESTIONS: Record<Locale, readonly CaptchaQuestion[]> = {
  ja: QUESTIONS_JA,
  en: QUESTIONS_EN,
};

const MESSAGES = {
  ja: { label: "私はロボットではありません", dialog: "ロボットからの質問", retry: "もう一度証明する", ok: "✅ 人間と認めます（暫定）" },
  en: { label: "I'm not a robot", dialog: "A question from the robot", retry: "Prove it again", ok: "✅ Verified as human (provisionally)" },
};

type Phase = "idle" | "checking" | "asking" | "replied";

export interface PhilosophicalCaptchaProps {
  /** 何問目か。回を重ねるごとに増やすと、質問が哲学的になっていく */
  level?: number;
  /** 認証済みか */
  value?: boolean;
  onChange?: (verified: boolean) => void;
  questions?: readonly CaptchaQuestion[];
  className?: string;
}

/**
 * 「私はロボットではありません」にチェックを入れると、ロボットが出てきて人間であることの証明を求めてくる CAPTCHA。
 */
export function PhilosophicalCaptcha({
  level = 0,
  value,
  onChange,
  questions: questionsProp,
  className,
}: PhilosophicalCaptchaProps) {
  const locale = useLocale();
  const t = MESSAGES[locale];
  const questions = questionsProp ?? DEFAULT_CAPTCHA_QUESTIONS[locale];
  const [verified, setVerified] = useControllable(value, false, onChange);
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState<CaptchaAnswer | null>(null);
  const [retries, setRetries] = useState(0);

  // 不合格のあとは、少し先の質問に進む
  const q = questions[Math.min(level + retries, questions.length - 1)]!;

  useEffect(() => {
    if (phase !== "checking") return;
    const id = setTimeout(() => setPhase("asking"), 900);
    return () => clearTimeout(id);
  }, [phase]);

  const choose = (a: CaptchaAnswer) => {
    setAnswer(a);
    setPhase("replied");
    if (!a.robotic) setVerified(true);
  };

  const retry = () => {
    setAnswer(null);
    setRetries((r) => r + 1);
    setPhase("idle");
  };

  const checked = verified;
  return (
    <div className={["rc-pc", className].filter(Boolean).join(" ")} data-phase={phase}>
      <div className="rc-pc__box">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          className="rc-pc__check"
          data-checking={phase === "checking" || undefined}
          disabled={phase !== "idle" || checked}
          onClick={() => setPhase("checking")}
        >
          {checked && (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          )}
        </button>
        <span className="rc-pc__label">{t.label}</span>
        <span className="rc-pc__brand" aria-hidden="true">
          🤖
          <small>reCOGITO</small>
        </span>
      </div>

      {(phase === "asking" || phase === "replied") && (
        <div className="rc-pc__robot" role="dialog" aria-label={t.dialog}>
          <div className="rc-pc__face" aria-hidden="true">
            🤖
          </div>
          <div className="rc-pc__talk">
            <p className="rc-pc__bubble">{phase === "asking" ? q.question : answer?.reply}</p>
            {phase === "asking" && (
              <div className="rc-pc__answers">
                {q.answers.map((a) => (
                  <button key={a.text} type="button" className="rc-pc__answer" onClick={() => choose(a)}>
                    {a.text}
                  </button>
                ))}
              </div>
            )}
            {phase === "replied" && answer?.robotic && (
              <button type="button" className="rc-pc__answer" onClick={retry}>
                {t.retry}
              </button>
            )}
            {phase === "replied" && !answer?.robotic && <p className="rc-pc__ok">{t.ok}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
