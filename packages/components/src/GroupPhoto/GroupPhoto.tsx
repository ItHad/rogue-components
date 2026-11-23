import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { capturePointer } from "../capturePointer";
import { useMessages } from "../locale";
import "./GroupPhoto.css";

const MESSAGES = {
  ja: {
    lineup: "みんな並んでいます。撮影ボタンを押してください",
    hint: "みんなをドラッグして、枠の中に入れてください",
    inFrame: (n: number, total: number) => `枠の中 ${n} / ${total}`,
    shutter: "撮影する",
    cheese: "はい、チーズ！",
    missed: (names: string[], rest: number) =>
      `${names.join("、")}${rest > 0 ? ` ほか ${rest} 体` : ""}が写っていません。`,
    retry: "もう一回",
    done: "みんな写りました！",
    restless: "新入り",
    save: "写真を保存",
    saved: "保存しました",
  },
  en: {
    lineup: "Everyone is lined up. Press the shutter",
    hint: "Drag everyone into the frame",
    inFrame: (n: number, total: number) => `In frame: ${n} / ${total}`,
    shutter: "Take the photo",
    cheese: "Say cheese!",
    missed: (names: string[], rest: number) =>
      `${names.join(", ")}${rest > 0 ? ` and ${rest} more` : ""} didn't make it into the photo.`,
    retry: "One more time",
    done: "Everyone made it in!",
    restless: "New",
    save: "Save the photo",
    saved: "Saved",
  },
};

export interface GroupPhotoSubject {
  id: string;
  /** 読み上げと、写っていなかったときの名前 */
  label: string;
  /** 画像の URL (保存するときに描き込むので、同じオリジンのもの) */
  src: string;
  /** 落ち着きがなく、速く動き回ってすぐ枠から出ていく */
  restless?: boolean;
}

export interface GroupPhotoProps {
  subjects: GroupPhotoSubject[];
  /** 全員が枠に収まった写真が撮れたとき */
  onSuccess?: () => void;
  /** 写真の下の余白に書く文字 */
  caption?: string;
  /** 保存するときのファイル名 */
  fileName?: string;
  /** 撮れたあと、写真の下に出す中身 */
  children?: ReactNode;
  className?: string;
}

type Phase = "live" | "countdown" | "missed" | "done";
/** lined: 最初に整列している / scatter: 最初のカウントダウンで枠の外へ逃げ出している */
type Mode = "lined" | "scatter" | "roam" | "pose" | "held";

interface Body {
  x: number;
  y: number;
  heading: number;
  turnAt: number;
  mode: Mode;
  /** pose のとき、飽きて動き出す時刻 */
  leaveAt: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Shot {
  /** 枠の縦横比 (幅 / 高さ) */
  ratio: number;
  /** 枠の幅に対するモンスターの大きさ */
  size: number;
  /** 枠の中での位置 (0〜1) */
  spots: { id: string; x: number; y: number }[];
}

const FRAME_W = 0.6;
const FRAME_H = 0.62;
/** 枠の線からこれだけ (大きさに対する割合) はみ出しても写っていることにする */
const TOLERANCE = 0.2;
/** 動き回る速さ (舞台の幅に対する毎秒の割合) */
const ROAM_SPEED = 0.07;
const RESTLESS_SPEED = 1.7;
/** 最初のカウントダウンで逃げ出す速さ。数え終わる前に全員が枠から出きる */
const SCATTER_SPEED = 0.4;
/** 枠に入れてからじっとしている時間 */
const PATIENCE_MS = [10000, 18000] as const;
const RESTLESS_PATIENCE_MS = [3500, 6000] as const;
/** 動き出す前にそわそわする時間 */
const FIDGET_MS = 1200;
const COUNTDOWN = 3;
const FLASH_MS = 450;

function between([lo, hi]: readonly [number, number]) {
  return lo + Math.random() * (hi - lo);
}

function frameOf(width: number, height: number): Rect {
  const fw = width * FRAME_W;
  const fh = height * FRAME_H;
  const left = (width - fw) / 2;
  const top = (height - fh) / 2;
  return { left, top, right: left + fw, bottom: top + fh };
}

function sizeOf(width: number) {
  return Math.min(52, Math.max(30, width / 10));
}

function inFrame(b: Body, frame: Rect, size: number) {
  const half = size / 2 - size * TOLERANCE;
  return (
    b.x - half >= frame.left && b.x + half <= frame.right && b.y - half >= frame.top && b.y + half <= frame.bottom
  );
}

function touchesFrame(x: number, y: number, frame: Rect, size: number) {
  const half = size / 2;
  return x + half > frame.left && x - half < frame.right && y + half > frame.top && y - half < frame.bottom;
}

/** 枠の中に整列したときの i 番目の位置 */
function lineupPoint(i: number, n: number, width: number, height: number) {
  const frame = frameOf(width, height);
  const fw = frame.right - frame.left;
  const fh = frame.bottom - frame.top;
  const cols = Math.max(1, Math.ceil(Math.sqrt((n * fw) / fh)));
  const rows = Math.ceil(n / cols);
  const row = Math.floor(i / cols);
  const inRow = row === rows - 1 ? n - row * cols : cols;
  const col = i % cols;
  const margin = sizeOf(width) * (0.5 - TOLERANCE) + 1;
  const x = frame.left + ((col + 0.5 + (cols - inRow) / 2) * fw) / cols;
  const y = frame.top + ((row + 0.5) * fh) / rows;
  return {
    x: Math.min(frame.right - margin, Math.max(frame.left + margin, x)),
    y: Math.min(frame.bottom - margin, Math.max(frame.top + margin, y)),
  };
}

/** 枠の外のどこか */
function outsidePoint(width: number, height: number, size: number) {
  const frame = frameOf(width, height);
  const half = size / 2;
  let p = { x: half, y: half };
  for (let i = 0; i < 60; i++) {
    p = { x: half + Math.random() * (width - size), y: half + Math.random() * (height - size) };
    if (!touchesFrame(p.x, p.y, frame, size)) break;
  }
  return p;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * 集合写真を撮るカメラ。枠のまわりを被写体がうろちょろしていて、全員をドラッグで枠に入れてから撮らないと「もう一回」になる。
 * 枠に入れた被写体もしばらくすると飽きて出ていく。
 * 最初はみんな枠の中に整列しているが、最初のカウントダウンで一斉に逃げ出すので、最初の 1 枚は必ず撮り直しになる。
 * 2 回目からは撮影ボタンが画面の上をぐるぐる回る。
 */
export function GroupPhoto({ subjects, onSuccess, caption, fileName = "group-photo.png", children, className }: GroupPhotoProps) {
  const m = useMessages(MESSAGES);
  const stageRef = useRef<HTMLDivElement>(null);
  const size = useRef({ width: 600, height: 450 });
  const bodies = useRef<Map<string, Body>>(new Map());
  const held = useRef<{ id: string; pointerId: number; dx: number; dy: number } | null>(null);
  const pausedAt = useRef<number | null>(null);
  const [, setFrame] = useState(0);
  const [phase, setPhase] = useState<Phase>("live");
  const [count, setCount] = useState(COUNTDOWN);
  const [missing, setMissing] = useState<string[]>([]);
  const [flash, setFlash] = useState(0);
  const [shot, setShot] = useState<Shot | null>(null);
  const [saved, setSaved] = useState(false);
  /** 最初のカウントダウンが始まったか */
  const [started, setStarted] = useState(false);
  /** シャッターを切った回数 */
  const [attempts, setAttempts] = useState(0);
  /** 撮影ボタンが画面の上を逃げ回っているか */
  const [dodging, setDodging] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  const subjectsRef = useRef(subjects);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    subjectsRef.current = subjects;
  }, [onSuccess, subjects]);

  const speedOf = (s: GroupPhotoSubject) => size.current.width * ROAM_SPEED * (s.restless ? RESTLESS_SPEED : 1);

  // 被写体が増えたら枠の外に置く。舞台の大きさが変わったら位置を引き伸ばす
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const prev = size.current;
      const next = { width: el.clientWidth, height: el.clientHeight };
      if (next.width === 0 || next.height === 0) return;
      for (const b of bodies.current.values()) {
        b.x *= next.width / prev.width;
        b.y *= next.height / prev.height;
      }
      size.current = next;
      setFrame((f) => f + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height } = size.current;
  const now0 = performance.now();
  subjects.forEach((s, i) => {
    if (bodies.current.has(s.id)) return;
    const p = started ? outsidePoint(width, height, sizeOf(width)) : lineupPoint(i, subjects.length, width, height);
    bodies.current.set(s.id, {
      ...p,
      heading: Math.random() * Math.PI * 2,
      turnAt: now0 + Math.random() * 1000,
      mode: started ? "roam" : "lined",
      leaveAt: 0,
    });
  });

  const moving = started && (phase === "live" || phase === "countdown");

  useEffect(() => {
    if (!moving) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { width: w, height: h } = size.current;
      const s = sizeOf(w);
      const half = s / 2;
      const frame = frameOf(w, h);
      for (const subject of subjectsRef.current) {
        const b = bodies.current.get(subject.id);
        if (!b || b.mode === "held" || b.mode === "lined") continue;
        if (b.mode === "scatter" && !touchesFrame(b.x, b.y, frame, s)) {
          b.mode = "roam";
          b.turnAt = now + 300 + Math.random() * 800;
        }
        if (b.mode === "pose") {
          if (now < b.leaveAt) continue;
          // 飽きたら枠の外へ向かって歩き出す
          const cx = (frame.left + frame.right) / 2;
          const cy = (frame.top + frame.bottom) / 2;
          b.heading = Math.atan2(b.y - cy, b.x - cx) + (Math.random() - 0.5);
          b.turnAt = now + 1500;
          b.mode = "roam";
        }
        if (b.mode === "roam" && now >= b.turnAt) {
          b.heading += (Math.random() - 0.5) * 2.4;
          b.turnAt = now + 500 + Math.random() * 1100;
        }
        const v = b.mode === "scatter" ? Math.max(speedOf(subject), w * SCATTER_SPEED) : speedOf(subject);
        let x = b.x + Math.cos(b.heading) * v * dt;
        let y = b.y + Math.sin(b.heading) * v * dt;
        if (x < half || x > w - half) {
          b.heading = Math.PI - b.heading;
          x = Math.min(w - half, Math.max(half, x));
        }
        if (y < half || y > h - half) {
          b.heading = -b.heading;
          y = Math.min(h - half, Math.max(half, y));
        }
        b.x = x;
        b.y = y;
      }
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moving]);

  const shoot = () => {
    const { width: w, height: h } = size.current;
    const s = sizeOf(w);
    const frame = frameOf(w, h);
    held.current = null;
    for (const b of bodies.current.values()) if (b.mode === "held" || b.mode === "scatter") b.mode = "roam";
    setFlash((n) => n + 1);
    const out = subjects.filter((sub) => {
      const b = bodies.current.get(sub.id);
      return !b || !inFrame(b, frame, s);
    });
    // 最初の 1 枚は必ず撮り直し。万一みんな枠に入っていても、いちばん端にいた子は写っていないことにする
    if (attempts === 0 && out.length === 0 && subjects.length > 0) {
      const cx = (frame.left + frame.right) / 2;
      const cy = (frame.top + frame.bottom) / 2;
      const far = (sub: GroupPhotoSubject) => {
        const b = bodies.current.get(sub.id);
        return b ? Math.hypot(b.x - cx, b.y - cy) : 0;
      };
      out.push(subjects.reduce((a, b) => (far(b) > far(a) ? b : a)));
    }
    setAttempts((n) => n + 1);
    pausedAt.current = performance.now();
    if (out.length > 0) {
      setMissing(out.map((sub) => sub.id));
      setPhase("missed");
      return;
    }
    const fw = frame.right - frame.left;
    const fh = frame.bottom - frame.top;
    setShot({
      ratio: fw / fh,
      size: s / fw,
      spots: subjects.map((sub) => {
        const b = bodies.current.get(sub.id)!;
        return { id: sub.id, x: (b.x - frame.left) / fw, y: (b.y - frame.top) / fh };
      }),
    });
    setPhase("done");
    onSuccessRef.current?.();
  };
  const shootRef = useRef(shoot);
  shootRef.current = shoot;

  // セルフタイマー。数えている間も被写体は動くし、動かせる
  useEffect(() => {
    if (phase !== "countdown") return;
    setCount(COUNTDOWN);
    let n = COUNTDOWN;
    const id = window.setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        return;
      }
      window.clearInterval(id);
      shootRef.current();
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const retry = () => {
    // 止まっていた間のぶん、じっとしていられる時間を延ばす
    if (pausedAt.current !== null) {
      const paused = performance.now() - pausedAt.current;
      for (const b of bodies.current.values()) {
        b.leaveAt += paused;
        b.turnAt += paused;
      }
      pausedAt.current = null;
    }
    setMissing([]);
    setDodging(false);
    setPhase("live");
  };

  const pose = (subject: GroupPhotoSubject, b: Body) => {
    b.mode = "pose";
    b.leaveAt = performance.now() + between(subject.restless ? RESTLESS_PATIENCE_MS : PATIENCE_MS);
  };

  const press = () => {
    // 2 回目からは、最初に押したときは撮らずに逃げ出す
    if (attempts > 0 && !dodging) {
      setDodging(true);
      return;
    }
    if (!started) {
      // 整列していたみんなが、枠の真ん中から外へ向かって一斉に逃げ出す
      const { width: w, height: hh } = size.current;
      const frame = frameOf(w, hh);
      const cx = (frame.left + frame.right) / 2;
      const cy = (frame.top + frame.bottom) / 2;
      for (const b of bodies.current.values()) {
        const away = b.x === cx && b.y === cy ? Math.random() * Math.PI * 2 : Math.atan2(b.y - cy, b.x - cx);
        b.heading = away + (Math.random() - 0.5) * 0.6;
        b.mode = "scatter";
      }
      setStarted(true);
    }
    setPhase("countdown");
  };

  const toLocal = (e: PointerEvent<Element>) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const grab = (subject: GroupPhotoSubject) => (e: PointerEvent<HTMLButtonElement>) => {
    if (!moving || held.current) return;
    const b = bodies.current.get(subject.id);
    if (!b || b.mode === "scatter") return;
    e.preventDefault();
    capturePointer(e);
    const p = toLocal(e);
    held.current = { id: subject.id, pointerId: e.pointerId, dx: b.x - p.x, dy: b.y - p.y };
    b.mode = "held";
  };

  const drag = (e: PointerEvent<HTMLButtonElement>) => {
    const h = held.current;
    if (!h || h.pointerId !== e.pointerId) return;
    const b = bodies.current.get(h.id);
    if (!b) return;
    const { width: w, height: hh } = size.current;
    const half = sizeOf(w) / 2;
    const p = toLocal(e);
    b.x = Math.min(w - half, Math.max(half, p.x + h.dx));
    b.y = Math.min(hh - half, Math.max(half, p.y + h.dy));
  };

  const drop = (subject: GroupPhotoSubject) => (e: PointerEvent<HTMLButtonElement>) => {
    const h = held.current;
    if (!h || h.pointerId !== e.pointerId) return;
    held.current = null;
    const b = bodies.current.get(subject.id);
    if (!b) return;
    const { width: w, height: hh } = size.current;
    if (inFrame(b, frameOf(w, hh), sizeOf(w))) {
      pose(subject, b);
    } else {
      b.mode = "roam";
      b.turnAt = performance.now();
    }
  };

  /** キーボードでは Enter / Space で枠の中のどこかへ連れていく */
  const invite = (subject: GroupPhotoSubject) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!moving || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    const b = bodies.current.get(subject.id);
    if (!b || b.mode === "scatter") return;
    const { width: w, height: hh } = size.current;
    const s = sizeOf(w);
    const frame = frameOf(w, hh);
    b.x = frame.left + s / 2 + Math.random() * (frame.right - frame.left - s);
    b.y = frame.top + s / 2 + Math.random() * (frame.bottom - frame.top - s);
    pose(subject, b);
    setFrame((f) => f + 1);
  };

  const save = async () => {
    if (!shot) return;
    const scale = 2;
    const photoW = 480;
    const photoH = photoW / shot.ratio;
    const pad = 16;
    const bottom = caption ? 56 : pad;
    const canvas = document.createElement("canvas");
    canvas.width = (photoW + pad * 2) * scale;
    canvas.height = (photoH + pad + bottom) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#fbf8f1";
    ctx.fillRect(0, 0, photoW + pad * 2, photoH + pad + bottom);
    const sky = ctx.createLinearGradient(0, pad, 0, pad + photoH);
    sky.addColorStop(0, "#3b3f8f");
    sky.addColorStop(0.65, "#7d6bc4");
    sky.addColorStop(1, "#c79bd8");
    ctx.fillStyle = sky;
    ctx.fillRect(pad, pad, photoW, photoH);
    const images = await Promise.all(subjects.map((s) => loadImage(s.src)));
    const s = shot.size * photoW;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, photoW, photoH);
    ctx.clip();
    for (const spot of [...shot.spots].sort((a, b) => a.y - b.y)) {
      const img = images[subjects.findIndex((sub) => sub.id === spot.id)];
      if (!img) continue;
      ctx.drawImage(img, pad + spot.x * photoW - s / 2, pad + spot.y * photoH - s / 2, s, s);
    }
    ctx.restore();
    if (caption) {
      ctx.fillStyle = "#3a3346";
      ctx.font = '600 18px system-ui, "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(caption, pad + photoW / 2, pad + photoH + bottom / 2, photoW);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true);
  };

  const s = sizeOf(width);
  const frame = frameOf(width, height);
  const now = performance.now();
  let inside = 0;
  for (const sub of subjects) {
    const b = bodies.current.get(sub.id);
    if (b && inFrame(b, frame, s)) inside += 1;
  }
  const missingNames = subjects.filter((sub) => missing.includes(sub.id)).map((sub) => sub.label);

  if (phase === "done" && shot) {
    return (
      <div className={["rc-gp", className].filter(Boolean).join(" ")} data-phase="done">
        <figure className="rc-gp__print">
          <div className="rc-gp__photo" style={{ aspectRatio: shot.ratio } as CSSProperties}>
            {[...shot.spots]
              .sort((a, b) => a.y - b.y)
              .map((spot) => {
                const sub = subjects.find((x) => x.id === spot.id);
                if (!sub) return null;
                return (
                  <img
                    key={spot.id}
                    className="rc-gp__still"
                    src={sub.src}
                    alt=""
                    draggable={false}
                    style={
                      {
                        left: `${spot.x * 100}%`,
                        top: `${spot.y * 100}%`,
                        inlineSize: `${shot.size * 100}%`,
                      } as CSSProperties
                    }
                  />
                );
              })}
          </div>
          {caption && <figcaption className="rc-gp__caption">{caption}</figcaption>}
        </figure>
        <p className="rc-gp__message" role="status">
          {m.done}
        </p>
        <div className="rc-gp__after">
          <button type="button" className="rc-gp__button" onClick={() => void save()}>
            {saved ? m.saved : m.save}
          </button>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={["rc-gp", className].filter(Boolean).join(" ")} data-phase={phase}>
      <div ref={stageRef} className="rc-gp__stage">
        <div
          className="rc-gp__frame"
          style={{
            left: frame.left,
            top: frame.top,
            width: frame.right - frame.left,
            height: frame.bottom - frame.top,
          }}
          aria-hidden="true"
        />
        {subjects.map((sub) => {
          const b = bodies.current.get(sub.id);
          if (!b) return null;
          const fidget = b.mode === "pose" && b.leaveAt - now < FIDGET_MS;
          return (
            <button
              key={sub.id}
              type="button"
              className="rc-gp__subject"
              data-mode={b.mode}
              data-fidget={(moving && fidget) || undefined}
              data-out={missing.includes(sub.id) || undefined}
              data-restless={sub.restless || undefined}
              style={{ left: b.x, top: b.y, width: s, height: s, zIndex: Math.round(b.y) + (b.mode === "held" ? 10000 : 0) }}
              aria-label={sub.label}
              onPointerDown={grab(sub)}
              onPointerMove={drag}
              onPointerUp={drop(sub)}
              onPointerCancel={drop(sub)}
              onKeyDown={invite(sub)}
            >
              <img src={sub.src} alt="" draggable={false} />
              {sub.restless && <span className="rc-gp__tag">{m.restless}</span>}
            </button>
          );
        })}
        {phase === "countdown" && (
          <span key={`count-${count}`} className="rc-gp__count" aria-hidden="true">
            {count}
          </span>
        )}
        {flash > 0 && <span key={`flash-${flash}`} className="rc-gp__flash" aria-hidden="true" style={{ animationDuration: `${FLASH_MS}ms` }} />}
      </div>

      <p className="rc-gp__status">{m.inFrame(inside, subjects.length)}</p>
      <p className="rc-gp__message" aria-live="polite">
        {phase === "missed"
          ? m.missed(missingNames.slice(0, 3), Math.max(0, missingNames.length - 3))
          : phase === "countdown"
            ? m.cheese
            : started
              ? m.hint
              : m.lineup}
      </p>
      <div className="rc-gp__after">
        {phase === "missed" ? (
          <button type="button" className="rc-gp__button" onClick={retry}>
            {m.retry}
          </button>
        ) : (
          // 2 回目からは、押した瞬間に撮影ボタンが画面の上をぐるぐる回り出す。
          // 包みを付け外しするとボタンが作り直されてフォーカスが外れるので、包みは置いたままクラスだけ切り替える
          <span className={dodging ? "rc-gp__orbit" : undefined}>
            <button
              type="button"
              className="rc-gp__button rc-gp__button--shutter"
              disabled={phase === "countdown"}
              onClick={press}
            >
              {m.shutter}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
