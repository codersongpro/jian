#!/usr/bin/env python3
"""수신함 사진 1장을 전시용 이미지로 변환한다.

- 입력: 이미지 파일, 또는 Google Drive download_file_content 결과 JSON(base64)
- 촬영 날짜·시간과 촬영 위치의 시·군(예: 경기도 성남시)을 먼저 읽고,
  정확한 GPS 좌표와 기기 정보 등 메타데이터는 이미지에서 모두 지운다
- 시·군 판정은 scripts/data/korea-sigun.json(통계청 경계)으로 오프라인에서 한다. 좌표는 출력하지 않는다
- 출력: 긴 변 1536px JPEG(본문), 선택 시 긴 변 640px WebP(썸네일)
- 결과를 JSON 한 줄로 출력한다:
  {"page", "thumb", "date", "time", "place", "place_en", "date_source", "width", "height"}

사용 예:
  python3 -I scripts/inbox_photo.py tool-result.json public/works/fall-tree/page-01.jpg \
      --thumb public/works/thumbnails/fall-tree.webp
ImageMagick(convert, identify)이 필요하다. HEIC도 읽는다.
"""
import argparse
import base64
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

MAX_BYTES = 40 * 1024 * 1024  # 비정상적으로 큰 입력 차단
ALLOWED = {"JPEG", "PNG", "HEIC", "WEBP", "GIF"}
SIGUN = Path(__file__).parent / "data" / "korea-sigun.json"


def load_input(src: Path, workdir: Path) -> Path:
    """Drive 결과 JSON이면 base64를 풀어 임시 파일로 저장한다."""
    raw = src.read_bytes()
    if len(raw) > MAX_BYTES * 2:
        sys.exit("입력 파일이 너무 큽니다")
    if raw[:1] == b"{":
        data = base64.b64decode(json.loads(raw)["content"])
        out = workdir / "input"
        out.write_bytes(data)
        return out
    return src


def identify(path: Path, fmt: str) -> str:
    result = subprocess.run(
        ["identify", "-quiet", "-format", fmt, f"{path}[0]"],
        capture_output=True, text=True,
    )
    return result.stdout.strip()


def gps_degrees(value: str, ref: str) -> float | None:
    """EXIF 좌표("37/1,30/1,1234/100")를 십진수 도로 바꾼다."""
    try:
        d, m, s = (int(a) / int(b) for a, b in (p.split("/") for p in value.split(",")))
    except (ValueError, ZeroDivisionError):
        return None
    deg = d + m / 60 + s / 3600
    return -deg if ref in ("S", "W") else deg


def inside(x: float, y: float, ring: list) -> bool:
    """점이 다각형 고리 안에 있는지 (ray casting)."""
    hit = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def sigun_of(lat: float, lon: float) -> tuple[str, str] | tuple[None, None]:
    """좌표가 속한 시·군 이름(한글, 영문). 국내가 아니면 (None, None)."""
    for place in json.loads(SIGUN.read_text(encoding="utf8"))["places"]:
        for outer, *holes in place["polygons"]:
            if inside(lon, lat, outer) and not any(inside(lon, lat, h) for h in holes):
                return place["ko"], place["en"]
    return None, None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("page", type=Path, help="본문 이미지 경로 (.jpg)")
    ap.add_argument("--thumb", type=Path, help="썸네일 경로 (.webp)")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        src = load_input(args.src, Path(tmp))
        if src.stat().st_size > MAX_BYTES:
            sys.exit("이미지가 40MB를 넘습니다")
        kind = identify(src, "%m")
        if kind not in ALLOWED:
            sys.exit(f"지원하지 않는 형식입니다: {kind or '알 수 없음'}")

        # 메타데이터를 지우기 전에 촬영 날짜·시간을 읽는다 (예: 2026:10:18 15:30:00)
        taken = identify(src, "%[EXIF:DateTimeOriginal]")
        match = re.match(r"(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})", taken)
        date = "-".join(match.groups()[:3]) if match else None
        time = ":".join(match.groups()[3:]) if match else None

        # 촬영 위치는 시·군 이름으로만 남긴다
        lat = gps_degrees(identify(src, "%[EXIF:GPSLatitude]"), identify(src, "%[EXIF:GPSLatitudeRef]"))
        lon = gps_degrees(identify(src, "%[EXIF:GPSLongitude]"), identify(src, "%[EXIF:GPSLongitudeRef]"))
        place, place_en = sigun_of(lat, lon) if lat is not None and lon is not None else (None, None)

        args.page.parent.mkdir(parents=True, exist_ok=True)
        # -auto-orient로 회전을 반영한 뒤 -strip으로 GPS·기기 정보를 모두 제거
        subprocess.run(
            ["convert", f"{src}[0]", "-auto-orient", "-resize", "1536x1536>",
             "-strip", "-quality", "85", str(args.page)],
            check=True,
        )
        if args.thumb:
            args.thumb.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(
                ["convert", f"{src}[0]", "-auto-orient", "-resize", "640x640>",
                 "-strip", "-quality", "80", str(args.thumb)],
                check=True,
            )

    width, height = identify(args.page, "%w %h").split()
    print(json.dumps({
        "page": str(args.page),
        "thumb": str(args.thumb) if args.thumb else None,
        "date": date,
        "time": time,
        "place": place,
        "place_en": place_en,
        "date_source": "exif" if date else None,
        "width": int(width),
        "height": int(height),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
