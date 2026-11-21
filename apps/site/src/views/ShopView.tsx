import { useState } from "react";
import { FibonacciStepper } from "rogue-components";
import { useI18n } from "../i18n";

interface ShopViewProps {
  onCharge: (amount: number) => Promise<boolean>;
}

const UNIT = 100;

export function ShopView({ onCharge }: ShopViewProps) {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState(0);
  const [message, setMessage] = useState("");

  const buy = async () => {
    const amount = quantity * UNIT;
    if (await onCharge(amount)) {
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
          <FibonacciStepper label={t.shop.quantity} value={quantity} onChange={setQuantity} max={999} />
          <p className="product__total">
            {t.shop.total} <strong>◆ {(quantity * UNIT).toLocaleString()}</strong>
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
