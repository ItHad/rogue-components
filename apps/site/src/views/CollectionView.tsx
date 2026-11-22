import { SmugShareButton } from "rogue-components";
import { isComplete, ITEMS, SECRET_ITEMS } from "../gacha/items";
import { useI18n } from "../i18n";
import { ItemCard } from "../ui/ItemCard";

interface CollectionViewProps {
  owned: Record<string, number>;
  photoTaken: boolean;
  onPhoto: () => void;
}

export function CollectionView({ owned, photoTaken, onPhoto }: CollectionViewProps) {
  const { t } = useI18n();
  const found = ITEMS.filter((i) => (owned[i.id] ?? 0) > 0).length;
  // シークレットは「全 n 種」に数えず、見つけたときだけ一言添える
  const hatchlings = SECRET_ITEMS.reduce((sum, i) => sum + (owned[i.id] ?? 0), 0);
  const shareText = [
    t.collection.shareText(found, ITEMS.length),
    hatchlings > 0 ? t.collection.shareSecret(hatchlings) : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section className="page">
      <h1 className="page__title">{t.collection.title}</h1>
      <p className="page__lead">
        {t.collection.lead(found, ITEMS.length)}
      </p>
      <SmugShareButton
        className="collection__share"
        label={t.collection.share}
        text={shareText}
        url={window.location.origin}
        hashtags={[t.collection.shareTag]}
      />
      {/* 撮りそびれても、ここから撮れる */}
      {isComplete(owned) && (
        <button type="button" className="btn btn--primary collection__photo" onClick={onPhoto}>
          {photoTaken ? t.photo.again : t.photo.open}
        </button>
      )}
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
