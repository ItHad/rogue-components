import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useMessages } from "../locale";
import { useControllable } from "../useControllable";
import "./HoardSelect.css";

const MESSAGES = {
  ja: {
    placeholder: "財宝を選択",
    search: "財宝を探す",
    count: (n: number, total: number) => `${total} 点中 ${n} 点`,
    empty: "そんな財宝はない。",
    inhale: "ドラゴンが息を吸いこんでいる……",
    blow: "フーーーッ！",
    cheat: "ドラゴンはずるを見逃さない。",
  },
  en: {
    placeholder: "Select a treasure",
    search: "Search the hoard",
    count: (n: number, total: number) => `${n} of ${total}`,
    empty: "No such treasure.",
    inhale: "The dragon is drawing a deep breath...",
    blow: "WHOOOOSH!",
    cheat: "The dragon does not tolerate cheating.",
  },
};

export interface HoardOption {
  value: string;
  label: string;
}

export interface HoardSelectProps {
  options: readonly HoardOption[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  /** 検索欄が吹き飛ばされる間隔 (ミリ秒) */
  breathInterval?: number;
  label?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** 吸いこんでから吹くまで */
const INHALE_MS = 1300;
/** 吹いている間 (この間は入力できない) */
const BLOW_MS = 700;
/** 吹き飛ばされた文字が消えるまで */
const FLY_MS = 900;
/** 1 文字が吹き飛ばされる確率 */
const BLOW_CHANCE = 0.7;

type Breath = "calm" | "inhale" | "blow";

interface FlyingChar {
  id: number;
  char: string;
  index: number;
  dx: number;
  dy: number;
  rot: number;
}

/** 近くの数個とだけ入れ替えて、並びを少しだけ崩す */
function jostle(order: readonly number[], chance: number): number[] {
  const next = [...order];
  for (let i = 0; i < next.length - 1; i++) {
    if (Math.random() >= chance) continue;
    const j = Math.min(next.length - 1, i + 1 + Math.floor(Math.random() * 3));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

/**
 * 一見ふつうのセレクトボックス。開くと検索欄つきの長いリストが出てくる。
 * 開くたびに並び順が少しずつ崩れ、開いている間はドラゴンがときどき息を吹いて、検索欄の文字を吹き飛ばす。
 * 貼り付けるとすぐに吹かれる。
 */
export function HoardSelect({
  options,
  value: valueProp,
  defaultValue = null,
  onChange,
  breathInterval = 6500,
  label,
  placeholder,
  disabled = false,
  className,
}: HoardSelectProps) {
  const t = useMessages(MESSAGES);
  const [value, setValue] = useControllable(valueProp, defaultValue, onChange);
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState(() => options.map((_, i) => i));
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [breath, setBreath] = useState<Breath>("calm");
  const [cheated, setCheated] = useState(false);
  const [flying, setFlying] = useState<FlyingChar[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyId = useRef(0);
  const queryRef = useRef(query);
  queryRef.current = query;
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;

  // 選択肢の数が変わったら並びを作り直す (言語の切り替えでは数は変わらないので並びは保たれる)
  useEffect(() => {
    setOrder((o) => (o.length === options.length ? o : options.map((_, i) => i)));
  }, [options]);

  const needle = query.trim().toLowerCase();
  const visible = order.filter((i) => options[i] && options[i]!.label.toLowerCase().includes(needle));
  const selected = options.find((o) => o.value === value);

  const blowAway = () => {
    const input = inputRef.current;
    // 変換中の文字を確定させてから吹き飛ばす
    const hadFocus = document.activeElement === input;
    input?.blur();
    // 確定のタイミングで state が遅れることがあるので、いま見えている文字を吹き飛ばす
    const chars = [...(input?.value ?? queryRef.current)];
    const blown = chars.map(() => Math.random() < BLOW_CHANCE);
    // 1 文字も飛ばないと吹いた意味がないので、最低 1 文字は飛ばす
    if (chars.length > 0 && !blown.includes(true)) blown[Math.floor(Math.random() * chars.length)] = true;
    const kept: string[] = [];
    const gone: FlyingChar[] = [];
    chars.forEach((char, index) => {
      if (blown[index]) {
        gone.push({
          id: ++flyId.current,
          char,
          index,
          dx: 120 + Math.random() * 220,
          dy: -60 + Math.random() * 120,
          rot: -200 + Math.random() * 400,
        });
      } else {
        kept.push(char);
      }
    });
    setQuery(kept.join(""));
    setActive(0);
    setOrder((o) => jostle(o, 0.15));
    if (gone.length > 0) {
      setFlying((f) => [...f, ...gone]);
      const ids = new Set(gone.map((g) => g.id));
      window.setTimeout(() => setFlying((f) => f.filter((g) => !ids.has(g.id))), FLY_MS);
    }
    if (hadFocus) window.setTimeout(() => inputRef.current?.focus(), BLOW_MS);
  };

  // 開いている間の、吸う → 吹く → しばらく静か の繰り返し
  useEffect(() => {
    if (!open) {
      setBreath("calm");
      return;
    }
    let timer: number;
    const calm = () => {
      setBreath("calm");
      timer = window.setTimeout(inhale, Math.max(0, breathInterval - INHALE_MS));
    };
    const inhale = () => {
      setBreath("inhale");
      timer = window.setTimeout(blow, INHALE_MS);
    };
    const blow = () => {
      setBreath("blow");
      blowAway();
      timer = window.setTimeout(calm, BLOW_MS);
    };
    calm();
    return () => window.clearTimeout(timer);
    // blowAway は ref と setState しか使わないので、最初の描画のものを使い続けてよい
  }, [open, breathInterval]);

  // 選ばれている候補が見えるようにスクロールする
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    if (disabled) return;
    setOrder((o) => jostle(o, 0.35));
    setQuery("");
    setActive(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => {
    setOpen(false);
    setCheated(false);
    setFlying([]);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    setValue(option.value);
    close();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    // 貼り付けた文字はいったん入れてから、すぐに吹き飛ばす
    const text = e.clipboardData.getData("text");
    if (!text) return;
    e.preventDefault();
    const next = queryRef.current + text;
    queryRef.current = next;
    setQuery(next);
    setCheated(true);
    window.setTimeout(blowAway, 120);
    window.setTimeout(() => setCheated(false), 120 + BLOW_MS * 2);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      setActive((a) => Math.min(visible.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      const index = visible[active];
      if (index !== undefined) choose(index);
    } else if (e.key === "Escape") {
      close();
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={["rc-hs", className].filter(Boolean).join(" ")}
      data-open={open || undefined}
      data-breath={open ? (cheated ? "blow" : breath) : undefined}
      data-disabled={disabled || undefined}
    >
      {label && (
        <span id={labelId} className="rc-hs__label">
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="rc-hs__trigger"
        aria-labelledby={label ? labelId : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
      >
        <span className="rc-hs__value" data-placeholder={!selected || undefined}>
          {selected ? selected.label : (placeholder ?? t.placeholder)}
        </span>
        <span className="rc-hs__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="rc-hs__panel">
          <div className="rc-hs__search">
            <input
              ref={inputRef}
              className="rc-hs__input"
              type="text"
              role="combobox"
              aria-label={t.search}
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={visible[active] !== undefined ? `${baseId}-o${visible[active]}` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
              placeholder={t.search}
              value={query}
              readOnly={breath === "blow" || cheated}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onPaste={onPaste}
              onKeyDown={onKeyDown}
            />
            <span className="rc-hs__flying" aria-hidden="true">
              {flying.map((f) => (
                <span
                  key={f.id}
                  className="rc-hs__fly"
                  style={
                    {
                      "--i": f.index,
                      "--dx": `${f.dx}px`,
                      "--dy": `${f.dy}px`,
                      "--rot": `${f.rot}deg`,
                    } as CSSProperties
                  }
                >
                  {f.char}
                </span>
              ))}
            </span>
            <span className="rc-hs__gust" aria-hidden="true" />
          </div>
          <p className="rc-hs__status" aria-live="polite">
            {cheated
              ? t.cheat
              : breath === "inhale"
                ? t.inhale
                : breath === "blow"
                  ? t.blow
                  : t.count(visible.length, options.length)}
          </p>
          <ul ref={listRef} id={listId} className="rc-hs__list" role="listbox" aria-label={t.search}>
            {visible.length === 0 && <li className="rc-hs__empty">{t.empty}</li>}
            {visible.map((index, pos) => {
              const option = options[index]!;
              return (
                <li
                  key={option.value}
                  id={`${baseId}-o${index}`}
                  className="rc-hs__option"
                  role="option"
                  aria-selected={option.value === value}
                  data-index={pos}
                  data-active={pos === active || undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(pos)}
                  onClick={() => choose(index)}
                >
                  {option.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
