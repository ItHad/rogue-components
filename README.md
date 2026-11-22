# Rogue Components

入力ひとつに全力をかける、最強の React コンポーネント集です。
`value` / `onChange` で扱えるふつうの React コンポーネントで、制御・非制御のどちらでも使えます。

## コンポーネント

| コンポーネント | 見た目 | 触ると |
| --- | --- | --- |
| `GaugeCheckbox` | 同意のチェックボックス | 連打でゲージを満タンにしないとチェックが入らない。チェック後も維持費の支払いが求められる |
| `ConsentBattle` | 同意バナー | 「同意」と「拒否」が戦い始める。押した側が相手を攻撃する |
| `FibonacciStepper` | 数値のステッパー | ＋はフィボナッチ数、−は素数ずつ動く |
| `SafeDial` | パスワード欄 | 金庫のダイヤルを回して 1 文字ずつ入力する |
| `PasswordBoss` | パスワード強度メーター | 強度メーターがボスの体力ゲージになる |
| `EpochDatePicker` | 日付欄 | 1970/01/01 から 1 日ずつしか動かない。長押しで加速するが過熱する |
| `PhilosophicalCaptcha` | 「私はロボットではありません」 | 人間であることを哲学的な問いで証明させられる |
| `DvdModal` | モーダル | 閉じる × が DVD のロゴのように跳ね回り、角に当たった瞬間しか押せない |
| `BuzzWireToggle` | トグルスイッチ | オンにしようとすると溝が迷路のように伸びる。スイッチの丸を壁に触れずにゴールまで運ばないとオンにならず、壁に触れると縮んで元に戻る |

## 使い方

```tsx
import { useState } from "react";
import { GaugeCheckbox, EpochDatePicker, DvdModal } from "rogue-components";

function SignUp() {
  const [agreed, setAgreed] = useState(false);
  const [birthdate, setBirthdate] = useState("1970-01-01");
  const [open, setOpen] = useState(true);

  return (
    <>
      <GaugeCheckbox label="利用規約に同意する" checked={agreed} onChange={setAgreed} />
      <EpochDatePicker label="生年月日" value={birthdate} onChange={setBirthdate} />
      <DvdModal open={open} title="お知らせ" onClose={() => setOpen(false)}>
        閉じられるものなら閉じてみてください。
      </DvdModal>
    </>
  );
}
```

`value` を渡さなければ非制御で動きます（`defaultValue` / `defaultChecked` で初期値を指定できます）。どのコンポーネントも `className` を受け付けます。CSS のクラス名には `rc-` が付いています。

### 主な props

| コンポーネント | 値 | ほかの props |
| --- | --- | --- |
| `GaugeCheckbox` | `checked` / `onChange(checked: boolean)` | `label`, `name`, `value`, `disabled` |
| `ConsentBattle` | `onChange(choice: "accept" \| "reject")`（決着時） | `message`, `detailsHref`, `detailsLabel` |
| `FibonacciStepper` | `value` / `onChange(value: number)` | `min`, `max`, `label`, `disabled` |
| `SafeDial` | `value` / `onChange(value: string)` | `reverse`, `maxLength`, `label`, `disabled` |
| `PasswordBoss` | `password: string` | `onDefeat()`（強度 100 で呼ばれる）, `name`, `rules`（倒すための条件のリスト。すべて満たすまで倒れない） |
| `EpochDatePicker` | `value` / `onChange(value: string)`（`YYYY-MM-DD`） | `label`, `disabled` |
| `PhilosophicalCaptcha` | `value` / `onChange(verified: boolean)` | `level`, `questions` |
| `DvdModal` | `open` / `onClose()` | `title`, `children`, `closeOnEscape`（既定は `true`） |
| `BuzzWireToggle` | `checked` / `onChange(checked: boolean)` | `label`, `disabled` |

### 日本語と英語

表示文言は日本語と英語に対応しています。`LocaleProvider` で囲むと、配下のコンポーネントの文言が切り替わります（既定は日本語）。

```tsx
import { LocaleProvider } from "rogue-components";

<LocaleProvider locale="en">{/* ... */}</LocaleProvider>
```

## 導入について

まだ npm には公開していません。使う場合は `packages/components/src` をプロジェクトにコピーしてください。各コンポーネントは自分の CSS を `import` しているので、CSS の import を扱えるバンドラー（Vite、Next.js など）が必要です。React 18 以上で動きます。

## 素材

デモサイトのモンスターの画像は、[Kenney](https://kenney.nl) の [Monster Builder Pack](https://kenney.nl/assets/monster-builder-pack)（CC0）のパーツを組み合わせて作っています。
