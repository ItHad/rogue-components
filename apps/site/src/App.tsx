import { useEffect, useRef, useState } from "react";
import { roll, type Item } from "./gacha/items";
import { GEM_PACK, PULL_COST, useGameState } from "./gacha/state";
import { useGates } from "./gates/useGates";
import { useI18n } from "./i18n";
import { CollectionView } from "./views/CollectionView";
import { GachaView } from "./views/GachaView";
import { ShopView } from "./views/ShopView";

type View = "gacha" | "collection" | "shop";

const NAV: View[] = ["gacha", "collection", "shop"];
const TAB_ICON: Record<View, string> = { gacha: "puni", collection: "hakase", shop: "gogogo" };

export function App() {
  const { locale, setLocale, t } = useI18n();
  const [view, setView] = useState<View>("gacha");
  const [state, setState] = useGameState();
  const { runGates, gateView } = useGates(state, setState);

  // Coookie 同意バナー
  const visited = useRef(false);
  useEffect(() => {
    if (visited.current) return;
    visited.current = true;
    void runGates("visit");
  }, [runGates]);

  const pull = async (count: number): Promise<Item[] | null> => {
    if (state.gems < PULL_COST * count) return null;
    if (!(await runGates("pull"))) return null;
    const results = Array.from({ length: count }, roll);
    setState((s) => {
      const owned = { ...s.owned };
      for (const item of results) owned[item.id] = (owned[item.id] ?? 0) + 1;
      return {
        ...s,
        gems: s.gems - PULL_COST * count,
        pulls: s.pulls + count,
        pullsSinceCaptcha: s.pullsSinceCaptcha + 1,
        owned,
      };
    });
    return results;
  };

  const charge = async (quantity: number) => {
    if (!(await runGates("charge", { quantity }))) return false;
    setState((s) => ({ ...s, gems: s.gems + quantity * GEM_PACK }));
    return true;
  };

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="topbar__logo" onClick={() => setView("gacha")}>
          <img className="topbar__logo-icon" src="/monsters/puni.png" alt="" width="28" height="28" />
          <span className="topbar__logo-text">{t.siteName}</span>
        </button>
        <nav className="topbar__nav" aria-label={t.mainNav}>
          {NAV.map((id) => (
            <button
              key={id}
              type="button"
              className="topbar__link"
              aria-current={view === id ? "page" : undefined}
              onClick={() => setView(id)}
            >
              {t.nav[id]}
            </button>
          ))}
        </nav>
        <p className="topbar__gems" aria-label={t.gemsLabel(state.gems)}>
          ◆ {state.gems.toLocaleString()}
        </p>
        <button
          type="button"
          className="topbar__lang"
          aria-label={t.language}
          onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
        >
          {t.switchTo}
        </button>
      </header>

      <main className="main">
        {view === "gacha" && <GachaView gems={state.gems} onPull={pull} onGoShop={() => setView("shop")} />}
        {view === "collection" && <CollectionView owned={state.owned} />}
        {view === "shop" && <ShopView onCharge={charge} />}
      </main>

      <footer className="footer">
        <p>{t.footer}</p>
      </footer>

      {/* スマホではメニューを画面下のタブにする */}
      <nav className="tabbar" aria-label={t.mainNav}>
        {NAV.map((id) => (
          <button
            key={id}
            type="button"
            className="tabbar__tab"
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            <img className="tabbar__icon" src={`/monsters/${TAB_ICON[id]}.png`} alt="" width="28" height="28" />
            {t.nav[id]}
          </button>
        ))}
      </nav>

      {gateView}
    </div>
  );
}
