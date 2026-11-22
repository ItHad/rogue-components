import { ITEMS, SECRET_ITEMS } from "../gacha/items";
import { useI18n } from "../i18n";
import { ItemCard } from "../ui/ItemCard";

interface CollectionViewProps {
  owned: Record<string, number>;
}

export function CollectionView({ owned }: CollectionViewProps) {
  const { t } = useI18n();
  const found = ITEMS.filter((i) => (owned[i.id] ?? 0) > 0).length;

  return (
    <section className="page">
      <h1 className="page__title">{t.collection.title}</h1>
      <p className="page__lead">
        {t.collection.lead(found, ITEMS.length)}
      </p>
      <div className="collection">
        {ITEMS.map((item) =>
          (owned[item.id] ?? 0) > 0 ? (
            <ItemCard key={item.id} item={item} count={owned[item.id]} />
          ) : (
            <article key={item.id} className="item-card item-card--unknown">
              <span className="item-card__icon" aria-hidden="true">
                ？
              </span>
              <h3 className="item-card__name">{t.collection.unknown}</h3>
            </article>
          ),
        )}
        {/* シークレットは手に入れるまで枠も出さない */}
        {SECRET_ITEMS.filter((i) => (owned[i.id] ?? 0) > 0).map((item) => (
          <ItemCard key={item.id} item={item} count={owned[item.id]} />
        ))}
      </div>
    </section>
  );
}
