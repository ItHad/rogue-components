import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BurgerMenu, SmugShareButton } from "rogue-components";
import { isComplete, roll, type Item } from "./gacha/items";
import { GEM_PACK, PULL_COST, resetEverything, useGameState } from "./gacha/state";
import { DragonTrial } from "./dragon/DragonTrial";
import { SECRET_ITEMS } from "./gacha/items";
import { useGates } from "./gates/useGates";
import { useI18n } from "./i18n";
import { PhotoSession } from "./photo/PhotoSession";
import { Scenery } from "./ui/Scenery";
import { CollectionView } from "./views/CollectionView";
import { GachaView } from "./views/GachaView";
import { ShopView } from "./views/ShopView";

type View = "gacha" | "collection" | "shop";

const NAV: View[] = ["gacha", "collection", "shop"];
const TAB_ICON: Record<View, string> = { gacha: "puni", collection: "hakase", shop: "gogogo" };
const AUTHOR_X = "files3333";

export function App() {
  const { locale, setLocale, t } = useI18n();
  const [view, setView] = useState<View>("gacha");
  const [state, setState] = useGameState();
  const { runGates, gateView } = useGates(state, setState);
  /** 背景のドラゴンが降りてきているときの、降りてくる前の位置 */
  const [dragonFrom, setDragonFrom] = useState<DOMRect | null>(null);
  /** 図鑑の最後の枠を埋めたモンスター。ガチャ結果を閉じたら記念撮影に呼ぶ */
  const [newcomers, setNewcomers] = useState<string[] | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  // タブを移ったら、そのタブのいちばん上から見せる
  const firstView = useRef(true);
  useLayoutEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

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
    // 10 連で最後の 2 体が同時に出ても、そろった 1 回だけ数える
    const after = { ...state.owned };
    for (const item of results) after[item.id] = (after[item.id] ?? 0) + 1;
    if (!isComplete(state.owned) && isComplete(after)) {
      setNewcomers([...new Set(results.filter((i) => !state.owned[i.id]).map((i) => i.id))]);
    }
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

  const go = async (next: View) => {
    if (next === "collection" && !(await runGates("collection"))) return;
    setView(next);
  };

  const charge = async (quantity: number) => {
    if (!(await runGates("charge", { quantity }))) return false;
    setState((s) => ({ ...s, gems: s.gems + quantity * GEM_PACK }));
    return true;
  };

  return (
    <div className="app">
      <Scenery onSummon={setDragonFrom} dragonAway={dragonFrom !== null} />
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
              onClick={() => void go(id)}
            >
              {t.nav[id]}
            </button>
          ))}
        </nav>
        <p className="topbar__gems" aria-label={t.gemsLabel(state.gems)}>
          ◆ {state.gems.toLocaleString()}
        </p>
        <BurgerMenu
          className="topbar__menu"
          label={t.menu.label}
          items={[
            {
              id: "language",
              label: t.switchTo,
              description: t.language,
              keepOpen: true,
              onSelect: () => setLocale(locale === "ja" ? "en" : "ja"),
            },
            {
              id: "share",
              label: t.menu.share,
              render: () => (
                <SmugShareButton
                  className="topbar__menu-share"
                  label={t.menu.share}
                  text={t.menu.shareText}
                  url={window.location.origin}
                  hashtags={[t.collection.shareTag]}
                />
              ),
            },
            {
              id: "reset",
              label: t.menu.reset,
              description: t.menu.resetHint,
              danger: true,
              bites: 3,
              onSelect: () => void resetEverything(),
            },
            {
              id: "author",
              label: t.menu.author,
              description: `@${AUTHOR_X}`,
              href: `https://x.com/${AUTHOR_X}`,
            },
          ]}
        />
      </header>

      <main className="main">
        {view === "gacha" && (
          <GachaView
            gems={state.gems}
            onPull={pull}
            onGoShop={() => setView("shop")}
            onResultClosed={() => newcomers && setPhotoOpen(true)}
          />
        )}
        {view === "collection" && (
          <CollectionView
            owned={state.owned}
            photoTaken={state.photoTaken}
            onPhoto={() => setPhotoOpen(true)}
          />
        )}
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
            onClick={() => void go(id)}
          >
            <img className="tabbar__icon" src={`/monsters/${TAB_ICON[id]}.png`} alt="" width="28" height="28" />
            {t.nav[id]}
          </button>
        ))}
      </nav>

      {gateView}

      {photoOpen && (
        <PhotoSession
          owned={state.owned}
          newcomers={newcomers ?? []}
          onTaken={() => setState((s) => ({ ...s, photoTaken: true }))}
          onClose={() => {
            setPhotoOpen(false);
            setNewcomers(null);
          }}
        />
      )}

      {dragonFrom && (
        <DragonTrial
          from={dragonFrom}
          owned={SECRET_ITEMS.some((i) => (state.owned[i.id] ?? 0) > 0)}
          onReward={(id) => setState((s) => ({ ...s, owned: { ...s.owned, [id]: (s.owned[id] ?? 0) + 1 } }))}
          onClose={() => setDragonFrom(null)}
        />
      )}
    </div>
  );
}
