import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useMessages } from "../locale";
import "./BurgerMenu.css";

const MESSAGES = {
  ja: {
    label: "メニュー",
    bitesLeft: (n: number) => `あと ${n} 口`,
    chomps: ["もぐっ", "がぶっ", "むしゃっ"],
    eaten: "ごちそうさま！",
  },
  en: {
    label: "Menu",
    bitesLeft: (n: number) => (n === 1 ? "1 more bite" : `${n} more bites`),
    chomps: ["Chomp!", "Munch!", "Nom!"],
    eaten: "That hit the spot!",
  },
};

export interface BurgerMenuItem {
  id: string;
  label: ReactNode;
  /** ラベルの下に出す小さな説明 */
  description?: ReactNode;
  onSelect?: () => void;
  /** 指定するとリンクになり、新しいタブで開く */
  href?: string;
  /** 指定すると、この回数かじって完食するまで onSelect が呼ばれない */
  bites?: number;
  /** ボタンの代わりに置く中身 */
  render?: () => ReactNode;
  /** データを消すなど取り返しのつかない操作。真っ赤なトマトになる */
  danger?: boolean;
  /** 選んでもメニューを閉じない */
  keepOpen?: boolean;
}

export interface BurgerMenuProps {
  items: readonly BurgerMenuItem[];
  /** 開くボタンの読み上げ用の名前 */
  label?: string;
  className?: string;
}

type Phase = "closed" | "open" | "closing";
type Layer = "bun-top" | "patty" | "tomato" | "bun-bottom";
type Filling = "lettuce" | "cheese" | "onion";

const FILLINGS: Filling[] = ["lettuce", "cheese", "onion"];
const CLOSE_MS = 420;
const EATEN_MS = 520;

/** かじった跡の位置。1 口ごとに 1 つずつ増える */
const BITE_SPOTS: [string, string][] = [
  ["calc(100% + 6px)", "55%"],
  ["-6px", "50%"],
  ["70%", "-4px"],
  ["30%", "-4px"],
  ["calc(100% + 2px)", "calc(100% + 4px)"],
];

function hole(x: string, y: string, r: number) {
  return `radial-gradient(circle ${r}px at ${x} ${y}, transparent ${r - 0.5}px, #000 ${r}px)`;
}

/** n 口分の歯形の形に抜くマスク */
function biteMask(n: number): CSSProperties {
  if (n <= 0) return {};
  const layers: string[] = [];
  for (let i = 0; i < Math.min(n, BITE_SPOTS.length); i++) {
    const [x, y] = BITE_SPOTS[i]!;
    layers.push(hole(x, y, 17), hole(`calc(${x} - 15px)`, `calc(${y} + 4px)`, 11), hole(`calc(${x} + 4px)`, `calc(${y} + 16px)`, 11));
  }
  const image = layers.join(", ");
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  } as CSSProperties;
}

function layerOf(item: BurgerMenuItem, index: number, count: number): Layer {
  if (item.danger) return "tomato";
  if (index === 0) return "bun-top";
  if (index === count - 1) return "bun-bottom";
  return "patty";
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

type Entry =
  | { kind: "item"; key: string; item: BurgerMenuItem; layer: Layer }
  | { kind: "filling"; key: string; filling: Filling }
  | { kind: "plate"; key: string };

/**
 * 見た目はふつうのハンバーガーメニュー。開くと本物のバンズや具が 1 枚ずつ落ちてきて積み上がり、それがメニューの項目になる。
 * `danger` を付けた項目はトマトになる。`bites` を付けた項目は、かじって完食しないと選べない。
 */
export function BurgerMenu({ items, label, className }: BurgerMenuProps) {
  const m = useMessages(MESSAGES);
  const [phase, setPhase] = useState<Phase>("closed");
  const [bitten, setBitten] = useState<Record<string, number>>({});
  const [eatenId, setEatenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const panelId = useId();

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const close = (focusTrigger = false) => {
    if (phase !== "open") return;
    if (focusTrigger) triggerRef.current?.focus();
    if (prefersReducedMotion()) {
      setPhase("closed");
      return;
    }
    setPhase("closing");
    later(() => setPhase((p) => (p === "closing" ? "closed" : p)), CLOSE_MS);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  const toggle = () => {
    if (phase === "open") {
      close();
      return;
    }
    setBitten({});
    setEatenId(null);
    setPhase("open");
  };

  // 外側を押すか Escape で閉じる
  useEffect(() => {
    if (phase !== "open") return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current(true);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  const select = (item: BurgerMenuItem) => {
    if (eatenId) return;
    if (item.bites && item.bites > 0) {
      const next = (bitten[item.id] ?? 0) + 1;
      setBitten((b) => ({ ...b, [item.id]: next }));
      if (next < item.bites) return;
      setEatenId(item.id);
      later(
        () => {
          item.onSelect?.();
          setPhase("closed");
        },
        prefersReducedMotion() ? 0 : EATEN_MS,
      );
      return;
    }
    item.onSelect?.();
    if (!item.keepOpen) close();
  };

  const entries: Entry[] = [];
  items.forEach((item, i) => {
    entries.push({ kind: "item", key: `item-${item.id}`, item, layer: layerOf(item, i, items.length) });
    if (i < items.length - 1) entries.push({ kind: "filling", key: `filling-${i}`, filling: FILLINGS[i % FILLINGS.length]! });
  });
  entries.push({ kind: "plate", key: "plate" });

  const renderItem = (item: BurgerMenuItem) => {
    if (item.render) return <div className="rc-bm__custom">{item.render()}</div>;

    const count = bitten[item.id] ?? 0;
    const hint =
      item.bites && count > 0
        ? eatenId === item.id
          ? m.eaten
          : m.bitesLeft(item.bites - count)
        : item.description;
    const inner = (
      <>
        <span className="rc-bm__label">{item.label}</span>
        {hint && <span className="rc-bm__hint">{hint}</span>}
      </>
    );

    if (item.href) {
      return (
        <a
          className="rc-bm__action"
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            item.onSelect?.();
            close();
          }}
        >
          {inner}
        </a>
      );
    }
    return (
      <button type="button" className="rc-bm__action" onClick={() => select(item)}>
        {inner}
      </button>
    );
  };

  const last = entries.length - 1;

  return (
    <div
      ref={rootRef}
      className={["rc-bm", className].filter(Boolean).join(" ")}
      data-phase={phase}
    >
      <button
        ref={triggerRef}
        type="button"
        className="rc-bm__trigger"
        aria-label={label ?? m.label}
        aria-expanded={phase === "open"}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="rc-bm__icon" aria-hidden="true">
          <span className="rc-bm__bar rc-bm__bar--top" />
          <span className="rc-bm__bar rc-bm__bar--mid" />
          <span className="rc-bm__bar rc-bm__bar--bottom" />
        </span>
      </button>

      {phase !== "closed" && (
        <ul id={panelId} className="rc-bm__stack" aria-label={label ?? m.label}>
          {entries.map((entry, idx) => {
            // 開くときは下の具から先に落ち、閉じるときは上の具から先に戻る
            const style = { "--pos": idx, "--from-bottom": last - idx } as CSSProperties;
            if (entry.kind === "plate") {
              return <li key={entry.key} className="rc-bm__layer rc-bm__plate" style={style} aria-hidden="true" />;
            }
            if (entry.kind === "filling") {
              return (
                <li
                  key={entry.key}
                  className={`rc-bm__layer rc-bm__filling rc-bm__filling--${entry.filling}`}
                  style={style}
                  aria-hidden="true"
                />
              );
            }
            const { item, layer } = entry;
            const count = bitten[item.id] ?? 0;
            return (
              <li
                key={entry.key}
                className={`rc-bm__layer rc-bm__item rc-bm__item--${layer}`}
                style={style}
                data-eaten={eatenId === item.id || undefined}
              >
                <div className="rc-bm__food" style={biteMask(eatenId === item.id ? 0 : count)}>
                  {renderItem(item)}
                </div>
                {count > 0 && (
                  <span key={count} className="rc-bm__chomp" aria-hidden="true">
                    {eatenId === item.id ? m.eaten : m.chomps[(count - 1) % m.chomps.length]}
                  </span>
                )}
                {count > 0 && (
                  <span key={`crumbs-${count}`} className="rc-bm__crumbs" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, k) => (
                      <span
                        key={k}
                        className="rc-bm__crumb"
                        style={{ "--dx": `${(k - 2.5) * 14}px`, "--dy": `${18 + (k % 3) * 12}px` } as CSSProperties}
                      />
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
