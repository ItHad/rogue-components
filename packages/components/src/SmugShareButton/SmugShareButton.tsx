import { useId, useRef, useState, type ReactNode } from "react";
import { useMessages } from "../locale";
import "./SmugShareButton.css";

const MESSAGES = {
  ja: {
    label: "共有する",
    previewTitle: "投稿のプレビュー",
    postX: "X に投稿",
    native: "ほかのアプリ",
    copy: "コピー",
    copied: "コピーしました",
    close: "閉じる",
    removeBrag: "ボタンの書き足しを消す",
    brags: [
      "※この投稿は優秀な共有ボタンが行いました",
      "#共有ボタンが優秀",
      "（共有ボタンより愛をこめて）",
      "共有ボタンの働きにもご注目ください",
      "#この共有ボタンを褒めてください",
    ],
    faces: {
      idle: "(˘ω˘)",
      smug: "(￣ー￣)ドヤ",
      sad: "(´・ω・｀)",
      proud: "(｀・ω・´)ゞ",
    },
    lines: {
      smug: "ついでに一言、書き足しておきました。",
      sad: "……そうですか。消しておきました。",
      proudWithBrag: "共有しました。私の一言も添えて。",
      proudWithoutBrag: "共有しました。……黙って。",
    },
  },
  en: {
    label: "Share",
    previewTitle: "Post preview",
    postX: "Post on X",
    native: "Other apps",
    copy: "Copy",
    copied: "Copied",
    close: "Close",
    removeBrag: "Remove the button's addition",
    brags: [
      "*This post was made by an excellent share button",
      "#ShareButtonIsGreat",
      "(With love, from the share button)",
      "Please also appreciate the share button's hard work",
      "#PraiseThisShareButton",
    ],
    faces: {
      idle: "(˘ω˘)",
      smug: "(￣ー￣)",
      sad: "(´・ω・｀)",
      proud: "(｀・ω・´)ゞ",
    },
    lines: {
      smug: "I took the liberty of adding a word.",
      sad: "...Fine. I removed it.",
      proudWithBrag: "Shared. With a word from me.",
      proudWithoutBrag: "Shared. ...Quietly.",
    },
  },
};

export type ShareTarget = "x" | "native" | "copy";

export interface SmugShareButtonProps {
  /** 共有する文面 */
  text: string;
  /** 文面に添える URL */
  url?: string;
  /** X に付けるハッシュタグ (# なし) */
  hashtags?: string[];
  /** 共有したときに呼ばれる。`text` はボタンの書き足しを含めた実際の文面 */
  onShare?: (target: ShareTarget, text: string) => void;
  /** ボタンが勝手に書き足す一言の候補。開くたびにこの中から 1 つ選ぶ */
  brags?: string[];
  /** ボタンの文言 */
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

type Mood = "idle" | "smug" | "sad" | "proud";

function pick<T>(list: readonly T[], avoid?: T): T {
  const pool = list.length > 1 ? list.filter((x) => x !== avoid) : list;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/**
 * 共有ボタン。押すとちゃんと共有できるが、文面の最後に自分を褒める一言を勝手に書き足す。
 * 書き足しはプレビューで消せる。消すとしょんぼりする。
 */
export function SmugShareButton({
  text,
  url,
  hashtags,
  onShare,
  brags,
  label,
  disabled = false,
  className,
}: SmugShareButtonProps) {
  const m = useMessages(MESSAGES);
  const bragList = brags && brags.length > 0 ? brags : m.brags;
  const [open, setOpen] = useState(false);
  const [brag, setBrag] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [line, setLine] = useState("");
  const [copied, setCopied] = useState(false);
  const lastBrag = useRef<string | undefined>(undefined);
  const panelId = useId();
  const titleId = useId();

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const fullText = brag ? `${text}\n${brag}` : text;
  // X 以外（共有シート・コピー）では本文の後ろにタグを書き足す
  const tagLine = hashtags && hashtags.length > 0 ? hashtags.map((t) => `#${t}`).join(" ") : "";
  const textWithTags = [fullText, tagLine].filter(Boolean).join("\n");

  const toggle = () => {
    if (open) {
      setOpen(false);
      setMood("idle");
      return;
    }
    // 開くたびに懲りずに書き足す
    const next = pick(bragList, lastBrag.current);
    lastBrag.current = next;
    setBrag(next);
    setMood("smug");
    setLine(m.lines.smug);
    setCopied(false);
    setOpen(true);
  };

  const removeBrag = () => {
    setBrag(null);
    setMood("sad");
    setLine(m.lines.sad);
  };

  const done = (target: ShareTarget) => {
    setMood("proud");
    setLine(brag ? m.lines.proudWithBrag : m.lines.proudWithoutBrag);
    onShare?.(target, fullText);
  };

  const shareX = () => {
    const params = new URLSearchParams({ text: fullText });
    if (url) params.set("url", url);
    if (hashtags && hashtags.length > 0) params.set("hashtags", hashtags.join(","));
    window.open(`https://x.com/intent/tweet?${params}`, "_blank", "noopener,noreferrer");
    done("x");
  };

  const shareNative = async () => {
    try {
      await navigator.share({ text: textWithTags, url });
      done("native");
    } catch {
      // キャンセルされたときは何もしない
    }
  };

  const copy = async () => {
    const body = [textWithTags, url].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      done("copy");
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={["rc-ssb", className].filter(Boolean).join(" ")} data-mood={mood}>
      <button
        type="button"
        className="rc-ssb__button"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="rc-ssb__face" aria-hidden="true">
          {m.faces[mood]}
        </span>
        <span className="rc-ssb__label">{label ?? m.label}</span>
      </button>

      {open && (
        <div id={panelId} className="rc-ssb__panel" role="group" aria-labelledby={titleId}>
          <div className="rc-ssb__head">
            <span id={titleId} className="rc-ssb__title">
              {m.previewTitle}
            </span>
            <button type="button" className="rc-ssb__close" onClick={toggle} aria-label={m.close}>
              ×
            </button>
          </div>

          <div className="rc-ssb__preview">
            <p className="rc-ssb__text">{text}</p>
            {brag && (
              <p className="rc-ssb__brag">
                <span>{brag}</span>
                <button
                  type="button"
                  className="rc-ssb__remove"
                  onClick={removeBrag}
                  aria-label={m.removeBrag}
                >
                  ×
                </button>
              </p>
            )}
            {hashtags && hashtags.length > 0 && (
              <p className="rc-ssb__tags">{hashtags.map((t) => `#${t}`).join(" ")}</p>
            )}
            {url && <p className="rc-ssb__url">{url}</p>}
          </div>

          <p className="rc-ssb__line" aria-live="polite">
            {line}
          </p>

          <div className="rc-ssb__actions">
            <button type="button" className="rc-ssb__action rc-ssb__action--primary" onClick={shareX}>
              {m.postX}
            </button>
            {canNativeShare ? (
              <button type="button" className="rc-ssb__action" onClick={shareNative}>
                {m.native}
              </button>
            ) : (
              <button type="button" className="rc-ssb__action" onClick={copy}>
                {copied ? m.copied : m.copy}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
