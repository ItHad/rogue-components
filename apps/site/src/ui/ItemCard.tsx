import type { CSSProperties } from "react";
import type { Item } from "../gacha/items";
import { useI18n } from "../i18n";

interface ItemCardProps {
  item: Item;
  count?: number;
  delay?: number;
}

export function ItemCard({ item, count, delay = 0 }: ItemCardProps) {
  const { locale } = useI18n();
  return (
    <article
      className="item-card"
      data-rarity={item.rarity}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
    >
      <span className={`rarity rarity--${item.rarity}`}>{item.rarity}</span>
      <img className="item-card__icon" src={`/monsters/${item.id}.png`} alt="" />
      <h3 className="item-card__name">{item.name[locale]}</h3>
      <p className="item-card__flavor">{item.flavor[locale]}</p>
      {count !== undefined && <p className="item-card__count">× {count}</p>}
    </article>
  );
}
