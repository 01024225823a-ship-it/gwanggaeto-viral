# -*- coding: utf-8 -*-
"""작업 가능 카페 리스트(CSV) -> src/lib/mock/cafes.ts 변환기.

프로젝트 루트에서 실행한다:  python scripts/gen-cafes.py

CSV 컬럼: ID, 1차 카테고리, 2차 카테고리, 활동지역, 상세지역, 카페명, URL,
          회원수, 핫딜게시판, 등업불가, 일반발행가능

카페 목록이 갱신되면 gwanggaeto_cafes.csv만 교체하고 이 스크립트를 다시 실행하면 된다.
ID는 주문에 저장되는 값이므로 CSV에서 기존 카페의 ID를 바꾸지 말 것.
"""
import csv
import io
import sys

CSV_PATH = "gwanggaeto_cafes.csv"
OUT_PATH = "src/lib/mock/cafes.ts"

# 1차 카테고리 → 안정적인 slug ID (주문에 저장되는 값이라 이름이 바뀌어도 유지되도록)
GROUP_IDS = {
    "맘/학습맘": "mom",
    "맛집/문화/캠핑/친목": "life",
    "생활/인테리어/중고/IT기기": "home",
    "결혼/뷰티/요리/패션": "beauty",
    "건강/운동/스포츠": "health",
    "교육/자격증/유학/이민": "edu",
    "직장인/업종/창업/취업": "job",
    "부동산/코인/재테크": "finance",
    "자동차/자전거": "car",
    "해외/국내여행": "travel",
    "군인/복지/행정/반려동물": "welfare",
}

# 활동지역 표기 정리 — 같은 지역의 다른 표기를 하나로 모은다
REGION_ALIASES = {
    "": "전국",
    "경기도": "경기",
    "강원도": "강원",
    "제주도": "제주",
    "충청도": "충청",
    # 상세지역이 활동지역 칸에 들어간 항목은 해당 광역시·도로 옮긴다
    "거제도": "경남",
    "군산": "전북",
    "경상도": "울산",
}

# 필터·목록에서 보여줄 지역 순서 (수도권 → 광역시 → 도 → 전국)
REGION_ORDER = [
    "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
    "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "전국",
]


def norm_region(value: str) -> str:
    v = value.strip()
    return REGION_ALIASES.get(v, v)


def region_rank(region: str) -> int:
    return REGION_ORDER.index(region) if region in REGION_ORDER else len(REGION_ORDER)


def ts(value: str) -> str:
    """TS 문자열 리터럴로 이스케이프"""
    return '"%s"' % value.replace("\\", "\\\\").replace('"', '\\"')


def num(n: int) -> str:
    return f"{n:,}".replace(",", "_")


rows = list(csv.DictReader(io.open(CSV_PATH, encoding="utf-8-sig")))
if not rows:
    sys.exit("CSV가 비어 있습니다")

groups = []          # (id, name) — CSV 등장 순서
seen_groups = set()
records = []
skipped = []
unknown_groups = set()

for r in rows:
    cafe_id = r["ID"].strip()
    name = r["카페명"].strip()
    group_name = r["1차 카테고리"].strip()
    if not cafe_id or not name or not group_name:
        skipped.append(r)
        continue

    gid = GROUP_IDS.get(group_name)
    if gid is None:
        # 매핑에 없는 1차 카테고리는 순번 ID로 수용한다 (데이터가 늘어도 깨지지 않도록)
        unknown_groups.add(group_name)
        gid = "g%02d" % (len(GROUP_IDS) + len(unknown_groups))
        GROUP_IDS[group_name] = gid

    if gid not in seen_groups:
        seen_groups.add(gid)
        groups.append((gid, group_name))

    members_raw = r["회원수"].strip().replace(",", "")
    records.append({
        "id": cafe_id,
        "name": name,
        "groupId": gid,
        "sub": r["2차 카테고리"].strip() or group_name,
        "region": norm_region(r["활동지역"]),
        "district": r["상세지역"].strip(),
        "url": r["URL"].strip(),
        "members": int(members_raw) if members_raw.isdigit() else 0,
        "hotdeal": r["핫딜게시판"].strip().upper() == "O",
        "nograde": r["등업불가"].strip().upper() == "O",
        "publishable": r["일반발행가능"].strip().upper() == "O",
    })

ids = [x["id"] for x in records]
assert len(set(ids)) == len(ids), "CSV에 중복 ID가 있습니다"

# groups는 이미 CSV 등장 순서. 카페는 지역 → 상세지역 → 이름 순으로 정렬한다
records.sort(key=lambda c: (region_rank(c["region"]), c["region"],
                            c["district"] == "", c["district"], c["name"]))

HEAD = '''/**
 * 작업 가능 카페(커뮤니티) 카탈로그.
 *
 * 카페 상품 주문 화면에서 고객이 배포할 카페를 직접 고르기 위한 기준 데이터다.
 * 주문에는 카페 ID만 저장하고 화면에서는 이 목록으로 이름을 조회한다
 * (주문 시점 이름은 Order.selectedCafeNames 스냅샷으로 함께 보관한다).
 *
 * -- 생성 방식 --------------------------------------------------------
 * 프로젝트 루트의 gwanggaeto_cafes.csv(작업 가능 카페 리스트)를 그대로 옮긴 파일이다.
 * CSV 컬럼: ID · 1차 카테고리 · 2차 카테고리 · 활동지역 · 상세지역 · 카페명 · URL ·
 *           회원수 · 핫딜게시판 · 등업불가 · 일반발행가능
 * 활동지역이 비어 있으면 "전국"으로, "경기도/강원도/제주도"는 "경기/강원/제주"로 통일했다.
 * 일반발행가능이 O가 아닌 카페는 PUBLISHABLE_CAFES에서 제외되어 고객에게 노출되지 않는다.
 * 카페 목록이 갱신되면 CSV를 교체해 이 파일을 다시 생성하면 되고, 화면·주문 로직은 바뀌지 않는다.
 * 향후 DB로 이전할 때는 이 파일을 cafes 테이블 조회로 대체하면 된다.
 */

import type { Cafe, CafeGroup } from "@/lib/domain/types";

/** 1차 카테고리 — 고객이 먼저 고르는 "작업 카테고리" */
export const CAFE_GROUPS: CafeGroup[] = ['''

TAIL = '''
/** 전체 카페 (일반발행 불가 포함) */
export const CAFES: Cafe[] = CAFE_ROWS.map(
  ([
    id,
    name,
    groupId,
    subCategory,
    region,
    district,
    url,
    members,
    hotdealBoard,
    noGradeUp,
    publishable,
  ]) => ({
    id,
    name,
    groupId,
    subCategory,
    region,
    district,
    url,
    members,
    hotdealBoard,
    noGradeUp,
    publishable,
  }),
);

/** 고객에게 노출하는 카페 — 일반 발행 가능(O)인 카페만 */
export const PUBLISHABLE_CAFES: Cafe[] = CAFES.filter((c) => c.publishable);

const CAFE_BY_ID = new Map(CAFES.map((c) => [c.id, c]));
const GROUP_BY_ID = new Map(CAFE_GROUPS.map((g) => [g.id, g]));

export function findCafe(id: string): Cafe | undefined {
  return CAFE_BY_ID.get(id);
}

/** 1차 카테고리명 — 알 수 없는 ID는 그대로 돌려준다 */
export function cafeGroupName(groupId?: string): string {
  if (!groupId) return "";
  return GROUP_BY_ID.get(groupId)?.name ?? groupId;
}

/** 해당 1차 카테고리에서 고객이 선택할 수 있는 카페 */
export function publishableCafesOf(groupId?: string): Cafe[] {
  if (!groupId) return [];
  return PUBLISHABLE_CAFES.filter((c) => c.groupId === groupId);
}

/** 1차 카테고리별 선택 가능 카페 수 */
export function publishableCountOf(groupId: string): number {
  return PUBLISHABLE_CAFES.reduce((acc, c) => (c.groupId === groupId ? acc + 1 : acc), 0);
}

/** 등장 순서를 유지한 고유값 목록 (필터 옵션용) */
function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

/** 해당 카테고리의 2차 카테고리 옵션 */
export function subCategoryOptions(groupId?: string): string[] {
  return uniq(publishableCafesOf(groupId).map((c) => c.subCategory));
}

/** 해당 카테고리의 활동지역 옵션 */
export function regionOptions(groupId?: string): string[] {
  return uniq(publishableCafesOf(groupId).map((c) => c.region));
}

/**
 * 주문에 저장된 카페 ID를 표시용 이름으로 바꾼다.
 * 카탈로그에서 사라진 카페는 주문 시점 스냅샷 이름으로 대체한다.
 */
export function resolveCafeNames(
  cafeIds: string[] | undefined,
  snapshot: string[] | undefined,
): string[] {
  if (!cafeIds?.length) return snapshot ?? [];
  return cafeIds.map((id, i) => findCafe(id)?.name ?? snapshot?.[i] ?? id);
}
'''

out = [HEAD]
for i, (gid, gname) in enumerate(groups):
    out.append('  { id: "%s", name: %s, sortOrder: %d },' % (gid, ts(gname), i + 1))
out.append("];\n")
out.append("type CafeRow = [")
for field in ("id: string", "name: string", "groupId: string", "subCategory: string",
              "region: string", "district: string", "url: string", "members: number",
              "hotdealBoard: boolean", "noGradeUp: boolean", "publishable: boolean"):
    out.append("  %s," % field)
out.append("];\n")
out.append("/** CSV 원본 순서를 지역(수도권→지방→전국) → 상세지역 → 카페명으로 정렬해 담았다 */")
out.append("const CAFE_ROWS: CafeRow[] = [")
cur = None
for c in records:
    if c["region"] != cur:
        if cur is not None:
            out.append("")
        cur = c["region"]
        out.append("  /* %s */" % cur)
    out.append("  [%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s]," % (
        ts(c["id"]), ts(c["name"]), ts(c["groupId"]), ts(c["sub"]), ts(c["region"]),
        ts(c["district"]), ts(c["url"]), num(c["members"]),
        "true" if c["hotdeal"] else "false",
        "true" if c["nograde"] else "false",
        "true" if c["publishable"] else "false",
    ))
out.append("];\n")
out.append(TAIL)

io.open(OUT_PATH, "w", encoding="utf-8", newline="\n").write("\n".join(out))

pub = [c for c in records if c["publishable"]]
print("CSV 행:", len(rows), "| 변환:", len(records), "| 건너뜀:", len(skipped))
print("고객 노출(일반발행 O):", len(pub), "| 제외:", len(records) - len(pub))
print("1차 카테고리:", len(groups))
if unknown_groups:
    print("매핑에 없던 1차 카테고리(자동 ID 부여):", unknown_groups)
from collections import Counter
for gid, gname in groups:
    n = sum(1 for c in pub if c["groupId"] == gid)
    subs = len({c["sub"] for c in pub if c["groupId"] == gid})
    regs = len({c["region"] for c in pub if c["groupId"] == gid})
    print("  %-8s %-24s 카페 %3d · 2차 %2d종 · 지역 %2d종" % (gid, gname, n, subs, regs))
print("지역 분포:", Counter(c["region"] for c in pub).most_common())
