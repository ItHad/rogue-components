# Rogue Components

入力ひとつに全力をかける、最強の React コンポーネント集です。
`value` / `onChange` で扱えるふつうの React コンポーネントで、制御・非制御のどちらでも使えます。
サイト：https://gacha.rogue-components.workers.dev/

## コンポーネント

| コンポーネント | 見た目 | 触ると |
| --- | --- | --- |
| `GaugeCheckbox` | 同意のチェックボックス | 連打でゲージを満タンにしないとチェックが入らない。チェック後も維持費の支払いが求められる |
| `ConsentBattle` | 同意バナー | 「同意」と「拒否」が戦い始める。押した側が相手を攻撃する |
| `FibonacciStepper` | 数値のステッパー | ＋はフィボナッチ数、−は素数ずつ動く |
| `SafeDial` | パスワード欄 | 金庫のダイヤルを回して 1 文字ずつ入力する |
| `PasswordBoss` | パスワード強度メーター | 強度メーターがボスの体力ゲージになる |
| `EpochDatePicker` | 日付欄 | 1970/01/01 から 1 日ずつしか動かない。長押しで加速し、離しても惰性で進む。逆の矢印でブレーキ。加速しすぎると過熱する |
| `PhilosophicalCaptcha` | 「私はロボットではありません」 | 人間であることを哲学的な問いで証明させられる |
| `DvdModal` | モーダル | 閉じる × にカーソルを合わせると、DVD のロゴのように跳ね回り始める。跳ね回る × に当てられれば閉じる |
| `BuzzWireToggle` | トグルスイッチ | オンにしようとすると溝が迷路のように伸びる。スイッチの丸を壁に触れずにゴールまで運ばないとオンにならず、壁に触れると縮んで元に戻る |
| `SmugShareButton` | 共有ボタン | ちゃんと共有できるが、文面の最後に自分を褒める一言を勝手に書き足す。プレビューで消せるが、消すとしょんぼりする |
| `BurgerMenu` | ハンバーガーメニュー | 開くと本物のバンズや具が落ちてきて積み上がり、それがメニューになる。`danger` の項目は真っ赤なトマトになり、`bites` を付けた項目はかじって完食しないと選べない |
| `RiggedRating` | 「このアプリを評価してください ★★★★★」 | ★1〜★4 はカーソルや指が近づくと悲鳴を上げて逃げ回り、絶対に押せない。押せるのは ★5 だけ |
| `GroupPhoto` | 集合写真のカメラ | 被写体が枠のまわりをうろちょろしている。全員をドラッグで枠に入れてから撮らないと「もう一回」になる。枠に入れた被写体も、しばらくすると飽きて出ていく。撮れた写真は PNG で保存できる |
| `BellowsAccordion` | › の付いたアコーディオンの見出し | 押しても「アコーディオンなんだから、ひっぱらないと」と言われて開かない。› をつかんで右へ引っぱると、見出しとの間に蛇腹が広がって中身が見える。空気が抜け続けるので、引っぱり続けないと閉じてしまう |

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
| `EpochDatePicker` | `value` / `onChange(value: string)`（`YYYY-MM-DD`） | `label`, `maxSpeed`（長押しの最高速度・日/秒）, `disabled` |
| `PhilosophicalCaptcha` | `value` / `onChange(verified: boolean)` | `level`, `questions` |
| `DvdModal` | `open` / `onClose()` | `title`, `children`, `closeOnEscape`（既定は `true`）, `gearUp`（`true` で × が「そろそろギア上げてくよ」と宣言し、速く枠の外まで跳ね回る。15 秒ほどで「疲れてきた...」と言って元の速さまで段々遅くなる） |
| `BuzzWireToggle` | `checked` / `onChange(checked: boolean)` | `label`, `disabled` |
| `SmugShareButton` | `text: string` / `onShare(target: "x" \| "native" \| "copy", text: string)` | `url`, `hashtags`, `brags`（書き足す一言の候補）, `label`, `disabled` |
| `BurgerMenu` | `items`（`id`, `label`, `onSelect`, `href`, `bites`, `danger`, `keepOpen`, `render` を持つ項目のリスト。上から順に上のバンズ、パティ、下のバンズになる） | `label` |
| `RiggedRating` | `value` / `onChange(stars: number)`（押せるのは 5 だけ） | `label` |
| `BellowsAccordion` | `children`（蛇腹を広げると見える中身） | `label` |
| `GroupPhoto` | `subjects`（`id`・`label`・`src`・`restless`）/ `onSuccess()` | `caption`・`fileName`・`children`（撮れたあとに写真の下に出す） |

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
