import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LocaleProvider, type Locale } from "rogue-components";

export type { Locale };

const STORAGE_KEY = "monster-gacha:locale";

const ja = {
  siteName: "モンスターガチャ",
  nav: { gacha: "ガチャ", collection: "図鑑", shop: "ショップ" },
  mainNav: "メイン",
  gemsLabel: (n: number) => `所持ジェム ${n}`,
  footer: "モンスターガチャ | 入力ひとつに全力をかけるガチャサイト",
  language: "言語",
  switchTo: "Switch to English",
  modalClose: "閉じる",

  menu: {
    label: "メニュー",
    reset: "初めから",
    resetHint: "3 口で完食すると記録が消えます",
    share: "ゲームを共有",
    shareText: "入力ひとつに全力をかけるガチャサイト「モンスターガチャ」で遊んでいます。",
    author: "作者の X",
  },

  gacha: {
    eyebrow: "期間限定ではないガチャ",
    lead: "ダンジョンの奥からモンスターが飛び出してきます。だいたいは弱いです。",
    openCapsule: "カプセルを開ける",
    capsuleHint: "カプセルをタップして開けよう",
    resultTitle: "ガチャ結果",
    pull1: "1 回引く",
    pull10: "10 回引く",
    short: "ジェムが足りません。",
    goShop: "ショップでチャージする",
    rates: "排出率",
  },

  collection: {
    title: "図鑑",
    lead: (found: number, total: number) => `${found} / ${total} 種類 見つけました`,
    unknown: "？？？",
    share: "図鑑を自慢する",
    shareTag: "モンスターガチャ",
    shareText: (found: number, total: number) =>
      `私はモンスターガチャで ${found} 体のモンスターを開放しました！（全 ${total} 種）`,
  },

  shop: {
    title: "ショップ",
    lead: "お代はいただきませんが、欲張りすぎにはご注意を。",
    product: "ジェム 100 個パック",
    desc: "1 パックでガチャを 1 回引けます。",
    quantity: "購入数",
    increase: (n: number) => `${n} 増やす`,
    decrease: (n: number) => `${n} 減らす`,
    total: "合計",
    buy: "購入する",
    done: (amount: string) => `◆ ${amount} をチャージしました。`,
  },

  terms: {
    title: "利用規約への同意",
    docLabel: "利用規約",
    articles: [
      "第 1 条　本サービスは、ジェムを消費してモンスターを呼び出すサービスです。",
      "第 2 条　排出されたモンスターは、かわいさを除き、いかなる価値も持ちません。",
      "第 3 条　利用者は、入力ひとつに全力をかけることに同意するものとします。",
      "第 4 条　本規約への同意は、同意を維持し続けることによってのみ有効となります。",
    ],
    agree: "利用規約に同意する",
    proceed: "同意してガチャへ進む",
  },

  consent: {
    title: "Coookie の使用について",
    message: "🍪 当サイトでは、より快適にご利用いただくために Coookie を使用しています。",
    details: "詳細",
    accept: "Coookie に同意しました。おいしくいただきます。",
    reject: "Coookie を拒否しました。よくぞ同意を倒しました。",
    proceed: "サイトへ進む",
  },

  age: {
    title: "年齢確認",
    lead: "ガチャのご利用には年齢確認が必要です。生年月日を入力してください。",
    label: "生年月日",
    hint: "長押しで加速します。慣性があるので微調整が肝心。",
    untouched: "1000 年 1 月 1 日生まれ……？ さすがにそれは嘘でしょう。",
    tooOld: (n: number) => `${n} 歳……？ さすがにそれは嘘でしょう。`,
    future: "おっと、未来人の方でいらっしゃいましたか。お引き取りください。",
    age: (n: number) => `${n} 歳として確認します。`,
    confirm: "この生年月日で確認する",
  },

  captcha: {
    title: "人間確認",
    lead: "ガチャを引く前に、あなたが人間であることを確認します。",
    proceed: "ガチャへ進む",
  },

  payment: {
    title: "決済パスワード",
    setLead: "決済パスワードを設定してください。",
    resetLead: "今回のチャージは、いまの決済パスワードでは守りきれません。もっと強いパスワードを設定し直してください。",
    bosses: ["弱パス大魔王", "並パス大魔王", "強パス大魔王", "真・パス大魔王", "強欲パス魔神", "欲張りの成れの果て"],
    rules: {
      minLength: (n: number) => `${n} 文字以上`,
      noRepeat: "同じ文字を 3 つ続けない",
      digit: "数字を使う",
      symbol: "記号を使う",
      symbols: (n: number) => `記号を ${n} 種類以上使う`,
      digits: (n: number) => `数字を ${n} 種類以上使う`,
      allSymbols: "記号 ! ? # $ をすべて使う",
      noReuse: "同じ文字を 2 回使わない",
    },
    label: "決済パスワード",
    next: "次へ",
    confirmLead: "確認のため、もう一度入力してください。",
    confirmLabel: "決済パスワード（確認）",
    mismatch: "パスワードが一致しません。最初から入れ直してください。",
    setAndPay: "設定して決済する",
    wrong: "パスワードが違います。",
    pay: "決済する",
    forgot: "パスワードを忘れた場合",
    forgotTitle: "パスワードの再設定",
    forgotLead: "本人確認のため、下のトグルをオンにしてください。",
    forgotToggle: "パスワードを新たに作る",
    forgotReset: "パスワードを再設定する",
    forgotSetLead: "新しい決済パスワードを設定してください。",
  },

  dragon: {
    name: "宵の古竜",
    intro: "……我を十度もつつくとは、命知らずな人の子よ。だが、その度胸は気に入った。我が試練を越えれば、褒美をとらせよう。",
    introAgain: "また来たか、人の子よ。我が子は達者にしておるか。試練を越えれば、もう一頭預けてもよいぞ。我には子が多いのだ。",
    accept: "試練を受ける",
    decline: "やめておく",
    order: [
      (name: string) => `まずは小手調べだ。この 3 つの中から「${name}」を持ってまいれ。`,
      (name: string) => `次は宝物庫の奥だ。360 の財宝の中から「${name}」を探してまいれ。`,
      (name: string) => `最後の試練だ。我が息に耐えながら「${name}」を持ってまいれ。`,
    ],
    passed: "……ほう、やるではないか。",
    round: (n: number, total: number) => `試練 ${n} / ${total}`,
    hoard: "宝物庫",
    offer: "献上する",
    wrong: (got: string, next: string) => `愚か者め、それは「${got}」だ。……もう一度だけ機会をやろう。次は「${next}」を持ってこい。`,
    giveUp: "もうよい。去れ。",
    reward: "見事だ。約束どおり、我が子を汝に預けよう。大事にするのだぞ。",
    receive: "受け取る",
    leave: "ドラゴンを帰す",
  },

  policy: {
    revised: "最終改定日: 魔界暦 666 年",
    title: "Coookie ポリシー",
    lead: "モンスターガチャ（以下「当サイト」）における Coookie（コーーキー）の取り扱いについて定めます。",
    sections: [
      {
        heading: "第 1 条　Coookie とは",
        body: "Coookie とは、ダンジョンの最下層でこっそり焼かれている架空の焼き菓子です。o がひとつ多いぶん、通常の Cookie より少しだけ香ばしいとされています。ブラウザの Cookie とは一切関係がありません。",
      },
      {
        heading: "第 2 条　収集する情報",
        body: "当サイトは、Coookie を通じて以下の情報を収集しません。",
        list: [
          "あなたが同意と拒否のどちらを応援したかったか",
          "連打で指がどれくらい疲れたか",
          "ガチャで N のモンスターしか出なかったときの気持ち",
        ],
      },
      {
        heading: "第 3 条　拒否が勝ちにくい理由",
        body: "同意は長年の修行により、自然回復とガードを身につけました。拒否が弱いのは仕様であり、どこかの実在するサイトを参考にしたわけではありません。たぶん。",
      },
      {
        heading: "第 4 条　第三者への提供",
        body: "焼き上がった Coookie は、ダンジョンのボス、通りすがりのモンスター、およびその他の魔物に提供されることがあります。提供先はおいしくいただきます。",
      },
      {
        heading: "第 5 条　保存期間",
        body: "Coookie の賞味期限は、焼き上がりから魔界時間で約 1000 年です。お早めにお召し上がりください。",
      },
    ] as { heading: string; body: string; list?: string[] }[],
    back: "ガチャへ戻る",
  },
};

export type Messages = typeof ja;

const en: Messages = {
  siteName: "Monster Gacha",
  nav: { gacha: "Gacha", collection: "Collection", shop: "Shop" },
  mainNav: "Main",
  gemsLabel: (n: number) => `${n} gems`,
  footer: "Monster Gacha | a gacha site where every input takes everything you've got",
  language: "Language",
  switchTo: "日本語に変える",
  modalClose: "Close",

  menu: {
    label: "Menu",
    reset: "Start over",
    resetHint: "Eat it in 3 bites to wipe your progress",
    share: "Share the game",
    shareText: "I'm playing Monster Gacha, a gacha site where every input takes everything you've got.",
    author: "Creator on X",
  },

  gacha: {
    eyebrow: "A Not-Limited-Time Gacha",
    lead: "Monsters burst out from deep in the dungeon. Mostly weak ones.",
    openCapsule: "Open the capsule",
    capsuleHint: "Tap the capsule to open it",
    resultTitle: "Your Pull",
    pull1: "Pull ×1",
    pull10: "Pull ×10",
    short: "Not enough gems.",
    goShop: "Top up at the shop",
    rates: "Drop rates",
  },

  collection: {
    title: "Collection",
    lead: (found: number, total: number) => `Found ${found} / ${total}`,
    unknown: "???",
    share: "Show off your collection",
    shareTag: "MonsterGacha",
    shareText: (found: number, total: number) =>
      `I've unlocked ${found} monsters in Monster Gacha! (${total} in total)`,
  },

  shop: {
    title: "Shop",
    lead: "It's on the house. Just don't get too greedy.",
    product: "Gems ×100 Pack",
    desc: "One pack gets you one pull.",
    quantity: "Quantity",
    increase: (n: number) => `Add ${n}`,
    decrease: (n: number) => `Remove ${n}`,
    total: "Total",
    buy: "Buy",
    done: (amount: string) => `Added ◆ ${amount}.`,
  },

  terms: {
    title: "Terms of Service",
    docLabel: "Terms of Service",
    articles: [
      "Article 1. This service lets you spend gems to summon monsters.",
      "Article 2. Monsters obtained have no value whatsoever, cuteness excepted.",
      "Article 3. The user agrees to give every single input everything they've got.",
      "Article 4. Agreement to these terms remains valid only for as long as it is maintained.",
    ],
    agree: "I agree to the Terms of Service",
    proceed: "Agree and continue",
  },

  consent: {
    title: "About Coookies",
    message: "🍪 We use Coookies to give you a better experience.",
    details: "Learn more",
    accept: "You accepted Coookies. We'll enjoy them.",
    reject: "You rejected Coookies. You actually beat Accept.",
    proceed: "Continue to site",
  },

  age: {
    title: "Age Verification",
    lead: "Age verification is required to use the gacha. Please enter your date of birth.",
    label: "Date of birth",
    hint: "Hold to speed up. It has momentum, so fine-tuning is key.",
    untouched: "Born on January 1, 1000…? Come on, that can't be true.",
    tooOld: (n: number) => `${n} years old…? Come on, that can't be true.`,
    future: "Oh, a visitor from the future, are we? We must ask you to leave.",
    age: (n: number) => `You will be verified as ${n} years old.`,
    confirm: "Confirm date of birth",
  },

  captcha: {
    title: "Human Verification",
    lead: "Before you pull, we need to confirm that you are human.",
    proceed: "Continue to gacha",
  },

  payment: {
    title: "Payment Password",
    setLead: "Please set a payment password.",
    resetLead: "Your current payment password can't protect a top-up this big. Please set a stronger one.",
    bosses: [
      "Weak Password Overlord",
      "Fair Password Overlord",
      "Strong Password Overlord",
      "True Password Overlord",
      "Greedy Password Archfiend",
      "What Greed Becomes",
    ],
    rules: {
      minLength: (n: number) => `At least ${n} characters`,
      noRepeat: "No character 3 times in a row",
      digit: "At least one number",
      symbol: "At least one symbol",
      symbols: (n: number) => `At least ${n} different symbols`,
      digits: (n: number) => `At least ${n} different numbers`,
      allSymbols: "Use every symbol: ! ? # $",
      noReuse: "Never use the same character twice",
    },
    label: "Payment password",
    next: "Next",
    confirmLead: "Please enter it once more to confirm.",
    confirmLabel: "Payment password (confirm)",
    mismatch: "The passwords don't match. Please start over.",
    setAndPay: "Set and pay",
    wrong: "Incorrect password.",
    pay: "Pay",
    forgot: "Forgot your password?",
    forgotTitle: "Reset Password",
    forgotLead: "To verify it's you, please switch the toggle below on.",
    forgotToggle: "Create a new password",
    forgotReset: "Reset password",
    forgotSetLead: "Please set a new payment password.",
  },

  dragon: {
    name: "The Elder Dusk Dragon",
    intro: "...Poking me ten times. You are a reckless one, child of man. Yet I admire your nerve. Pass my trial, and you shall be rewarded.",
    introAgain: "You return, child of man. Is my hatchling well? Pass my trial again and I may entrust you with another. I have many children.",
    accept: "Accept the trial",
    decline: "Not today",
    order: [
      (name: string) => `A warm-up first. From these three, bring me the ${name}.`,
      (name: string) => `Now into the depths of my hoard. Among 360 treasures, find the ${name}.`,
      (name: string) => `The final trial. Endure my breath and bring me the ${name}.`,
    ],
    passed: "...Hmph. Not bad.",
    round: (n: number, total: number) => `Trial ${n} of ${total}`,
    hoard: "The hoard",
    offer: "Offer it",
    wrong: (got: string, next: string) => `Fool. That is the ${got}. ...I shall grant you one more chance. Bring me the ${next}.`,
    giveUp: "Enough. Begone.",
    reward: "Well done. As promised, I entrust my hatchling to you. Take good care of it.",
    receive: "Receive",
    leave: "Send the dragon away",
  },

  policy: {
    revised: "Last revised: Demon Realm Era 666",
    title: "Coookie Policy",
    lead: "This policy describes how Monster Gacha (the \"Site\") handles Coookies.",
    sections: [
      {
        heading: "Article 1. What is a Coookie?",
        body: "A Coookie is an imaginary baked treat secretly made on the lowest floor of a dungeon. With one extra o, it is said to be slightly more fragrant than a regular cookie. It has nothing to do with browser cookies.",
      },
      {
        heading: "Article 2. Information we collect",
        body: "The Site does not collect the following information through Coookies:",
        list: [
          "Which side you were secretly rooting for, Accept or Reject",
          "How tired your fingers got from all the clicking",
          "How you felt when the gacha gave you nothing but N-rank monsters",
        ],
      },
      {
        heading: "Article 3. Why Reject rarely wins",
        body: "Through years of training, Accept has mastered regeneration and guarding. Reject being weak is by design and was not inspired by any real website. Probably.",
      },
      {
        heading: "Article 4. Sharing with third parties",
        body: "Freshly baked Coookies may be shared with dungeon bosses, passing monsters and other fiends. They will enjoy them.",
      },
      {
        heading: "Article 5. Retention period",
        body: "Coookies are best before roughly 1,000 years after baking, in demon realm time. Please enjoy them soon.",
      },
    ],
    back: "Back to the gacha",
  },
};

const MESSAGES: Record<Locale, Messages> = { ja, en };

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ja" || saved === "en") return saved;
  } catch {
    // 保存できない環境でもブラウザの言語で動かす
  }
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const I18nContext = createContext<I18n | null>(null);

/** サイト全体の言語。コンポーネントライブラリの LocaleProvider にも同じ言語を渡す。 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = MESSAGES[locale].siteName;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // 保存できなくても切り替え自体は動く
    }
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: MESSAGES[locale] }}>
      <LocaleProvider locale={locale}>{children}</LocaleProvider>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
