import type { Locale } from "rogue-components";

export type Rarity = "N" | "R" | "SR" | "SSR";

export interface Item {
  id: string;
  name: Record<Locale, string>;
  rarity: Rarity;
  flavor: Record<Locale, string>;
}

export const RARITY_RATE: Record<Rarity, number> = {
  N: 60,
  R: 30,
  SR: 8.5,
  SSR: 1.5,
};

export const RARITY_ORDER: readonly Rarity[] = ["N", "R", "SR", "SSR"];

/** 画像は public/monsters/<id>.png (Kenney の Monster Builder Pack のパーツから作ったもの) */
export const ITEMS: readonly Item[] = [
  {
    id: "puni", rarity: "N",
    name: { ja: "ぷにかく", en: "Puni Cube" },
    flavor: { ja: "角がある。でも痛くない。", en: "Has corners. Doesn't hurt." }
  },
  {
    id: "mochi", rarity: "N",
    name: { ja: "もちもっち", en: "Mochimocchi" },
    flavor: { ja: "つきたて。さわると指が沈む。", en: "Freshly pounded. Your finger sinks right in." }
  },
  {
    id: "kobaru", rarity: "N",
    name: { ja: "ひとめくん", en: "Hitome" },
    flavor: { ja: "目はひとつだが、見落としはしない。", en: "Only one eye, but it never misses a thing." }
  },
  {
    id: "nemuri", rarity: "N",
    name: { ja: "ねむりん", en: "Nemurin" },
    flavor: { ja: "いつも月曜の朝の顔をしている。", en: "Always wears its Monday-morning face." }
  },
  {
    id: "dorodoro", rarity: "N",
    name: { ja: "どろんこ", en: "Mudling" },
    flavor: { ja: "お風呂がきらい。", en: "Hates baths." }
  },
  {
    id: "kurin", rarity: "N",
    name: { ja: "くりくり", en: "Kurikuri" },
    flavor: { ja: "目がボタンでできている。", en: "Its eyes are made of buttons." }
  },
  {
    id: "tsunotsuno", rarity: "R",
    name: { ja: "ツノピン", en: "Hornpin" },
    flavor: { ja: "腕だけ借り物。", en: "Only the arms are borrowed." }
  },
  {
    id: "mimimi", rarity: "R",
    name: { ja: "みつめ", en: "Mitsume" },
    flavor: { ja: "3 つめの目で空気を読む。", en: "Reads the room with its third eye." }
  },
  {
    id: "hakase", rarity: "R",
    name: { ja: "のびめ博士", en: "Dr. Stalkeye" },
    flavor: { ja: "長い目で物事を見る。", en: "Always takes the long view." }
  },
  {
    id: "gerogero", rarity: "R",
    name: { ja: "ゲロゲーロ", en: "Croakmore" },
    flavor: { ja: "鳴き声は 1 オクターブ低い。", en: "Croaks one octave lower." }
  },
  {
    id: "kirikiri", rarity: "SR",
    name: { ja: "キリキリ", en: "Kirikiri" },
    flavor: { ja: "いつも何かに怒っている。たぶん締め切り。", en: "Always angry about something. Probably a deadline." }
  },
  {
    id: "gogogo", rarity: "SR",
    name: { ja: "ゴゴゴ", en: "Rumblor" },
    flavor: { ja: "登場するときに地鳴りがする。", en: "The ground rumbles whenever it shows up." }
  },
  {
    id: "medamaru", rarity: "SR",
    name: { ja: "めだまる", en: "Eyeball King" },
    flavor: { ja: "目が 7 つある。全部ちがう方向を見ている。", en: "Has seven eyes, each looking a different way." }
  },
  {
    id: "daimaou", rarity: "SSR",
    name: { ja: "大魔王ガチャラ", en: "Gacharoth the Overlord" },
    flavor: { ja: "ガチャの底に住む魔王。引いた人の財布を見ている。", en: "The overlord at the bottom of the gacha. It is watching your wallet." }
  },
  {
    id: "nijiiro", rarity: "SSR",
    name: { ja: "にじいろキメラ", en: "Rainbow Chimera" },
    flavor: { ja: "いろんなモンスターの良いところを集めた。性格以外。", en: "Made from the best parts of many monsters. Except the personality." }
  },
];

const ITEMS_BY_RARITY: Record<Rarity, Item[]> = {
  N: ITEMS.filter((i) => i.rarity === "N"),
  R: ITEMS.filter((i) => i.rarity === "R"),
  SR: ITEMS.filter((i) => i.rarity === "SR"),
  SSR: ITEMS.filter((i) => i.rarity === "SSR"),
};

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

/** レアリティを排出率で決めてから、その中で 1 つを等確率で選ぶ。 */
export function roll(): Item {
  const total = RARITY_ORDER.reduce((sum, r) => sum + RARITY_RATE[r], 0);
  let n = Math.random() * total;
  for (const rarity of RARITY_ORDER) {
    n -= RARITY_RATE[rarity];
    if (n < 0) return pick(ITEMS_BY_RARITY[rarity]);
  }
  return pick(ITEMS_BY_RARITY.N);
}

export function highestRarity(items: readonly Item[]): Rarity {
  return items.reduce<Rarity>(
    (best, i) => (RARITY_ORDER.indexOf(i.rarity) > RARITY_ORDER.indexOf(best) ? i.rarity : best),
    "N",
  );
}
