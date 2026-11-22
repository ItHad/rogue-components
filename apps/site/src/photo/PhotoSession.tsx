import { useMemo, useState } from "react";
import { GroupPhoto, SmugShareButton, type GroupPhotoSubject } from "rogue-components";
import { ITEMS, SECRET_ITEMS } from "../gacha/items";
import { useI18n } from "../i18n";
import { Modal } from "../ui/Modal";

interface PhotoSessionProps {
  owned: Record<string, number>;
  /** 図鑑の最後の枠を埋めたモンスター。落ち着きがない */
  newcomers: readonly string[];
  onTaken: () => void;
  onClose: () => void;
}

/** 図鑑がそろったら、みんなで記念撮影をする。 */
export function PhotoSession({ owned, newcomers, onTaken, onClose }: PhotoSessionProps) {
  const { locale, t } = useI18n();
  const [taken, setTaken] = useState(false);
  const hatchlings = SECRET_ITEMS.filter((i) => (owned[i.id] ?? 0) > 0);

  const subjects = useMemo<GroupPhotoSubject[]>(
    () =>
      [...ITEMS, ...hatchlings].map((item) => ({
        id: item.id,
        label: item.name[locale],
        src: item.image ?? `/monsters/${item.id}.png`,
        restless: newcomers.includes(item.id),
      })),
    // 撮影中に顔ぶれが変わらないよう、開いたときの顔ぶれで固定する
    [locale],
  );

  const date = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { dateStyle: "medium" }).format(new Date());
  const shareText = [t.photo.shareText(ITEMS.length), hatchlings.length > 0 ? t.photo.shareSecret : null]
    .filter(Boolean)
    .join("\n");

  return (
    <Modal title={taken ? t.photo.doneTitle : t.photo.title} onClose={onClose} wide>
      {!taken && <p className="photo__lead">{newcomers.length > 0 ? t.photo.leadNew : t.photo.lead}</p>}
      <GroupPhoto
        className="photo"
        subjects={subjects}
        caption={t.photo.caption(date)}
        fileName={t.photo.fileName}
        onSuccess={() => {
          setTaken(true);
          onTaken();
        }}
      >
        <SmugShareButton
          className="photo__share"
          label={t.photo.share}
          text={shareText}
          url={window.location.origin}
          hashtags={[t.collection.shareTag]}
        />
        <button type="button" className="btn photo__back" onClick={onClose}>
          {t.photo.back}
        </button>
      </GroupPhoto>
      {taken && hatchlings.length === 0 && <p className="photo__hint">{t.photo.dragonHint}</p>}
    </Modal>
  );
}
