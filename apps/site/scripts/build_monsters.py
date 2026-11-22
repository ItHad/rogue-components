"""Kenney Monster Builder Pack のパーツを組み合わせて、モンスターの PNG を作る。

使い方: python -I build_monsters.py <パーツの PNG フォルダ> <出力フォルダ> [プレビュー画像]
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps

PARTS = Path(sys.argv[1])
OUT = Path(sys.argv[2])
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
SIZE = 400
OUT_SIZE = 256

_cache: dict[str, Image.Image] = {}


def part(name: str) -> Image.Image:
    if name not in _cache:
        _cache[name] = Image.open(PARTS / f"{name}.png").convert("RGBA")
    return _cache[name]


def paste(canvas, im, cx, cy, mirror=False, scale=1.0, rot=0):
    """im の中心を (cx, cy) に置く"""
    if scale != 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    if mirror:
        im = ImageOps.mirror(im)
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    canvas.alpha_composite(im, (round(cx - im.width / 2), round(cy - im.height / 2)))


def paste_joint(canvas, im, jx, jy, mirror=False):
    """腕・脚: 付け根の丸 (画像の左上あたり) を (jx, jy) に合わせて置く"""
    r = min(im.width, 64) * 0.42
    if mirror:
        im = ImageOps.mirror(im)
        x = jx - (im.width - r)
    else:
        x = jx - r
    canvas.alpha_composite(im, (round(x), round(jy - r)))


def build(m: dict) -> Image.Image:
    c = m["color"]
    body = part(f"body_{c}{m['body']}")
    bw, bh = body.size
    canvas = Image.new("RGBA", (SIZE, SIZE + 200), (0, 0, 0, 0))
    cx = SIZE / 2
    top = 150
    bottom = top + bh

    # 後ろ側: 頭のパーツ、脚、腕
    for name, fx, fy, *opt in m.get("head", []):
        img = part(name.replace("$", c))
        sc = opt[0] if opt else 1.0
        rot = opt[1] if len(opt) > 1 else 0
        paste(canvas, img, cx - fx * bw / 2, top + fy * bh, mirror=False, scale=sc, rot=rot)
        paste(canvas, img, cx + fx * bw / 2, top + fy * bh, mirror=True, scale=sc, rot=-rot)
    if m.get("legs"):
        leg = part(f"leg_{c}{m['legs']}")
        lx = m.get("leg_x", 0.28) * bw
        paste_joint(canvas, leg, cx + lx, bottom - 28)
        paste_joint(canvas, leg, cx - lx, bottom - 28, mirror=True)
    if m.get("arms"):
        arm = part(f"arm_{m.get('arm_color', c)}{m['arms']}")
        ay = top + m.get("arm_y", 0.5) * bh
        ax = bw / 2 - 18
        paste_joint(canvas, arm, cx + ax, ay)
        paste_joint(canvas, arm, cx - ax, ay, mirror=True)

    canvas.alpha_composite(body, (round(cx - bw / 2), top))

    # 顔
    for name, fx, fy, *opt in m.get("face", []):
        sc = opt[0] if opt else 1.0
        mirror = opt[1] if len(opt) > 1 else False
        paste(canvas, part(name.replace("$", c)), cx + fx * bw / 2, top + fy * bh, mirror=mirror, scale=sc)

    bbox = canvas.getbbox()
    canvas = canvas.crop(bbox)
    # 正方形に収める
    side = max(canvas.size) + 24
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.alpha_composite(canvas, ((side - canvas.width) // 2, (side - canvas.height) // 2))
    return out.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


EYE2 = lambda name, y=0.38, gap=0.38, sc=1.0: [(name, -gap, y, sc), (name, gap, y, sc, True)]

MONSTERS = [
    # ---- N ----
    {"id": "puni", "color": "green", "body": "A", "legs": "D", "leg_x": 0.22,
     "face": EYE2("eye_cute_light", 0.4, 0.32, 0.8) + [("mouth_closed_happy", 0, 0.68, 0.8)]},
    {"id": "mochi", "color": "white", "body": "B", "legs": "C", "arms": "E", "arm_color": "white",
     "face": EYE2("eye_closed_happy", 0.42, 0.3) + [("mouthG", 0, 0.65, 0.8)]},
    {"id": "kobaru", "color": "yellow", "body": "D", "legs": "B", "arms": "B",
     "face": [("eye_human", 0, 0.36), ("mouthD", 0, 0.66)]},
    {"id": "nemuri", "color": "blue", "body": "A", "legs": "E", "leg_x": 0.2,
     "head": [("detail_$_ear_round", 0.75, 0.08, 0.8)],
     "face": EYE2("eye_closed_feminine", 0.42, 0.34, 0.8) + [("mouth_closed_sad", 0, 0.66), ("snot_small", 0.3, 0.62, 0.8)]},
    {"id": "dorodoro", "color": "dark", "body": "C", "legs": "C", "arms": "A",
     "face": EYE2("eye_yellow", 0.33, 0.3, 0.75) + [("mouthE", 0, 0.62)]},
    {"id": "kurin", "color": "red", "body": "B", "legs": "D", "leg_x": 0.24,
     "head": [("detail_$_antenna_small", 0.3, -0.06)],
     "face": EYE2("eye_blue", 0.4, 0.3, 0.8) + [("mouthA", 0, 0.66, 0.9)]},
    {"id": "hetoheto", "color": "dark", "body": "A", "legs": "D", "leg_x": 0.22,
     "face": EYE2("eye_dead", 0.4, 0.32, 0.8) + [("mouthE", 0, 0.68, 0.8)]},
    {"id": "hamigaki", "color": "white", "body": "C", "legs": "E", "arms": "B", "arm_color": "blue",
     "face": EYE2("eye_human", 0.32, 0.3, 0.75) + [("mouth_closed_teeth", 0, 0.62)]},
    {"id": "piyo", "color": "yellow", "body": "E", "legs": "D", "leg_x": 0.2,
     "head": [("detail_$_antenna_small", 0.25, -0.04, 0.9)],
     "face": EYE2("eye_cute_light", 0.3, 0.42, 0.55) + [("nose_red", 0, 0.46, 0.55), ("mouth_closed_happy", 0, 0.64, 0.6)]},
    # ---- R ----
    {"id": "tsunotsuno", "color": "red", "body": "E", "legs": "A", "arms": "C", "arm_color": "white", "arm_y": 0.45,
     "head": [("detail_$_horn_large", 0.7, 0.02)],
     "face": [("eye_psycho_dark", 0, 0.24, 1.1), ("mouthC", 0, 0.48), ("eyebrowB", 0, 0.12)]},
    {"id": "mimimi", "color": "yellow", "body": "A", "legs": "A", "arms": "A",
     "head": [("detail_$_ear_round", 0.72, 0.05)],
     "face": [("eye_cute_light", -0.36, 0.36, 0.7), ("eye_cute_light", 0.36, 0.36, 0.7, True), ("eye_cute_light", 0, 0.22, 0.7),
              ("mouthF", 0, 0.68, 0.8)]},
    {"id": "hakase", "color": "blue", "body": "C", "legs": "B", "arms": "D",
     "head": [("detail_$_eye", 0.85, 0.02, 0.9, 10)],
     "face": [("nose_brown", 0, 0.45, 0.9), ("mouthH", 0, 0.68, 0.8), ("eye_yellow", -0.35, 0.28, 0.7), ("eye_yellow", 0.35, 0.28, 0.7, True)]},
    {"id": "gerogero", "color": "green", "body": "F", "legs": "C", "arms": "B", "arm_y": 0.55,
     "face": [("eye_red", 0, 0.24, 1.1), ("mouthJ", 0, 0.5), ("nose_green", 0, 0.38, 0.6)]},
    {"id": "kibakiba", "color": "green", "body": "E", "legs": "B", "arms": "C",
     "head": [("detail_$_horn_small", 0.6, 0.0)],
     "face": EYE2("eye_angry_green", 0.3, 0.3, 0.8) + [("mouth_closed_fangs", 0, 0.62)]},
    {"id": "dekamimi", "color": "blue", "body": "B", "legs": "C", "arms": "E",
     "head": [("detail_$_ear", 0.85, 0.05, 1.3)],
     "face": EYE2("eye_human_blue", 0.4, 0.3, 0.7) + [("nose_yellow", 0, 0.52, 0.7), ("mouthB", 0, 0.72, 0.7)]},
    {"id": "gyorome", "color": "dark", "body": "B", "legs": "A", "arms": "D",
     "head": [("detail_$_antenna_large", 0.3, -0.06)],
     "face": [("eye_human_red", 0, 0.34, 1.2), ("mouthI", 0, 0.7, 0.8)]},
    # ---- SR ----
    {"id": "kirikiri", "color": "white", "body": "F", "legs": "A", "arms": "D", "arm_color": "dark", "arm_y": 0.45,
     "head": [("detail_$_horn_small", 0.75, 0.02, 1.2), ("detail_$_antenna_large", 0.35, -0.08)],
     "face": EYE2("eye_angry_red", 0.25, 0.3, 0.9) + [("mouthI", 0, 0.48), ("eyebrowC", -0.3, 0.14, 0.8), ("eyebrowC", 0.3, 0.14, 0.8, True)]},
    {"id": "gogogo", "color": "dark", "body": "D", "legs": "E", "arms": "C", "arm_color": "yellow",
     "head": [("detail_$_ear", 0.8, 0.0, 1.2), ("detail_yellow_antenna_large", 0.35, -0.12)],
     "face": EYE2("eye_psycho_light", 0.34, 0.3, 0.75) + [("nose_yellow", 0, 0.5), ("mouthC", 0, 0.72, 0.9), ("eyebrowA", -0.3, 0.17, 0.8), ("eyebrowA", 0.3, 0.17, 0.8, True)]},
    {"id": "medamaru", "color": "yellow", "body": "B", "legs": "B", "arms": "E",
     "head": [("detail_$_eye", 0.6, -0.04, 1.0, 15)],
     "face": [("eye_human_green", -0.42, 0.32, 0.6), ("eye_human_green", 0.42, 0.32, 0.6, True), ("eye_human_green", 0, 0.24, 0.75),
              ("eye_human_green", -0.22, 0.48, 0.5), ("eye_human_green", 0.22, 0.48, 0.5, True), ("mouthB", 0, 0.72, 0.8)]},
    {"id": "debirun", "color": "dark", "body": "F", "legs": "A", "arms": "A", "arm_color": "red", "arm_y": 0.45,
     "head": [("detail_red_horn_large", 0.75, 0.0, 1.2)],
     "face": EYE2("eye_angry_red", 0.27, 0.3, 0.85) + [("mouth_closed_fangs", 0, 0.5), ("eyebrowC", -0.3, 0.16, 0.8), ("eyebrowC", 0.3, 0.16, 0.8, True)]},
    {"id": "yukidaruma", "color": "white", "body": "A", "legs": "C", "arms": "D", "arm_color": "dark",
     "head": [("detail_blue_ear_round", 0.7, 0.05, 0.9)],
     "face": EYE2("eye_cute_dark", 0.34, 0.32, 0.8) + [("nose_red", 0, 0.52, 0.8), ("mouth_closed_happy", 0, 0.72, 0.8)]},
    # ---- SSR ----
    {"id": "daimaou", "color": "red", "body": "F", "legs": "E", "arms": "C", "arm_color": "dark", "arm_y": 0.4,
     "head": [("detail_dark_horn_large", 0.8, 0.0, 1.5), ("detail_yellow_antenna_large", 0.3, -0.12, 1.1)],
     "face": EYE2("eye_angry_green", 0.27, 0.3, 0.9) + [("nose_brown", 0, 0.38, 0.8), ("mouthJ", 0, 0.52, 1.1), ("eyebrowC", -0.32, 0.17), ("eyebrowC", 0.32, 0.17, 1.0, True)]},
    {"id": "nijiiro", "color": "white", "body": "B", "legs": "A", "arms": "A", "arm_color": "blue",
     "head": [("detail_red_horn_large", 0.65, 0.02, 1.3), ("detail_yellow_antenna_large", 0.3, -0.1), ("detail_green_ear_round", 0.9, 0.12, 0.9)],
     "face": [("eye_cute_dark", -0.3, 0.32, 0.8), ("eye_cute_dark", 0.3, 0.32, 0.8, True), ("eye_human_blue", 0, 0.16, 0.6),
              ("mouthJ", 0, 0.66, 0.9), ("nose_red", 0, 0.48, 0.6)]},
    {"id": "jackpot", "color": "yellow", "body": "F", "legs": "E", "arms": "C", "arm_color": "red", "arm_y": 0.42,
     "head": [("detail_$_horn_large", 0.8, 0.0, 1.4), ("detail_red_antenna_large", 0.32, -0.12, 1.1)],
     "face": EYE2("eye_psycho_light", 0.27, 0.3, 0.9) + [("mouthJ", 0, 0.54, 1.1), ("eyebrowA", -0.3, 0.16), ("eyebrowA", 0.3, 0.16, 1.0, True)]},
]

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    ims = []
    for m in MONSTERS:
        im = build(m)
        im.save(OUT / f"{m['id']}.png", optimize=True)
        ims.append(im)
    if PREVIEW:
        cols = 5
        cell = 200
        rows = (len(ims) + cols - 1) // cols
        sheet = Image.new("RGBA", (cols * cell, rows * cell), (30, 30, 45, 255))
        for i, im in enumerate(ims):
            sheet.alpha_composite(im.resize((cell, cell), Image.LANCZOS), ((i % cols) * cell, (i // cols) * cell))
        sheet.save(PREVIEW)
    # ファビコン
    build(MONSTERS[0]).resize((64, 64), Image.LANCZOS).save(OUT.parent / "favicon.png", optimize=True)
