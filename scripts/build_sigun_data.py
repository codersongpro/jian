#!/usr/bin/env python3
"""시·군 판정용 경계 파일(scripts/data/korea-sigun.json)을 만든다. 한 번만 실행하면 된다.

원본: 통계청 센서스용 행정구역경계(2013), southkorea/southkorea-maps 저장소의
kostat/2013/json/skorea_municipalities_geo_simple.json

- 구는 시로 합친다(성남시분당구 → 경기도 성남시). 특별·광역시와 세종시는 시 이름만 쓴다.
- 2013년 이후 바뀐 곳을 반영한다: 청원군 → 청주시(2014), 군위군 → 대구광역시(2023),
  강원도·전라북도 → 특별자치도 명칭.
- 좌표는 소수 넷째 자리(약 10m)로 줄인다.

사용 예:
  curl -sSO https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json
  python3 -I scripts/build_sigun_data.py skorea_municipalities_geo_simple.json scripts/data/korea-sigun.json
"""
import json
import re
import sys

# 행정구역 코드 앞 두 자리 → (시도 한글, 영문, 특별·광역시 여부)
SIDO = {
    "11": ("서울특별시", "Seoul", True),
    "21": ("부산광역시", "Busan", True),
    "22": ("대구광역시", "Daegu", True),
    "23": ("인천광역시", "Incheon", True),
    "24": ("광주광역시", "Gwangju", True),
    "25": ("대전광역시", "Daejeon", True),
    "26": ("울산광역시", "Ulsan", True),
    "29": ("세종특별자치시", "Sejong", True),
    "31": ("경기도", "Gyeonggi-do", False),
    "32": ("강원특별자치도", "Gangwon-do", False),
    "33": ("충청북도", "Chungcheongbuk-do", False),
    "34": ("충청남도", "Chungcheongnam-do", False),
    "35": ("전북특별자치도", "Jeonbuk-do", False),
    "36": ("전라남도", "Jeollanam-do", False),
    "37": ("경상북도", "Gyeongsangbuk-do", False),
    "38": ("경상남도", "Gyeongsangnam-do", False),
    "39": ("제주특별자치도", "Jeju-do", False),
}
# 2013년 이후 통합·편입
RENAME = {
    "33310": ("33", "청주시", "Cheongju-si"),  # 청원군
    "37310": ("22", None, None),  # 군위군 → 대구광역시
}
# 원본 영문 이름이 구 이름뿐이거나 잘못된 곳
EN = {
    "창원시": "Changwon-si",
    "포항시": "Pohang-si",
    "광주시": "Gwangju-si",
    "철원군": "Cheorwon-gun",  # 원본에 Gongju-si로 잘못 들어 있음
}


def place_of(props):
    code, name, name_en = props["code"], props["name"], props["name_eng"]
    sido_code, sigun, sigun_en = code[:2], None, None
    if code in RENAME:
        sido_code, sigun, sigun_en = RENAME[code]
    sido, sido_en, metro = SIDO[sido_code]
    if metro:
        return sido, sido_en
    if sigun is None:
        sigun = re.match(r"(.+?[시군])", name).group(1)
        # Imsil-gun처럼 이름 속 si에 걸리지 않도록 끝에서 먼저 찾고, 구가 붙은 이름은 앞에서 찾는다
        en = re.match(r"(.+?)-?(si|gun)$", name_en, re.I) or re.match(
            r"(.+?)-?(si|gun)", name_en, re.I
        )
        sigun_en = EN.get(sigun) or f"{en.group(1)}-{en.group(2).lower()}"
    return f"{sido} {sigun}", f"{sigun_en}, {sido_en}"


def main():
    src, out = sys.argv[1], sys.argv[2]
    places = {}
    for feature in json.load(open(src, encoding="utf8"))["features"]:
        ko, en = place_of(feature["properties"])
        geom = feature["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        entry = places.setdefault(ko, {"ko": ko, "en": en, "polygons": []})
        for poly in polys:
            entry["polygons"].append(
                [[[round(x, 4), round(y, 4)] for x, y in ring] for ring in poly]
            )
    with open(out, "w", encoding="utf8") as f:
        json.dump(
            {"source": "KOSTAT 2013 via southkorea/southkorea-maps", "places": list(places.values())},
            f, ensure_ascii=False, separators=(",", ":"),
        )
    print(f"{len(places)} places")


if __name__ == "__main__":
    main()
