import type { Locale } from "rogue-components";

export type Rarity = "N" | "R" | "SR" | "SSR";

export interface Item {
  id: string;
  name: Record<Locale, string>;
  icon: string;
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

export const ITEMS: readonly Item[] = [
  {
    id: "pebble", icon: "🪨", rarity: "N",
    name: { ja: "ふつうの小石", en: "An Ordinary Pebble" },
    flavor: { ja: "道で拾った。たぶん星ではない。", en: "Found on the road. Probably not a star." }
  },
  {
    id: "acorn", icon: "🌰", rarity: "N",
    name: { ja: "どんぐり", en: "Acorn" },
    flavor: { ja: "帽子つき。", en: "Comes with a hat." }
  },
  {
    id: "sock", icon: "🧦", rarity: "N",
    name: { ja: "片方の靴下", en: "One Sock" },
    flavor: { ja: "もう片方は宇宙のどこかにある。", en: "The other one is somewhere in space." }
  },
  {
    id: "battery", icon: "🔋", rarity: "N",
    name: { ja: "ボタン電池", en: "Button Battery" },
    flavor: { ja: "残量不明。", en: "Charge unknown." }
  },
  {
    id: "clip", icon: "📎", rarity: "N",
    name: { ja: "ゼムクリップ", en: "Paper Clip" },
    flavor: { ja: "何かを留めていた記憶がある。", en: "It remembers holding something together." }
  },
  {
    id: "pin", icon: "🧷", rarity: "N",
    name: { ja: "安全ピン", en: "Safety Pin" },
    flavor: { ja: "安全とは限らない。", en: "Not necessarily safe." }
  },
  {
    id: "clover", icon: "🍀", rarity: "R",
    name: { ja: "四つ葉のクローバー", en: "Four-Leaf Clover" },
    flavor: { ja: "幸運の在庫あり。", en: "Luck in stock." }
  },
  {
    id: "key", icon: "🗝️", rarity: "R",
    name: { ja: "古い鍵", en: "Old Key" },
    flavor: { ja: "どの扉の鍵かは誰も知らない。", en: "Nobody knows which door it opens." }
  },
  {
    id: "konpeito", icon: "🍬", rarity: "R",
    name: { ja: "金平糖", en: "Konpeito" },
    flavor: { ja: "星の形をしたお菓子。", en: "Star-shaped sugar candy." }
  },
  {
    id: "shell", icon: "🐚", rarity: "R",
    name: { ja: "まき貝", en: "Conch Shell" },
    flavor: { ja: "耳を当てると通知音がする。", en: "Hold it to your ear and you hear notification sounds." }
  },
  {
    id: "shooting-star", icon: "🌠", rarity: "SR",
    name: { ja: "流れ星のしっぽ", en: "Shooting Star's Tail" },
    flavor: { ja: "願い事を 3 回唱える前に消えた。", en: "Gone before I could make three wishes." }
  },
  {
    id: "moon-sand", icon: "🌙", rarity: "SR",
    name: { ja: "月の砂", en: "Moon Sand" },
    flavor: { ja: "持ち帰り禁止のはず。", en: "Pretty sure you're not allowed to take this home." }
  },
  {
    id: "rainbow", icon: "🌈", rarity: "SR",
    name: { ja: "虹のかけら", en: "Rainbow Shard" },
    flavor: { ja: "7 色ぶんの重さがある。", en: "Weighs as much as seven colors." }
  },
  {
    id: "galaxy-seed", icon: "🌌", rarity: "SSR",
    name: { ja: "銀河の種", en: "Galaxy Seed" },
    flavor: { ja: "水をやると 100 億年で芽が出る。", en: "Water it and it sprouts in 10 billion years." }
  },
  {
    id: "dawn", icon: "✨", rarity: "SSR",
    name: { ja: "夜明けのびん詰め", en: "Bottled Dawn" },
    flavor: { ja: "ふたを開けると朝になる。", en: "Open the lid and it becomes morning." }
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
