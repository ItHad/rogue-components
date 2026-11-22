import type { HoardOption, Locale } from "rogue-components";

// 状態 × 素材 × 品物 の組み合わせで 360 点。似た名前どうしがまぎらわしくなるように選んでいる
const CONDITIONS: Record<Locale, string[]> = {
  ja: ["古びた", "錆びた", "欠けた", "輝く", "呪われた", "ひび割れた"],
  en: ["Old", "Rusty", "Chipped", "Gleaming", "Cursed", "Cracked"],
};
const MATERIALS: Record<Locale, string[]> = {
  ja: ["金の", "銀の", "銅の", "黄金の", "白金の"],
  en: ["Gold", "Silver", "Bronze", "Golden", "Platinum"],
};
const OBJECTS: Record<Locale, string[]> = {
  ja: ["杯", "盃", "冠", "王冠", "指輪", "腕輪", "短剣", "長剣", "盾", "大盾", "鏡", "手鏡"],
  en: ["Cup", "Chalice", "Crown", "Coronet", "Ring", "Bangle", "Dagger", "Longsword", "Shield", "Tower Shield", "Mirror", "Hand Mirror"],
};

/** 財宝の id (`状態-素材-品物` の番号) から名前を作る */
export function treasureName(id: string, locale: Locale): string {
  const [c, m, o] = id.split("-").map(Number) as [number, number, number];
  const sep = locale === "ja" ? "" : " ";
  return [CONDITIONS[locale][c], MATERIALS[locale][m], OBJECTS[locale][o]].join(sep);
}

const IDS: string[] = [];
for (let c = 0; c < CONDITIONS.ja.length; c++) {
  for (let m = 0; m < MATERIALS.ja.length; m++) {
    for (let o = 0; o < OBJECTS.ja.length; o++) IDS.push(`${c}-${m}-${o}`);
  }
}

/** 宝物庫の目録。名前の順に並べる (並びはセレクトの中で少しずつ崩れていく) */
export function treasureOptions(locale: Locale): HoardOption[] {
  return IDS.map((value) => ({ value, label: treasureName(value, locale) })).sort((a, b) =>
    a.label.localeCompare(b.label, locale),
  );
}

export function randomTreasure(except?: string): string {
  let id: string;
  do id = IDS[Math.floor(Math.random() * IDS.length)]!;
  while (id === except);
  return id;
}
