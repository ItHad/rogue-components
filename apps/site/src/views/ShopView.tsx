import { useState } from "react";
import { GEM_PACK } from "../gacha/state";
import { useI18n } from "../i18n";

/** 一度に買えるパック数の上限 */
const MAX_QUANTITY = 999;
const STEPS = [1, 10, 100] as const;

interface ShopViewProps {
  /** 買うパック数を受け取り、チャージできたら true */
  onCharge: (quantity: number) => Promise<boolean>;
}

export function ShopView({ onCharge }: ShopViewProps) {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState(0);
  const [message, setMessage] = useState("");

  const add = (delta: number) => setQuantity((q) => Math.min(MAX_QUANTITY, Math.max(0, q + delta)));

  const buy = async () => {
    const amount = quantity * GEM_PACK;
    if (await onCharge(quantity)) {
      setMessage(t.shop.done(amount.toLocaleString()));
      setQuantity(0);
    }
  };

  return (
    <section className="page">
      <h1 className="page__title">{t.shop.title}</h1>
      <p className="page__lead">{t.shop.lead}</p>

      <article className="product">
        <div className="product__visual" aria-hidden="true">
          ◆
        </div>
        <div className="product__body">
          <h2 className="product__name">{t.shop.product}</h2>
          <p className="product__desc">{t.shop.desc}</p>
          <div className="qty" role="group" aria-labelledby="shop-qty-label">
            <p className="qty__head">
              <span id="shop-qty-label" className="qty__label">
                {t.shop.quantity}
              </span>
              <output className="qty__value" aria-live="polite">
                {quantity.toLocaleString()}
              </output>
            </p>
            <div className="qty__buttons">
              {STEPS.map((n) => (
                <button
                  key={`+${n}`}
                  type="button"
                  className="btn qty__btn"
                  disabled={quantity >= MAX_QUANTITY}
                  aria-label={t.shop.increase(n)}
                  onClick={() => add(n)}
                >
                  +{n}
                </button>
              ))}
              {STEPS.map((n) => (
                <button
                  key={`-${n}`}
                  type="button"
                  className="btn qty__btn"
                  disabled={quantity <= 0}
                  aria-label={t.shop.decrease(n)}
                  onClick={() => add(-n)}
                >
                  −{n}
                </button>
              ))}
            </div>
          </div>
          <p className="product__total">
            {t.shop.total} <strong>◆ {(quantity * GEM_PACK).toLocaleString()}</strong>
          </p>
          <button type="button" className="btn btn--primary btn--big" disabled={quantity === 0} onClick={buy}>
            {t.shop.buy}
          </button>
          {message && (
            <p className="product__done" role="status">
              {message}
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
