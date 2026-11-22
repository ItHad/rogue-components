/**
 * サイト全体の背景。夕暮れの平原と丘を、遠くのドラゴンが横切っていく。
 * 画面の縦横比が変わっても地平線と丘がずれないよう、空も含めて 1 枚の SVG で描き、下端に合わせて切り抜く。
 * 月とお城は、中央に来るタイトルやガチャマシンと重ならないよう右寄りに置いている。
 * 縦長の画面では景色ごと左へずらし、お城をガチャマシンの右横に見せる (styles.css)。
 */

// 星の位置は毎回同じになるよう、決まった種から作る
const STARS = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 70 }, (_, i) => ({
    x: Math.round(rand() * 1440),
    y: Math.round(rand() * 420),
    r: 0.6 + rand() * 1.1,
    twinkle: i % 4 === 0,
    delay: rand() * 4,
  }));
})();

/** 丸い木のシルエット */
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-3} y={-14} width={6} height={16} />
      <circle cx={0} cy={-26} r={16} />
      <circle cx={-10} cy={-18} r={11} />
      <circle cx={10} cy={-18} r={11} />
    </g>
  );
}

/** とがった針葉樹のシルエット */
function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-3} y={-10} width={6} height={12} />
      <path d="M0 -58 L14 -34 L8 -34 L18 -18 L10 -18 L20 -6 L-20 -6 L-10 -18 L-18 -18 L-8 -34 L-14 -34 Z" />
    </g>
  );
}

/** 手前の林。y は木の根元 (丘の稜線より少し下にして、幹の下端を丘で隠す)。道の通る 650〜770 はあける */
const FRONT_TREES: { x: number; y: number; s: number; pine?: boolean }[] = [
  { x: 30, y: 812, s: 2.4 },
  { x: 95, y: 802, s: 1.9, pine: true },
  { x: 150, y: 795, s: 2.6 },
  { x: 215, y: 791, s: 2.0 },
  { x: 290, y: 789, s: 1.7, pine: true },
  { x: 360, y: 790, s: 2.2 },
  { x: 430, y: 793, s: 1.8 },
  { x: 500, y: 798, s: 2.4, pine: true },
  { x: 565, y: 803, s: 1.9 },
  { x: 625, y: 809, s: 1.6 },
  { x: 795, y: 820, s: 1.8 },
  { x: 855, y: 823, s: 2.3, pine: true },
  { x: 920, y: 824, s: 1.9 },
  { x: 985, y: 823, s: 2.5 },
  { x: 1050, y: 818, s: 2.0, pine: true },
  { x: 1115, y: 811, s: 1.7 },
  { x: 1175, y: 804, s: 2.3 },
  { x: 1240, y: 798, s: 1.9, pine: true },
  { x: 1300, y: 793, s: 2.6 },
  { x: 1365, y: 789, s: 2.0 },
  { x: 1425, y: 787, s: 2.3, pine: true },
];

/** 平原の奥 (手前の丘の稜線) に点々と立つ小さな木 */
const FAR_TREES: { x: number; y: number; s: number; pine?: boolean }[] = [
  { x: 250, y: 690, s: 0.6 },
  { x: 272, y: 692, s: 0.45, pine: true },
  { x: 380, y: 686, s: 0.6 },
  { x: 402, y: 689, s: 0.5 },
  { x: 1140, y: 704, s: 0.55, pine: true },
  { x: 1230, y: 702, s: 0.6 },
  { x: 1255, y: 703, s: 0.5, pine: true },
];

// 丘の形。塗りと、その丘の上を通る道の切り抜きの両方に使う
const FAR_HILL = "M720 660 C 820 576, 1000 548, 1100 566 S 1300 610, 1380 660 Z";
const MID_HILL = "M0 640 C 180 580, 360 584, 520 628 S 820 612, 980 618 S 1300 568, 1440 612 L1440 900 L0 900 Z";
const NEAR_HILL = "M0 724 C 200 664, 420 666, 620 708 S 1000 690, 1200 698 S 1380 676, 1440 690 L1440 900 L0 900 Z";

export function Scenery() {
  return (
    <div className="scenery" aria-hidden="true">
      <svg className="scenery__land" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="900" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0a0b1a" />
            <stop offset="0.35" stopColor="#15193f" />
            <stop offset="0.53" stopColor="#2f2a5e" />
            <stop offset="0.62" stopColor="#6b3f6e" />
            <stop offset="0.7" stopColor="#b8646a" />
          </linearGradient>
          <radialGradient id="sc-moon-glow">
            <stop offset="0" stopColor="#fdf6d8" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fdf6d8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sc-mountain" x1="0" y1="440" x2="0" y2="620" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4a3f7c" />
            <stop offset="1" stopColor="#2a2858" />
          </linearGradient>
          <linearGradient id="sc-hill-mid" x1="0" y1="570" x2="0" y2="760" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2a4a50" />
            <stop offset="1" stopColor="#1a3238" />
          </linearGradient>
          <linearGradient id="sc-hill-near" x1="0" y1="650" x2="0" y2="900" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1f4034" />
            <stop offset="1" stopColor="#132a22" />
          </linearGradient>
          {/* 道は乗っている丘の形で切り抜き、稜線の向こうへ下っていく部分を見えなくする */}
          <clipPath id="sc-on-far">
            <path d={FAR_HILL} />
          </clipPath>
          <clipPath id="sc-on-mid">
            <path d={MID_HILL} />
          </clipPath>
          <clipPath id="sc-on-near">
            <path d={NEAR_HILL} />
          </clipPath>
        </defs>

        <rect width="1440" height="900" fill="url(#sc-sky)" />

        <g className="scenery__stars" fill="#eef0ff">
          {STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              className={s.twinkle ? "scenery__twinkle" : undefined}
              style={s.twinkle ? { animationDelay: `${s.delay.toFixed(2)}s` } : undefined}
            />
          ))}
        </g>

        <g className="scenery__moon">
          <circle cx="1110" cy="150" r="90" fill="url(#sc-moon-glow)" />
          <circle cx="1110" cy="150" r="26" fill="#fdf6d8" />
          <circle cx="1101" cy="144" r="5" fill="#ece3bd" />
          <circle cx="1118" cy="158" r="3.5" fill="#ece3bd" />
        </g>

        {/* 遠くの山々 */}
        <path
          fill="url(#sc-mountain)"
          d="M0 560 L70 520 L140 548 L230 470 L300 520 L360 498 L430 540 L520 478 L600 530 L660 510 L740 552 L820 500 L900 540 L980 486 L1060 530 L1130 505 L1210 545 L1290 470 L1360 520 L1440 500 L1440 700 L0 700 Z"
        />
        <path
          fill="#c9c3ee"
          opacity="0.55"
          d="M230 470 L248 486 L238 484 L226 492 L214 484 Z M520 478 L536 492 L526 490 L516 496 L506 488 Z M980 486 L995 499 L986 497 L976 503 L967 496 Z M1290 470 L1308 486 L1298 484 L1286 492 L1274 484 Z"
        />

        {/* 遠くの丘とお城 */}
        <path fill="#243f4a" d={FAR_HILL} />
        {/*
          道は丘を 1 つ越えるごとに稜線で途切れ、向こうの丘では少し横にずれた位置から細くなって現れる。
          (奥): なだらかな丘の稜線の陰から城門へ
        */}
        <path
          className="scenery__road"
          strokeWidth="5"
          clipPath="url(#sc-on-far)"
          d="M984 650 C 992 612, 1016 596, 1028 582 S 1040 568, 1040 563"
        />
        <g fill="#1c2a40" transform="translate(1000 506)">
          <rect x="0" y="22" width="80" height="34" />
          <rect x="-8" y="8" width="16" height="48" />
          <rect x="72" y="8" width="16" height="48" />
          <rect x="30" y="-6" width="20" height="62" />
          <path d="M-10 8 L0 -10 L10 8 Z M70 8 L80 -10 L90 8 Z M28 -6 L40 -30 L52 -6 Z" />
          <rect x="39" y="-40" width="2" height="12" />
          <path d="M41 -40 L52 -36 L41 -32 Z" fill="#b8646a" />
          {/* 城門 */}
          <path d="M33 56 L33 46 A7 7 0 0 1 47 46 L47 56 Z" fill="#0f1728" />
          <g fill="#fcd34d" opacity="0.85">
            <rect x="37" y="6" width="6" height="8" rx="3" />
            <rect x="-3" y="20" width="5" height="7" rx="2.5" />
            <rect x="77" y="20" width="5" height="7" rx="2.5" />
            <rect x="18" y="32" width="5" height="7" rx="2.5" />
            <rect x="56" y="32" width="5" height="7" rx="2.5" />
          </g>
        </g>

        {/* なだらかな丘 */}
        <path
          fill="url(#sc-hill-mid)"
          d={MID_HILL}
        />

        {/* 道 (中): 手前の丘の稜線の陰から出て、なだらかな丘の稜線で途切れる */}
        <path
          className="scenery__road"
          strokeWidth="10"
          clipPath="url(#sc-on-mid)"
          d="M856 760 C 866 716, 892 690, 902 664 S 922 628, 936 596"
        />

        {/* 手前の平原と、お城へ続く道 */}
        <path
          fill="url(#sc-hill-near)"
          d={NEAR_HILL}
        />
        {/* 道 (手前): 手前の丘の稜線で途切れる */}
        <path
          className="scenery__road"
          strokeWidth="18"
          clipPath="url(#sc-on-near)"
          d="M700 910 C 680 850, 740 820, 756 784 S 768 734, 774 700"
        />

        <g fill="#183a2d">
          {FAR_TREES.map((t) =>
            t.pine ? <Pine key={t.x} x={t.x} y={t.y} s={t.s} /> : <Tree key={t.x} x={t.x} y={t.y} s={t.s} />,
          )}
        </g>

        <path
          fill="#0e211b"
          d="M0 808 C 240 766, 480 776, 720 806 S 1200 786, 1440 774 L1440 900 L0 900 Z"
        />
        <g fill="#0b1a15">
          {FRONT_TREES.map((t) =>
            t.pine ? <Pine key={t.x} x={t.x} y={t.y} s={t.s} /> : <Tree key={t.x} x={t.x} y={t.y} s={t.s} />,
          )}
        </g>
      </svg>

      {/* 遠くを飛ぶドラゴン。横移動・上下のゆれ・羽ばたきを別々の要素で動かす */}
      <div className="scenery__dragon">
        <div className="scenery__dragon-bob">
          <svg viewBox="0 0 120 64" className="scenery__dragon-body">
            <path
              className="scenery__wing scenery__wing--far"
              d="M74 30 C 70 18, 60 6, 40 0 C 45 7, 47 11, 47 15 C 51 13, 55 15, 55 19 C 59 17, 62 21, 62 25 C 65 25, 66 28, 64 30 Z"
            />
            <path d="M4 44 C 14 46, 22 41, 28 37 C 42 43, 64 43, 82 36 C 90 33, 95 30, 100 29 L 106 32 L 114 31 L 109 27 L 114 25 L 104 23 L 101 18 L 98 23 C 92 24, 86 25, 80 27 C 62 23, 40 25, 26 31 C 18 34, 11 40, 4 44 Z M5 44 L -3 39 L -1 48 Z" />
            <path d="M42 39 C 40 43, 36 45, 31 45 L 36 41 Z M66 38 C 64 42, 60 44, 55 44 L 60 40 Z" />
            <path
              className="scenery__wing scenery__wing--near"
              d="M68 31 C 64 16, 50 2, 22 -6 C 30 4, 32 10, 32 14 C 37 12, 42 15, 42 19 C 47 17, 51 21, 51 26 C 54 26, 57 29, 55 31 Z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
