#!/usr/bin/env python3
"""작업 사진 최적화 — 원본(jpg/png)을 웹용 webp(~50KB)로 변환.

사용법:
  python3 scripts/optimize_gallery.py <원본폴더> [--target-kb 50] [--max-width 1280]

동작:
  - 원본 폴더의 이미지들을 파일명 정렬 순서로 work-01.webp … work-NN.webp 로 저장
  - 목표 용량(기본 50KB)에 맞춰 품질을 이분 탐색, 필요 시 가로폭을 단계적으로 축소
  - 저장 위치: src/assets/gallery/  (빌드가 dist 로 복사)
"""
import sys, os, io, glob, argparse
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, "src", "assets", "gallery")

def encode(img, quality):
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality, method=6)
    return buf.getvalue()

def optimize(img, target_bytes, max_width):
    # EXIF 회전 반영 + RGB 정규화
    img = ImageOps.exif_transpose(img).convert("RGB")
    widths = [max_width, 1100, 960, 820, 680]
    best = None
    for w in widths:
        im = img
        if img.width > w:
            im = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
        # 품질 이분 탐색
        lo, hi, chosen = 40, 92, None
        for _ in range(8):
            q = (lo + hi) // 2
            data = encode(im, q)
            if len(data) <= target_bytes:
                chosen = data; lo = q + 1
            else:
                hi = q - 1
        cand = chosen if chosen is not None else encode(im, 40)
        if best is None or len(cand) < len(best):
            best = cand
        if chosen is not None:   # 이 폭에서 목표 충족 → 가장 큰(품질 좋은) 폭 채택
            return chosen
    return best

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("srcdir")
    ap.add_argument("--target-kb", type=int, default=50)
    ap.add_argument("--max-width", type=int, default=1280)
    args = ap.parse_args()

    files = sorted(
        f for f in glob.glob(os.path.join(args.srcdir, "*"))
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    )
    if not files:
        print("원본 이미지가 없습니다:", args.srcdir); sys.exit(1)

    os.makedirs(DEST, exist_ok=True)
    target = args.target_kb * 1024
    for i, src in enumerate(files, 1):
        with Image.open(src) as img:
            data = optimize(img, target, args.max_width)
        out = os.path.join(DEST, f"work-{i:02d}.webp")
        with open(out, "wb") as fh:
            fh.write(data)
        print(f"work-{i:02d}.webp  <-  {os.path.basename(src)}  ({len(data)/1024:.1f} KB)")
    print(f"완료: {len(files)}장 → {DEST}")

if __name__ == "__main__":
    main()
